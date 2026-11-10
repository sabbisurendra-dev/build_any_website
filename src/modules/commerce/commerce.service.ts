import {
  AppError,
  EntitlementExpiredError,
  HoldExpiredError,
  InsufficientStockError,
  ItemUnavailableError,
} from '@/lib/errors';
import { BookingServiceImpl } from '@/modules/booking/booking.impl';
import { RuntimeStateRepository } from '@/modules/persistence/runtime-store';
import type {
  BookingModel,
  CatalogueItemStatus,
  CatalogueItemType,
  FulfilmentStatus,
  FulfilmentType,
  UUID,
} from '@/types/domain';
import type {
  MasterDataTableRow,
  RuntimeCatalogueItem,
  RuntimeCustomerSubscription,
  RuntimeEntitlementRecord,
  RuntimeFulfilmentRecord,
  RuntimeOrderLineRecord,
  RuntimeOrderRecord,
} from './commerce.types';

export interface CreateOrderLineInput {
  catalogueItemId: UUID;
  quantity?: number;
  slotSelection?: {
    bookingModel?: BookingModel;
    resourceId?: UUID;
    serviceId?: UUID;
    staffMemberId?: UUID;
    sessionId?: UUID;
    startsAt?: Date | string;
    endsAt?: Date | string;
  };
}

export interface CreateUniversalOrderInput {
  tenantId: UUID;
  idempotencyKey: string;
  customer: {
    fullName: string;
    phone: string;
    email?: string;
    shippingAddress?: string;
  };
  fulfilmentPreference?: 'local_delivery' | 'courier_shipment' | 'store_pickup';
  paymentMethod?: 'upi' | 'card' | 'cash';
  autoConfirmPayment?: boolean;
  lines: CreateOrderLineInput[];
}

import type { CommerceRepositoryPort } from './commerce.repository.port';
import { InMemoryCommerceRepository } from './in-memory-commerce.repository';

export class UniversalCommerceService {
  private static defaultRepository: CommerceRepositoryPort = new InMemoryCommerceRepository();

  public static setDefaultRepository(repo: CommerceRepositoryPort): void {
    UniversalCommerceService.defaultRepository = repo;
  }

  public static getDefaultRepository(): CommerceRepositoryPort {
    return UniversalCommerceService.defaultRepository;
  }

  private readonly bookingService: BookingServiceImpl;
  private readonly repository: CommerceRepositoryPort;

  constructor(repository?: CommerceRepositoryPort, bookingService?: BookingServiceImpl) {
    this.repository = repository ?? UniversalCommerceService.defaultRepository;
    this.bookingService = bookingService ?? new BookingServiceImpl();
  }

  public getRepository(): CommerceRepositoryPort {
    return this.repository;
  }

  public static resetStateForTests(): void {
    RuntimeStateRepository.resetForTests(true);
    UniversalCommerceService.defaultRepository.resetForTests?.();
  }

  public static sweepExpiredLocksAndEntitlements(nowMs: number = Date.now()): void {
    BookingServiceImpl.sweepExpiredAllocationsNow();
    const state = RuntimeStateRepository.getState();
    let mutated = false;

    // 1. Expire abandoned physical inventory reservations (8-min TTL)
    for (const res of state.inventoryReservations) {
      if (res.status === 'active' && res.expiresAtMs <= nowMs) {
        res.status = 'expired';
        const inv = state.inventoryItems.find((i) => i.id === res.inventoryItemId);
        if (inv) {
          inv.quantityReserved = Math.max(0, inv.quantityReserved - res.quantity);
          inv.updatedAtIso = new Date(nowMs).toISOString();
        }
        mutated = true;
      }
    }

    // 2. Expire customer subscriptions that reached their paid-through period end after cancellation
    for (const sub of state.customerSubscriptions) {
      const periodEndMs = new Date(sub.currentPeriodEndIso).getTime();
      if (
        (sub.status === 'cancel_at_period_end' || sub.status === 'active') &&
        sub.cancelAtPeriodEnd &&
        periodEndMs <= nowMs
      ) {
        sub.status = 'expired';
        sub.updatedAtIso = new Date(nowMs).toISOString();
        const linkedEnt = state.entitlements.find((e) => e.id === sub.linkedEntitlementId);
        if (linkedEnt && linkedEnt.status !== 'expired' && linkedEnt.status !== 'revoked') {
          linkedEnt.status = 'expired';
          linkedEnt.updatedAtIso = new Date(nowMs).toISOString();
        }
        mutated = true;
      }
    }

    // 3. Expire time-bounded entitlements (e.g. 90-day courses or time slots) whose permission_timeslot_end has elapsed
    for (const ent of state.entitlements) {
      if (
        (ent.status === 'active' || ent.status === 'ready_to_upgrade') &&
        ent.permissionTimeslotEndIso
      ) {
        const endMs = new Date(ent.permissionTimeslotEndIso).getTime();
        if (endMs <= nowMs) {
          ent.status = 'expired';
          ent.updatedAtIso = new Date(nowMs).toISOString();
          mutated = true;
        }
      }
    }

    if (mutated) {
      RuntimeStateRepository.persist();
    }
  }

  /**
   * Returns all catalogue items for a tenant enriched with live stock and capacity metrics.
   */
  public listCatalogue(
    tenantIdOrSlug: string,
    options?: {
      includeDormant?: boolean;
      itemType?: CatalogueItemType | 'all';
      flag1?: string;
    },
  ): Array<
    RuntimeCatalogueItem & {
      stockOnHand: number | null;
      stockReserved: number | null;
      stockAvailable: number | null;
      derivedStatus: 'dormant' | 'unavailable' | 'available' | 'sold' | 'ready_to_upgrade';
    }
  > {
    UniversalCommerceService.sweepExpiredLocksAndEntitlements();
    const state = RuntimeStateRepository.getState();
    const tenant = this.resolveTenant(tenantIdOrSlug);

    return state.catalogueItems
      .filter((item) => {
        if (item.tenantId !== tenant.id) return false;
        if (!options?.includeDormant && item.status !== 'active' && item.status !== 'ready_to_upgrade') {
          return false;
        }
        if (options?.itemType && options.itemType !== 'all' && item.itemType !== options.itemType) {
          return false;
        }
        if (options?.flag1 && item.flag1 !== options.flag1) {
          return false;
        }
        return true;
      })
      .map((item) => {
        const inv = state.inventoryItems.find((i) => i.catalogueItemId === item.id);
        let stockOnHand: number | null = null;
        let stockReserved: number | null = null;
        let stockAvailable: number | null = null;

        if (inv) {
          stockOnHand = inv.quantityOnHand;
          stockReserved = inv.quantityReserved;
          stockAvailable = Math.max(0, inv.quantityOnHand - inv.quantityReserved);
        } else if (item.itemType === 'capacity_session' && item.sessionId) {
          const sess = state.sessions.find((s) => s.id === item.sessionId);
          if (sess) {
            stockOnHand = sess.maxCapacity;
            stockReserved = sess.bookedCount + sess.heldCount;
            stockAvailable = Math.max(0, sess.maxCapacity - sess.bookedCount - sess.heldCount);
          }
        }

        let derivedStatus: 'dormant' | 'unavailable' | 'available' | 'sold' | 'ready_to_upgrade' =
          item.status === 'active'
            ? 'available'
            : item.status === 'dormant'
            ? 'dormant'
            : item.status === 'ready_to_upgrade'
            ? 'ready_to_upgrade'
            : 'unavailable';

        if (
          derivedStatus === 'available' &&
          (item.itemType === 'physical_product' || item.itemType === 'capacity_session') &&
          stockAvailable !== null &&
          stockAvailable <= 0
        ) {
          derivedStatus = 'sold';
        }

        return {
          ...item,
          stockOnHand,
          stockReserved,
          stockAvailable,
          derivedStatus,
        };
      });
  }

  /**
   * Projects the normalized tables into the exact flat Master Data Table (`v_universal_commerce_master`):
   * Entity (company), sub_entity, domain, category, flag_1, flag_2, item_name,
   * permission_timeslot_start, permission_timeslot_end, status.
   */
  public getMasterDataProjection(tenantIdOrSlug: string): MasterDataTableRow[] {
    UniversalCommerceService.sweepExpiredLocksAndEntitlements();
    const state = RuntimeStateRepository.getState();
    const tenant = this.resolveTenant(tenantIdOrSlug);

    const catalogueRows = this.listCatalogue(tenant.id, { includeDormant: true });
    const rows: MasterDataTableRow[] = [];

    for (const item of catalogueRows) {
      // 1. Catalogue offering row
      rows.push({
        rowId: `cat-${item.id}`,
        tenantId: tenant.id,
        catalogueItemId: item.id,
        entity: tenant.name,
        sub_entity: item.subEntityName,
        domain: item.domainName,
        category: item.categoryName,
        flag_1: item.flag1 ?? null,
        flag_2: item.flag2 ?? null,
        item_name: item.name,
        item_type: item.itemType,
        fulfilment_type: item.fulfilmentType,
        permission_timeslot_start:
          item.itemType === 'digital_content' && item.accessDurationDays
            ? 'On Purchase (T0)'
            : item.itemType === 'bookable_resource' ||
              item.itemType === 'service_appointment' ||
              item.itemType === 'capacity_session'
            ? 'Selected Slot Start'
            : null,
        permission_timeslot_end:
          item.itemType === 'digital_content' && item.accessDurationDays
            ? `+${item.accessDurationDays} Days`
            : item.itemType === 'subscription_plan'
            ? 'Recurring Cycle End'
            : item.itemType === 'bookable_resource' ||
              item.itemType === 'service_appointment' ||
              item.itemType === 'capacity_session'
            ? 'Selected Slot End'
            : null,
        status: item.derivedStatus,
        price_minor: item.priceMinor,
        currency: item.currency,
        unit_label: item.unitLabel,
        stock_on_hand: item.stockOnHand,
        stock_reserved: item.stockReserved,
        stock_available: item.stockAvailable,
      });

      // 2. Active/Granted customer permission rows linked to this item
      const itemEntitlements = state.entitlements.filter(
        (e) => e.tenantId === tenant.id && e.catalogueItemId === item.id,
      );
      for (const ent of itemEntitlements) {
        rows.push({
          rowId: `ent-${ent.id}`,
          tenantId: tenant.id,
          catalogueItemId: item.id,
          entity: tenant.name,
          sub_entity: item.subEntityName,
          domain: item.domainName,
          category: item.categoryName,
          flag_1: ent.flag1 ?? item.flag1 ?? null,
          flag_2: ent.flag2 ?? item.flag2 ?? null,
          item_name: `${item.name} [Customer Right: ${ent.customerName}]`,
          item_type: item.itemType,
          fulfilment_type: item.fulfilmentType,
          permission_timeslot_start: ent.permissionTimeslotStartIso,
          permission_timeslot_end: ent.permissionTimeslotEndIso,
          status:
            ent.status === 'pending' || ent.status === 'suspended'
              ? 'unavailable'
              : ent.status === 'exhausted'
              ? 'sold'
              : ent.status,
          price_minor: item.priceMinor,
          currency: item.currency,
          unit_label: item.unitLabel,
          stock_on_hand: item.stockOnHand,
          stock_reserved: item.stockReserved,
          stock_available: item.stockAvailable,
          customer_holder: ent.customerName,
        });
      }
    }

    return rows;
  }

  /**
   * Creates a single-item or mixed-cart Order, acquiring atomic 8-minute holds across:
   * - Physical inventory (`inventoryReservations` with `quantityOnHand >= quantityReserved`)
   * - Exclusive resources / staff / capacity sessions (`BookingServiceImpl.createHold`)
   * - Digital content & subscriptions
   * And optionally confirms payment & fans out fulfilments + entitlements in one step.
   */
  public async createOrderAndHold(input: CreateUniversalOrderInput): Promise<{
    order: RuntimeOrderRecord;
    fulfilments: RuntimeFulfilmentRecord[];
    entitlements: RuntimeEntitlementRecord[];
    subscriptions: RuntimeCustomerSubscription[];
  }> {
    UniversalCommerceService.sweepExpiredLocksAndEntitlements();
    const state = RuntimeStateRepository.getState();
    const tenant = this.resolveTenant(input.tenantId);

    // 1. Idempotency check
    const existingOrder = state.orders.find(
      (o) => o.tenantId === tenant.id && o.idempotencyKey === input.idempotencyKey,
    );
    if (existingOrder) {
      return {
        order: existingOrder,
        fulfilments: state.fulfilments.filter((f) => f.orderId === existingOrder.id),
        entitlements: state.entitlements.filter((e) => e.orderId === existingOrder.id),
        subscriptions: state.customerSubscriptions.filter((s) =>
          existingOrder.lines.some((l) => l.subscriptionId === s.id),
        ),
      };
    }

    if (!input.lines || input.lines.length === 0) {
      throw new AppError('VALIDATION_ERROR', 'Order must contain at least one line item.', 400);
    }

    const nowMs = Date.now();
    const expiresAtMs = nowMs + 8 * 60 * 1000;
    const orderId = `ord-${nowMs.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const orderNumber = `ORD-${new Date(nowMs).getFullYear()}-${String(
      state.orders.length + 101,
    ).padStart(5, '0')}`;

    const acquiredInventoryResIds: string[] = [];
    const acquiredBookingIds: string[] = [];
    const orderLines: RuntimeOrderLineRecord[] = [];
    let subtotalMinor = 0;

    try {
      for (let idx = 0; idx < input.lines.length; idx += 1) {
        const lineReq = input.lines[idx]!;
        const qty = Math.max(1, Math.round(lineReq.quantity ?? 1));
        const item = state.catalogueItems.find(
          (ci) => ci.id === lineReq.catalogueItemId && ci.tenantId === tenant.id,
        );

        if (!item) {
          throw new AppError(
            'NOT_FOUND',
            `Catalogue item '${lineReq.catalogueItemId}' not found for this tenant.`,
            404,
          );
        }

        if (item.status !== 'active' && item.status !== 'ready_to_upgrade') {
          throw new ItemUnavailableError(
            `Item '${item.name}' has status '${item.status}' and cannot be purchased.`,
          );
        }

        const lineId = `ol-${nowMs.toString(36)}-${idx + 1}-${Math.random().toString(36).slice(2, 5)}`;
        let unitPriceMinor = item.priceMinor;
        let lineTotalMinor = unitPriceMinor * qty;
        let inventoryReservationId: string | undefined;
        let bookingId: string | undefined;
        let bookingHoldToken: string | undefined;

        // A. Physical Product Stock Reservation (e.g., 2L Milk, ProBook Laptop)
        if (item.itemType === 'physical_product') {
          const inv = state.inventoryItems.find(
            (i) => i.catalogueItemId === item.id && i.tenantId === tenant.id,
          );
          if (!inv) {
            throw new InsufficientStockError(`No inventory record found for '${item.name}'.`);
          }
          const available = inv.quantityOnHand - inv.quantityReserved;
          if (!inv.allowBackorder && available < qty) {
            throw new InsufficientStockError(
              `Insufficient stock for '${item.name}': requested ${qty} ${inv.unitLabel}(s), only ${Math.max(
                0,
                available,
              )} available.`,
            );
          }

          inv.quantityReserved += qty;
          inv.updatedAtIso = new Date(nowMs).toISOString();
          inventoryReservationId = `invres-${nowMs.toString(36)}-${idx + 1}-${Math.random()
            .toString(36)
            .slice(2, 5)}`;
          state.inventoryReservations.push({
            id: inventoryReservationId,
            tenantId: tenant.id,
            inventoryItemId: inv.id,
            catalogueItemId: item.id,
            orderId,
            quantity: qty,
            status: 'active',
            expiresAtMs,
            idempotencyKey: `${input.idempotencyKey}-line-${idx + 1}`,
            createdAtIso: new Date(nowMs).toISOString(),
          });
          acquiredInventoryResIds.push(inventoryReservationId);
        }

        // B. Bookable Resource, Staff Appointment, or Capacity Session (Turf 1, Doctor, 20-Seat Yoga)
        if (
          item.itemType === 'bookable_resource' ||
          item.itemType === 'service_appointment' ||
          item.itemType === 'capacity_session'
        ) {
          const bookingModel: BookingModel =
            lineReq.slotSelection?.bookingModel ??
            (item.itemType === 'bookable_resource'
              ? 'exclusive_resource'
              : item.itemType === 'service_appointment'
              ? 'staff_appointment'
              : 'capacity_session');

          const startsAt = lineReq.slotSelection?.startsAt
            ? new Date(lineReq.slotSelection.startsAt)
            : new Date(nowMs + 24 * 3600_000);
          const endsAt = lineReq.slotSelection?.endsAt
            ? new Date(lineReq.slotSelection.endsAt)
            : new Date(startsAt.getTime() + 3600_000);

          const holdSelection =
            bookingModel === 'exclusive_resource'
              ? {
                  bookingModel: 'exclusive_resource' as const,
                  resourceId: lineReq.slotSelection?.resourceId ?? item.resourceId ?? 'res-turf-01',
                  startsAt,
                  endsAt,
                }
              : bookingModel === 'staff_appointment'
              ? {
                  bookingModel: 'staff_appointment' as const,
                  serviceId:
                    lineReq.slotSelection?.serviceId ?? item.serviceId ?? 'srv-dental-consult',
                  staffMemberId: lineReq.slotSelection?.staffMemberId ?? 'st-doctor-01',
                  startsAt,
                  endsAt,
                }
              : {
                  bookingModel: 'capacity_session' as const,
                  sessionId:
                    lineReq.slotSelection?.sessionId ?? item.sessionId ?? 'sess-morning-yoga-01',
                  startsAt,
                  endsAt,
                  quantity: qty,
                };

          const holdResult = await this.bookingService.createHold({
            tenantId: tenant.id,
            locationId: `loc-${tenant.slug}`,
            idempotencyKey: `${input.idempotencyKey}-bkg-${idx + 1}`,
            selection: holdSelection,
            customer: {
              fullName: input.customer.fullName,
              phone: input.customer.phone,
              email: input.customer.email,
            },
          });

          bookingId = holdResult.bookingId;
          bookingHoldToken = holdResult.holdToken;
          lineTotalMinor = holdResult.totalMinor;
          unitPriceMinor = Math.round(lineTotalMinor / qty);
          acquiredBookingIds.push(bookingId);
        }

        subtotalMinor += lineTotalMinor;
        orderLines.push({
          id: lineId,
          orderId,
          tenantId: tenant.id,
          catalogueItemId: item.id,
          itemName: item.name,
          itemType: item.itemType,
          fulfilmentType: item.fulfilmentType,
          quantity: qty,
          unitLabel: item.unitLabel,
          unitPriceMinor,
          lineTotalMinor,
          lineStatus: 'reserved',
          inventoryReservationId,
          bookingId,
          bookingHoldToken,
          slotSelection: lineReq.slotSelection
            ? {
                bookingModel: lineReq.slotSelection.bookingModel,
                resourceId: lineReq.slotSelection.resourceId ?? item.resourceId,
                serviceId: lineReq.slotSelection.serviceId ?? item.serviceId,
                staffMemberId: lineReq.slotSelection.staffMemberId,
                sessionId: lineReq.slotSelection.sessionId ?? item.sessionId,
                startsAtIso: lineReq.slotSelection.startsAt
                  ? new Date(lineReq.slotSelection.startsAt).toISOString()
                  : undefined,
                endsAtIso: lineReq.slotSelection.endsAt
                  ? new Date(lineReq.slotSelection.endsAt).toISOString()
                  : undefined,
              }
            : undefined,
        });
      }
    } catch (err) {
      // Atomic Rollback of any reservations acquired before the failing line in a mixed cart!
      for (const invResId of acquiredInventoryResIds) {
        const res = state.inventoryReservations.find((r) => r.id === invResId);
        if (res && res.status === 'active') {
          res.status = 'released';
          const inv = state.inventoryItems.find((i) => i.id === res.inventoryItemId);
          if (inv) {
            inv.quantityReserved = Math.max(0, inv.quantityReserved - res.quantity);
          }
        }
      }
      for (const bkgId of acquiredBookingIds) {
        await this.bookingService
          .cancelBooking({
            actor: 'customer_verified_token',
            tenantId: tenant.id,
            bookingId: bkgId,
            reason: 'Mixed cart atomic rollback',
            idempotencyKey: `rb-${bkgId}`,
          })
          .catch(() => undefined);
      }
      RuntimeStateRepository.persist();
      throw err;
    }

    const order: RuntimeOrderRecord = {
      id: orderId,
      orderNumber,
      tenantId: tenant.id,
      customerName: input.customer.fullName,
      customerPhone: input.customer.phone,
      customerEmail: input.customer.email,
      shippingAddress: input.customer.shippingAddress ?? `${tenant.location.address}, ${tenant.location.city}`,
      fulfilmentPreference: input.fulfilmentPreference ?? 'local_delivery',
      status: 'awaiting_payment',
      paymentStatus: 'pending',
      paymentMethod: input.paymentMethod ?? 'upi',
      subtotalMinor,
      taxMinor: 0,
      totalMinor: subtotalMinor,
      currency: 'INR',
      idempotencyKey: input.idempotencyKey,
      expiresAtIso: new Date(expiresAtMs).toISOString(),
      lines: orderLines,
      createdAtIso: new Date(nowMs).toISOString(),
      updatedAtIso: new Date(nowMs).toISOString(),
    };

    state.orders.unshift(order);
    RuntimeStateRepository.persist();

    if (input.autoConfirmPayment) {
      return this.confirmOrderPayment({
        tenantId: tenant.id,
        orderId: order.id,
        paymentMethod: input.paymentMethod ?? 'upi',
      });
    }

    return {
      order,
      fulfilments: [],
      entitlements: [],
      subscriptions: [],
    };
  }

  /**
   * Confirms payment for an Order and fans out atomically across all line types:
   * - Physical products -> Deducts `quantityOnHand`, writes `inventoryMovements`, creates `fulfilments`
   * - Bookings -> Confirms `bookings` & grants time-slot `entitlements`
   * - Digital content -> Grants 90-day `entitlements` (`permission_timeslot_start..end`)
   * - Subscriptions -> Activates `customerSubscriptions` & recurring `entitlements`
   */
  public async confirmOrderPayment(input: {
    tenantId: UUID;
    orderId: UUID;
    paymentMethod?: 'upi' | 'card' | 'cash';
    confirmedAtMs?: number;
  }): Promise<{
    order: RuntimeOrderRecord;
    fulfilments: RuntimeFulfilmentRecord[];
    entitlements: RuntimeEntitlementRecord[];
    subscriptions: RuntimeCustomerSubscription[];
  }> {
    const nowMs = input.confirmedAtMs ?? Date.now();
    UniversalCommerceService.sweepExpiredLocksAndEntitlements(nowMs);
    const state = RuntimeStateRepository.getState();
    const tenant = this.resolveTenant(input.tenantId);

    const order = state.orders.find((o) => o.id === input.orderId && o.tenantId === tenant.id);
    if (!order) {
      throw new AppError('NOT_FOUND', `Order '${input.orderId}' not found.`, 404);
    }

    if (order.paymentStatus === 'captured') {
      return {
        order,
        fulfilments: state.fulfilments.filter((f) => f.orderId === order.id),
        entitlements: state.entitlements.filter((e) => e.orderId === order.id),
        subscriptions: state.customerSubscriptions.filter((s) =>
          order.lines.some((l) => l.subscriptionId === s.id),
        ),
      };
    }

    if (new Date(order.expiresAtIso).getTime() <= nowMs) {
      order.status = 'cancelled';
      order.paymentStatus = 'failed';
      RuntimeStateRepository.persist();
      throw new HoldExpiredError('Order checkout reservation window expired before payment capture.');
    }

    const createdFulfilments: RuntimeFulfilmentRecord[] = [];
    const createdEntitlements: RuntimeEntitlementRecord[] = [];
    const createdSubscriptions: RuntimeCustomerSubscription[] = [];

    for (const line of order.lines) {
      const item = state.catalogueItems.find((ci) => ci.id === line.catalogueItemId);

      // 1. Physical Product Commit & Fulfilment Creation (e.g. 2L Milk, Laptop)
      if (line.itemType === 'physical_product') {
        const res = state.inventoryReservations.find((r) => r.id === line.inventoryReservationId);
        const inv = state.inventoryItems.find(
          (i) => i.catalogueItemId === line.catalogueItemId && i.tenantId === tenant.id,
        );
        if (!inv || (!inv.allowBackorder && inv.quantityOnHand < line.quantity)) {
          throw new InsufficientStockError(`Insufficient stock to commit '${line.itemName}'.`);
        }

        inv.quantityOnHand -= line.quantity;
        if (res && res.status === 'active') {
          res.status = 'committed';
          inv.quantityReserved = Math.max(0, inv.quantityReserved - line.quantity);
        }
        inv.updatedAtIso = new Date(nowMs).toISOString();

        state.inventoryMovements.unshift({
          id: `mov-${nowMs.toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          tenantId: tenant.id,
          inventoryItemId: inv.id,
          catalogueItemId: line.catalogueItemId,
          movementType: 'sale_commit',
          deltaQuantity: -line.quantity,
          referenceId: order.orderNumber,
          notes: `Sold ${line.quantity} ${line.unitLabel}(s) in ${order.orderNumber}`,
          createdAtIso: new Date(nowMs).toISOString(),
        });

        const fulfilmentMethod =
          order.fulfilmentPreference ??
          (line.fulfilmentType === 'store_pickup' ? 'store_pickup' : 'local_delivery');

        const fulfilment: RuntimeFulfilmentRecord = {
          id: `ful-${nowMs.toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          tenantId: tenant.id,
          orderId: order.id,
          orderLineId: line.id,
          catalogueItemId: line.catalogueItemId,
          itemName: line.itemName,
          quantity: line.quantity,
          unitLabel: line.unitLabel,
          method: fulfilmentMethod,
          status: fulfilmentMethod === 'store_pickup' ? 'ready_for_pickup' : 'pending',
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          recipientAddress: order.shippingAddress ?? tenant.location.address,
          trackingNumber: `TRK-${order.orderNumber}-${line.id.slice(-4).toUpperCase()}`,
          deliverySlotStartIso: new Date(nowMs + 2 * 3600_000).toISOString(),
          deliverySlotEndIso: new Date(nowMs + 4 * 3600_000).toISOString(),
          createdAtIso: new Date(nowMs).toISOString(),
        };
        state.fulfilments.unshift(fulfilment);
        createdFulfilments.push(fulfilment);
        line.fulfilmentId = fulfilment.id;
        line.lineStatus = 'confirmed'; // Physical item is confirmed and awaiting physical delivery/pickup
      }

      // 2. Time-Slot or Capacity Session Booking Confirmation + Permission Entitlement
      if (
        line.itemType === 'bookable_resource' ||
        line.itemType === 'service_appointment' ||
        line.itemType === 'capacity_session'
      ) {
        if (line.bookingId && line.bookingHoldToken) {
          const checkout = await this.bookingService.initiateCheckoutPayment({
            tenantId: tenant.id,
            bookingId: line.bookingId,
            holdToken: line.bookingHoldToken,
            idempotencyKey: `ord-pay-${line.id}`,
          });
          await this.bookingService.confirmBookingFromVerifiedPayment({
            tenantId: tenant.id,
            bookingId: line.bookingId,
            paymentId: checkout.paymentId,
          });
        }

        const bookingRec = state.bookings.find((b) => b.bookingId === line.bookingId);
        const startIso =
          bookingRec?.startsAtIso ??
          line.slotSelection?.startsAtIso ??
          new Date(nowMs).toISOString();
        const endIso =
          bookingRec?.endsAtIso ??
          line.slotSelection?.endsAtIso ??
          new Date(nowMs + 3600_000).toISOString();

        const entitlement: RuntimeEntitlementRecord = {
          id: `ent-${nowMs.toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          tenantId: tenant.id,
          businessUnitId: item?.businessUnitId,
          orderId: order.id,
          orderLineId: line.id,
          catalogueItemId: line.catalogueItemId,
          itemName: line.itemName,
          bookingId: line.bookingId,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerEmail: order.customerEmail,
          entitlementType:
            line.itemType === 'capacity_session' ? 'session_attendance' : 'time_slot_access',
          permissionTimeslotStartIso: startIso,
          permissionTimeslotEndIso: endIso,
          maxUsageCount: line.quantity,
          consumedUsageCount: 0,
          status: 'active',
          flag1: item?.flag1,
          flag2: item?.flag2,
          createdAtIso: new Date(nowMs).toISOString(),
          updatedAtIso: new Date(nowMs).toISOString(),
        };
        state.entitlements.unshift(entitlement);
        createdEntitlements.push(entitlement);
        line.entitlementId = entitlement.id;
        line.lineStatus = 'fulfilled';
      }

      // 3. Digital Content / Course with Time-Limited Viewing Permission (e.g. 90-Day Course)
      if (line.itemType === 'digital_content') {
        const durationDays = item?.accessDurationDays ?? 90;
        const startIso = new Date(nowMs).toISOString();
        const endIso = new Date(nowMs + durationDays * 24 * 3600_000).toISOString();

        const entitlement: RuntimeEntitlementRecord = {
          id: `ent-${nowMs.toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          tenantId: tenant.id,
          businessUnitId: item?.businessUnitId,
          orderId: order.id,
          orderLineId: line.id,
          catalogueItemId: line.catalogueItemId,
          itemName: line.itemName,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerEmail: order.customerEmail,
          entitlementType: 'digital_content_access',
          permissionTimeslotStartIso: startIso,
          permissionTimeslotEndIso: endIso,
          maxUsageCount: null, // Unlimited views during the 90-day permission window
          consumedUsageCount: 0,
          status: 'active',
          flag1: item?.flag1 ?? 'digital_course',
          flag2: `${durationDays}_day_permission`,
          createdAtIso: startIso,
          updatedAtIso: startIso,
        };
        state.entitlements.unshift(entitlement);
        createdEntitlements.push(entitlement);
        line.entitlementId = entitlement.id;
        line.lineStatus = 'fulfilled';
      }

      // 4. Recurring Subscription & Membership Entitlement
      if (line.itemType === 'subscription_plan') {
        const cycleDays = item?.billingInterval === 'yearly' ? 365 : 30;
        const periodStartIso = new Date(nowMs).toISOString();
        const periodEndIso = new Date(nowMs + cycleDays * 24 * 3600_000).toISOString();
        const entId = `ent-${nowMs.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        const subId = `sub-${nowMs.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

        const subscription: RuntimeCustomerSubscription = {
          id: subId,
          tenantId: tenant.id,
          catalogueItemId: line.catalogueItemId,
          planName: line.itemName,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerEmail: order.customerEmail,
          priceMinor: line.unitPriceMinor,
          currency: 'INR',
          billingInterval: item?.billingInterval ?? 'monthly',
          status: 'active',
          currentPeriodStartIso: periodStartIso,
          currentPeriodEndIso: periodEndIso,
          cancelAtPeriodEnd: false,
          linkedEntitlementId: entId,
          createdAtIso: periodStartIso,
          updatedAtIso: periodStartIso,
        };

        const entitlement: RuntimeEntitlementRecord = {
          id: entId,
          tenantId: tenant.id,
          businessUnitId: item?.businessUnitId,
          orderId: order.id,
          orderLineId: line.id,
          catalogueItemId: line.catalogueItemId,
          itemName: line.itemName,
          subscriptionId: subId,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerEmail: order.customerEmail,
          entitlementType: 'membership_access',
          permissionTimeslotStartIso: periodStartIso,
          permissionTimeslotEndIso: periodEndIso,
          maxUsageCount: item?.includedUsageUnits ?? null,
          consumedUsageCount: 0,
          status: 'active',
          flag1: item?.flag1 ?? 'recurring_subscription',
          flag2: item?.flag2 ?? 'active_cycle',
          createdAtIso: periodStartIso,
          updatedAtIso: periodStartIso,
        };

        state.customerSubscriptions.unshift(subscription);
        state.entitlements.unshift(entitlement);
        createdSubscriptions.push(subscription);
        createdEntitlements.push(entitlement);
        line.subscriptionId = subId;
        line.entitlementId = entId;
        line.lineStatus = 'fulfilled';
      }
    }

    order.paymentStatus = 'captured';
    order.paymentMethod = input.paymentMethod ?? order.paymentMethod;
    order.updatedAtIso = new Date(nowMs).toISOString();

    const allFulfilled = order.lines.every((l) => l.lineStatus === 'fulfilled');
    const someFulfilled = order.lines.some((l) => l.lineStatus === 'fulfilled');
    order.status = allFulfilled
      ? 'fulfilled'
      : someFulfilled
      ? 'partially_fulfilled'
      : 'confirmed';

    RuntimeStateRepository.persist();
    return {
      order,
      fulfilments: createdFulfilments,
      entitlements: createdEntitlements,
      subscriptions: createdSubscriptions,
    };
  }

  /**
   * Verifies whether a customer currently has permission to view/use a catalogue item
   * at `atTimeMs` (defaults to `Date.now()`).
   * Automatically expires the entitlement and throws `EntitlementExpiredError` if `atTimeMs >= permissionTimeslotEndIso`.
   */
  public verifyEntitlementAccess(input: {
    tenantId: UUID;
    entitlementId: UUID;
    atTimeMs?: number;
    consumeUnit?: boolean;
  }): {
    allowed: boolean;
    entitlement: RuntimeEntitlementRecord;
    remainingDays: number | null;
  } {
    const checkTimeMs = input.atTimeMs ?? Date.now();
    UniversalCommerceService.sweepExpiredLocksAndEntitlements(checkTimeMs);

    const state = RuntimeStateRepository.getState();
    const tenant = this.resolveTenant(input.tenantId);
    const ent = state.entitlements.find(
      (e) => e.id === input.entitlementId && e.tenantId === tenant.id,
    );

    if (!ent) {
      throw new AppError('NOT_FOUND', 'Entitlement record not found.', 404);
    }

    const startMs = new Date(ent.permissionTimeslotStartIso).getTime();
    const endMs = ent.permissionTimeslotEndIso
      ? new Date(ent.permissionTimeslotEndIso).getTime()
      : null;

    if (endMs !== null && checkTimeMs >= endMs) {
      ent.status = 'expired';
      ent.updatedAtIso = new Date(checkTimeMs).toISOString();
      RuntimeStateRepository.persist();
      throw new EntitlementExpiredError(
        `Permission timeslot for '${ent.itemName}' expired on ${ent.permissionTimeslotEndIso}.`,
      );
    }

    if (checkTimeMs < startMs) {
      throw new AppError(
        'FORBIDDEN',
        `Permission timeslot for '${ent.itemName}' has not started yet (starts ${ent.permissionTimeslotStartIso}).`,
        403,
      );
    }

    if (ent.status !== 'active' && ent.status !== 'ready_to_upgrade') {
      throw new EntitlementExpiredError(
        `Entitlement for '${ent.itemName}' is currently '${ent.status}'.`,
      );
    }

    if (
      ent.maxUsageCount !== null &&
      ent.consumedUsageCount >= ent.maxUsageCount
    ) {
      ent.status = 'exhausted';
      RuntimeStateRepository.persist();
      throw new EntitlementExpiredError(`Usage limit (${ent.maxUsageCount}) reached.`);
    }

    if (input.consumeUnit) {
      ent.consumedUsageCount += 1;
      if (ent.maxUsageCount !== null && ent.consumedUsageCount >= ent.maxUsageCount) {
        ent.status = 'exhausted';
      } else if (
        ent.maxUsageCount !== null &&
        ent.maxUsageCount - ent.consumedUsageCount <= 2
      ) {
        ent.status = 'ready_to_upgrade';
      }
      ent.updatedAtIso = new Date(checkTimeMs).toISOString();
      RuntimeStateRepository.persist();
    }

    const remainingDays =
      endMs !== null ? Math.max(0, Math.ceil((endMs - checkTimeMs) / (24 * 3600_000))) : null;

    return {
      allowed: true,
      entitlement: ent,
      remainingDays,
    };
  }

  /**
   * Renews a recurring customer subscription for another billing cycle and extends
   * the linked entitlement's `permissionTimeslotEndIso`.
   */
  public renewSubscription(input: {
    tenantId: UUID;
    subscriptionId: UUID;
    renewedAtMs?: number;
  }): {
    subscription: RuntimeCustomerSubscription;
    entitlement: RuntimeEntitlementRecord;
  } {
    const nowMs = input.renewedAtMs ?? Date.now();
    const state = RuntimeStateRepository.getState();
    const tenant = this.resolveTenant(input.tenantId);

    const sub = state.customerSubscriptions.find(
      (s) => s.id === input.subscriptionId && s.tenantId === tenant.id,
    );
    if (!sub) {
      throw new AppError('NOT_FOUND', 'Subscription not found.', 404);
    }

    const cycleDays = sub.billingInterval === 'yearly' ? 365 : 30;
    const baseMs = Math.max(nowMs, new Date(sub.currentPeriodEndIso).getTime());
    const nextEndIso = new Date(baseMs + cycleDays * 24 * 3600_000).toISOString();

    sub.currentPeriodStartIso = new Date(nowMs).toISOString();
    sub.currentPeriodEndIso = nextEndIso;
    sub.status = 'active';
    sub.cancelAtPeriodEnd = false;
    sub.cancelledAtIso = undefined;
    sub.updatedAtIso = new Date(nowMs).toISOString();

    const ent = state.entitlements.find((e) => e.id === sub.linkedEntitlementId);
    if (!ent) {
      throw new AppError('NOT_FOUND', 'Linked subscription entitlement not found.', 404);
    }

    ent.permissionTimeslotEndIso = nextEndIso;
    ent.status = 'active';
    ent.updatedAtIso = new Date(nowMs).toISOString();

    RuntimeStateRepository.persist();
    return { subscription: sub, entitlement: ent };
  }

  /**
   * Schedules cancellation of a recurring subscription at the end of the paid period.
   * The customer retains active entitlement access until `currentPeriodEndIso`, after which
   * `sweepExpiredLocksAndEntitlements` / `verifyEntitlementAccess` transitions both to `expired`.
   */
  public cancelSubscriptionAtPeriodEnd(input: {
    tenantId: UUID;
    subscriptionId: UUID;
    cancelledAtMs?: number;
  }): {
    subscription: RuntimeCustomerSubscription;
    entitlement: RuntimeEntitlementRecord;
  } {
    const nowMs = input.cancelledAtMs ?? Date.now();
    const state = RuntimeStateRepository.getState();
    const tenant = this.resolveTenant(input.tenantId);

    const sub = state.customerSubscriptions.find(
      (s) => s.id === input.subscriptionId && s.tenantId === tenant.id,
    );
    if (!sub) {
      throw new AppError('NOT_FOUND', 'Subscription not found.', 404);
    }

    sub.cancelAtPeriodEnd = true;
    sub.status = 'cancel_at_period_end';
    sub.cancelledAtIso = new Date(nowMs).toISOString();
    sub.updatedAtIso = new Date(nowMs).toISOString();

    const ent = state.entitlements.find((e) => e.id === sub.linkedEntitlementId)!;
    RuntimeStateRepository.persist();
    return { subscription: sub, entitlement: ent };
  }

  /**
   * Transitions physical fulfilment status (e.g., `pending -> out_for_delivery -> delivered`).
   * When all lines of an Order are delivered/picked_up/fulfilled, transitions `order.status = 'fulfilled'`.
   */
  public updateFulfilmentStatus(input: {
    tenantId: UUID;
    fulfilmentId: UUID;
    status: FulfilmentStatus;
  }): { fulfilment: RuntimeFulfilmentRecord; order?: RuntimeOrderRecord } {
    const state = RuntimeStateRepository.getState();
    const tenant = this.resolveTenant(input.tenantId);

    const ful = state.fulfilments.find(
      (f) => f.id === input.fulfilmentId && f.tenantId === tenant.id,
    );
    if (!ful) {
      throw new AppError('NOT_FOUND', 'Fulfilment record not found.', 404);
    }

    ful.status = input.status;
    if (input.status === 'delivered' || input.status === 'picked_up') {
      ful.completedAtIso = new Date().toISOString();
    }

    const order = state.orders.find((o) => o.id === ful.orderId);
    if (order) {
      const line = order.lines.find((l) => l.id === ful.orderLineId);
      if (line && (input.status === 'delivered' || input.status === 'picked_up')) {
        line.lineStatus = 'fulfilled';
      }
      if (order.lines.every((l) => l.lineStatus === 'fulfilled')) {
        order.status = 'fulfilled';
      } else if (order.lines.some((l) => l.lineStatus === 'fulfilled')) {
        order.status = 'partially_fulfilled';
      }
      order.updatedAtIso = new Date().toISOString();
    }

    RuntimeStateRepository.persist();
    return { fulfilment: ful, order };
  }

  /**
   * Updates catalogue item status (`dormant`, `unavailable`, `active`, `ready_to_upgrade`)
   * or flags (`flag1`, `flag2`) or restocks physical inventory.
   */
  public updateCatalogueItemOrStock(input: {
    tenantId: UUID;
    catalogueItemId: UUID;
    status?: CatalogueItemStatus;
    flag1?: string;
    flag2?: string;
    restockDelta?: number;
  }): RuntimeCatalogueItem {
    const state = RuntimeStateRepository.getState();
    const tenant = this.resolveTenant(input.tenantId);
    const item = state.catalogueItems.find(
      (ci) => ci.id === input.catalogueItemId && ci.tenantId === tenant.id,
    );
    if (!item) {
      throw new AppError('NOT_FOUND', 'Catalogue item not found.', 404);
    }

    if (input.status) {
      item.status = input.status;
    }
    if (input.flag1 !== undefined) {
      item.flag1 = input.flag1;
    }
    if (input.flag2 !== undefined) {
      item.flag2 = input.flag2;
    }

    if (typeof input.restockDelta === 'number' && input.restockDelta !== 0) {
      const inv = state.inventoryItems.find(
        (i) => i.catalogueItemId === item.id && i.tenantId === tenant.id,
      );
      if (inv) {
        inv.quantityOnHand = Math.max(0, inv.quantityOnHand + input.restockDelta);
        inv.updatedAtIso = new Date().toISOString();
        state.inventoryMovements.unshift({
          id: `mov-${Date.now().toString(36)}`,
          tenantId: tenant.id,
          inventoryItemId: inv.id,
          catalogueItemId: item.id,
          movementType: input.restockDelta > 0 ? 'restock' : 'manual_adjustment',
          deltaQuantity: input.restockDelta,
          referenceId: 'MANUAL-DASHBOARD',
          notes: `Stock adjusted by ${input.restockDelta} ${inv.unitLabel}(s)`,
          createdAtIso: new Date().toISOString(),
        });
      }
    }

    RuntimeStateRepository.persist();
    return item;
  }

  /**
   * Creates a new Catalogue Item (Physical Product, Course, Resource Slot, or Subscription)
   * and initializes its inventory ledger if physical.
   */
  public createCatalogueItem(input: {
    tenantId: UUID;
    name: string;
    categoryName: string;
    subEntityName?: string;
    itemType: CatalogueItemType;
    fulfilmentType: FulfilmentType;
    priceMinor: number;
    unitLabel?: string;
    initialStock?: number;
    accessDurationDays?: number;
    flag1?: string;
    flag2?: string;
    status?: CatalogueItemStatus;
  }): RuntimeCatalogueItem {
    const state = RuntimeStateRepository.getState();
    const tenant = this.resolveTenant(input.tenantId);
    const id = `ci-custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    const slug = `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${id.slice(-4)}`;

    const newItem: RuntimeCatalogueItem = {
      id,
      tenantId: tenant.id,
      categoryName: input.categoryName,
      subEntityName: input.subEntityName ?? 'Main Division',
      domainName: tenant.customDomain ?? `${tenant.slug}.build-any-website.vercel.app`,
      itemType: input.itemType,
      fulfilmentType: input.fulfilmentType,
      billingModel:
        input.itemType === 'digital_content'
          ? 'fixed_duration_access'
          : input.itemType === 'subscription_plan'
          ? 'recurring_subscription'
          : input.itemType === 'physical_product'
          ? 'one_time'
          : 'time_slot',
      name: input.name,
      slug,
      sku: `SKU-${id.slice(-6).toUpperCase()}`,
      shortDescription: `${input.name} (${input.categoryName})`,
      description: `${input.name} configured in Universal Catalogue.`,
      flag1: input.flag1,
      flag2: input.flag2,
      status: input.status ?? 'active',
      priceMinor: input.priceMinor,
      currency: 'INR',
      unitLabel: input.unitLabel ?? 'unit',
      accessDurationDays: input.accessDurationDays,
    };

    state.catalogueItems.unshift(newItem);

    if (input.itemType === 'physical_product') {
      state.inventoryItems.push({
        id: `inv-${id}`,
        tenantId: tenant.id,
        catalogueItemId: id,
        sku: newItem.sku,
        unitLabel: newItem.unitLabel,
        quantityOnHand: Math.max(0, input.initialStock ?? 25),
        quantityReserved: 0,
        lowStockThreshold: 5,
        allowBackorder: false,
        updatedAtIso: new Date().toISOString(),
      });
    }

    RuntimeStateRepository.persist();
    return newItem;
  }

  private resolveTenant(tenantIdOrSlug: string) {
    const state = RuntimeStateRepository.getState();
    const key = tenantIdOrSlug.toLowerCase();
    const tenant = state.tenants.find(
      (t) => t.id.toLowerCase() === key || t.slug.toLowerCase() === key,
    );
    if (!tenant) {
      throw new AppError('TENANT_NOT_FOUND', `Tenant '${tenantIdOrSlug}' not found.`, 404);
    }
    return tenant;
  }
}
