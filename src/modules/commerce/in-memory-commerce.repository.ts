import type { CommerceRepositoryPort } from './commerce.repository.port';
import type {
  CreateUniversalOrderInput,
} from './commerce.service';
import type {
  RuntimeCatalogueItem,
  RuntimeCustomerSubscription,
  RuntimeEntitlementRecord,
  RuntimeFulfilmentRecord,
  RuntimeInventoryItem,
  RuntimeOrderLineRecord,
  RuntimeOrderRecord,
} from './commerce.types';
import {
  RuntimeStateRepository,
} from '@/modules/persistence/runtime-store';
import type { MockTenant } from '@/lib/mock-data/mock-tenants';
import type { BookingModel, UUID } from '@/types/domain';
import {
  AppError,
  HoldExpiredError,
  InsufficientStockError,
  ItemUnavailableError,
} from '@/lib/errors';
import { BookingServiceImpl } from '@/modules/booking/booking.impl';

export class InMemoryCommerceRepository implements CommerceRepositoryPort {
  private readonly bookingService: BookingServiceImpl;

  constructor(bookingService?: BookingServiceImpl) {
    this.bookingService = bookingService ?? new BookingServiceImpl();
  }

  public async resolveTenant(tenantIdOrSlug: string): Promise<MockTenant | null> {
    const state = RuntimeStateRepository.getState();
    const tenant = state.tenants.find(
      (t) => t.id === tenantIdOrSlug || t.slug === tenantIdOrSlug,
    );
    return tenant ?? null;
  }

  public async findCatalogueItem(tenantId: UUID, itemId: UUID): Promise<RuntimeCatalogueItem | null> {
    const state = RuntimeStateRepository.getState();
    const item = state.catalogueItems.find((ci) => ci.id === itemId && ci.tenantId === tenantId);
    return item ?? null;
  }

  public async listCatalogueItems(
    tenantId: UUID,
    filter?: { itemType?: string },
  ): Promise<RuntimeCatalogueItem[]> {
    const state = RuntimeStateRepository.getState();
    return state.catalogueItems.filter((ci) => {
      if (ci.tenantId !== tenantId) return false;
      if (filter?.itemType && ci.itemType !== filter.itemType) return false;
      return true;
    });
  }

  public async findInventoryItem(
    tenantId: UUID,
    catalogueItemId: UUID,
  ): Promise<RuntimeInventoryItem | null> {
    const state = RuntimeStateRepository.getState();
    const inv = state.inventoryItems.find(
      (i) => i.catalogueItemId === catalogueItemId && i.tenantId === tenantId,
    );
    return inv ?? null;
  }

  public async findOrderById(tenantId: UUID, orderId: UUID): Promise<RuntimeOrderRecord | null> {
    const state = RuntimeStateRepository.getState();
    const order = state.orders.find((o) => o.id === orderId && o.tenantId === tenantId);
    return order ?? null;
  }

  public async findOrderByIdempotency(
    tenantId: UUID,
    idempotencyKey: string,
  ): Promise<RuntimeOrderRecord | null> {
    const state = RuntimeStateRepository.getState();
    const order = state.orders.find(
      (o) => o.tenantId === tenantId && o.idempotencyKey === idempotencyKey,
    );
    return order ?? null;
  }

  public async listOrders(tenantId: UUID): Promise<RuntimeOrderRecord[]> {
    const state = RuntimeStateRepository.getState();
    return state.orders.filter((o) => o.tenantId === tenantId);
  }

  public async createOrderAndHold(input: CreateUniversalOrderInput): Promise<{
    order: RuntimeOrderRecord;
    fulfilments: RuntimeFulfilmentRecord[];
    entitlements: RuntimeEntitlementRecord[];
    subscriptions: RuntimeCustomerSubscription[];
  }> {
    const state = RuntimeStateRepository.getState();
    const tenant = await this.resolveTenant(input.tenantId);
    const resolvedTenantId = tenant?.id ?? input.tenantId;

    // Idempotency check
    const existingOrder = state.orders.find(
      (o) => o.tenantId === resolvedTenantId && o.idempotencyKey === input.idempotencyKey,
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
          (ci) => ci.id === lineReq.catalogueItemId && ci.tenantId === resolvedTenantId,
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
        const unitPriceMinor = item.priceMinor;
        const lineTotalMinor = unitPriceMinor * qty;
        let inventoryReservationId: string | undefined;
        let bookingId: string | undefined;
        let bookingHoldToken: string | undefined;

        // A. Physical Product Stock Reservation
        if (item.itemType === 'physical_product') {
          const inv = state.inventoryItems.find(
            (i) => i.catalogueItemId === item.id && i.tenantId === resolvedTenantId,
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
            tenantId: resolvedTenantId,
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

        // B. Bookable Resource / Appointment / Session Hold
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
                  sessionId: lineReq.slotSelection?.sessionId ?? item.sessionId ?? 'sess-morning-yoga-01',
                  quantity: qty,
                };

          const holdResult = await this.bookingService.createHold({
            tenantId: resolvedTenantId,
            locationId: (tenant?.location as { id?: UUID } | undefined)?.id ?? 'loc-01',
            idempotencyKey: `${input.idempotencyKey}-booking-line-${idx + 1}`,
            selection: holdSelection,
            customer: {
              fullName: input.customer.fullName,
              phone: input.customer.phone,
              email: input.customer.email,
            },
          });

          bookingId = holdResult.bookingId;
          bookingHoldToken = holdResult.holdToken;
          acquiredBookingIds.push(bookingId);
        }

        orderLines.push({
          id: lineId,
          orderId,
          tenantId: resolvedTenantId,
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
                resourceId: lineReq.slotSelection.resourceId,
                serviceId: lineReq.slotSelection.serviceId,
                staffMemberId: lineReq.slotSelection.staffMemberId,
                sessionId: lineReq.slotSelection.sessionId,
                startsAtIso: lineReq.slotSelection.startsAt
                  ? new Date(lineReq.slotSelection.startsAt).toISOString()
                  : undefined,
                endsAtIso: lineReq.slotSelection.endsAt
                  ? new Date(lineReq.slotSelection.endsAt).toISOString()
                  : undefined,
              }
            : undefined,
        });

        subtotalMinor += lineTotalMinor;
      }
    } catch (err) {
      // Rollback holds on error
      for (const resId of acquiredInventoryResIds) {
        const res = state.inventoryReservations.find((r) => r.id === resId);
        if (res && res.status === 'active') {
          res.status = 'released';
          const inv = state.inventoryItems.find((i) => i.id === res.inventoryItemId);
          if (inv) {
            inv.quantityReserved = Math.max(0, inv.quantityReserved - res.quantity);
          }
        }
      }
      for (const bId of acquiredBookingIds) {
        const alloc = state.allocations.find((a) => a.bookingId === bId && a.status === 'held');
        if (alloc) alloc.status = 'released';
      }
      throw err;
    }

    const totalMinor = subtotalMinor; // taxMinor = 0 for now
    const orderRecord: RuntimeOrderRecord = {
      id: orderId,
      orderNumber,
      tenantId: resolvedTenantId,
      businessUnitId: tenant?.id,
      customerName: input.customer.fullName,
      customerPhone: input.customer.phone,
      customerEmail: input.customer.email,
      shippingAddress: input.customer.shippingAddress,
      fulfilmentPreference: input.fulfilmentPreference,
      status: 'awaiting_payment',
      paymentStatus: 'unpaid',
      paymentMethod: input.paymentMethod ?? 'upi',
      subtotalMinor,
      taxMinor: 0,
      totalMinor,
      currency: 'INR',
      idempotencyKey: input.idempotencyKey,
      expiresAtIso: new Date(expiresAtMs).toISOString(),
      lines: orderLines,
      createdAtIso: new Date(nowMs).toISOString(),
      updatedAtIso: new Date(nowMs).toISOString(),
    };

    state.orders.unshift(orderRecord);
    RuntimeStateRepository.persist();

    if (input.autoConfirmPayment) {
      return this.confirmOrderPayment({
        tenantId: resolvedTenantId,
        orderId,
        paymentMethod: input.paymentMethod,
        confirmedAtMs: nowMs,
      });
    }

    return {
      order: orderRecord,
      fulfilments: [],
      entitlements: [],
      subscriptions: [],
    };
  }

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
    const state = RuntimeStateRepository.getState();
    const tenant = await this.resolveTenant(input.tenantId);
    const resolvedTenantId = tenant?.id ?? input.tenantId;

    const order = state.orders.find((o) => o.id === input.orderId && o.tenantId === resolvedTenantId);
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

      // 1. Physical Product Commit & Fulfilment Creation
      if (line.itemType === 'physical_product') {
        const res = state.inventoryReservations.find((r) => r.id === line.inventoryReservationId);
        const inv = state.inventoryItems.find(
          (i) => i.catalogueItemId === line.catalogueItemId && i.tenantId === resolvedTenantId,
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
          tenantId: resolvedTenantId,
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
          tenantId: resolvedTenantId,
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
          recipientAddress: order.shippingAddress ?? tenant?.location?.address ?? '',
          trackingNumber: `TRK-${order.orderNumber}-${line.id.slice(-4).toUpperCase()}`,
          deliverySlotStartIso: new Date(nowMs + 2 * 3600_000).toISOString(),
          deliverySlotEndIso: new Date(nowMs + 4 * 3600_000).toISOString(),
          createdAtIso: new Date(nowMs).toISOString(),
        };
        state.fulfilments.unshift(fulfilment);
        createdFulfilments.push(fulfilment);
        line.fulfilmentId = fulfilment.id;
        line.lineStatus = 'confirmed';
      }

      // 2. Booking confirmation
      if (
        line.itemType === 'bookable_resource' ||
        line.itemType === 'service_appointment' ||
        line.itemType === 'capacity_session'
      ) {
        if (line.bookingId && line.bookingHoldToken) {
          const alloc = state.allocations.find((a) => a.bookingId === line.bookingId);
          if (alloc) {
            alloc.status = 'confirmed';
            const entitlement: RuntimeEntitlementRecord = {
              id: `ent-${nowMs.toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
              tenantId: resolvedTenantId,
              orderId: order.id,
              orderLineId: line.id,
              catalogueItemId: line.catalogueItemId,
              itemName: line.itemName,
              bookingId: line.bookingId,
              customerName: order.customerName,
              customerPhone: order.customerPhone,
              customerEmail: order.customerEmail,
              entitlementType: 'time_slot_access',
              permissionTimeslotStartIso: alloc ? new Date(alloc.startsAtMs).toISOString() : new Date(nowMs).toISOString(),
              permissionTimeslotEndIso: alloc ? new Date(alloc.endsAtMs).toISOString() : new Date(nowMs + 3600_000).toISOString(),
              maxUsageCount: null,
              consumedUsageCount: 0,
              status: 'active',
              createdAtIso: new Date(nowMs).toISOString(),
              updatedAtIso: new Date(nowMs).toISOString(),
            };
            state.entitlements.unshift(entitlement);
            createdEntitlements.push(entitlement);
            line.entitlementId = entitlement.id;
          }
          line.lineStatus = 'confirmed';
        }
      }

      // 3. Digital Content Entitlement
      if (line.itemType === 'digital_content' || (line.itemType as string) === 'digital_course') {
        const accessDays = item?.accessDurationDays ?? 90;
        const validUntil = new Date(nowMs + accessDays * 24 * 3600_000);
        const entitlement: RuntimeEntitlementRecord = {
          id: `ent-${nowMs.toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          tenantId: resolvedTenantId,
          orderId: order.id,
          orderLineId: line.id,
          catalogueItemId: line.catalogueItemId,
          itemName: line.itemName,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerEmail: order.customerEmail,
          entitlementType: 'digital_content_access',
          permissionTimeslotStartIso: new Date(nowMs).toISOString(),
          permissionTimeslotEndIso: validUntil.toISOString(),
          maxUsageCount: null,
          consumedUsageCount: 0,
          status: 'active',
          createdAtIso: new Date(nowMs).toISOString(),
          updatedAtIso: new Date(nowMs).toISOString(),
        };
        state.entitlements.unshift(entitlement);
        createdEntitlements.push(entitlement);
        line.entitlementId = entitlement.id;
        line.lineStatus = 'confirmed';
      }

      // 4. Recurring Subscription
      if (line.itemType === 'subscription_plan' || (line.itemType as string) === 'subscription_membership') {
        const intervalDays = item?.billingInterval === 'yearly' ? 365 : 30;
        const periodEnd = new Date(nowMs + intervalDays * 24 * 3600_000);
        const subId = `sub-${nowMs.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        const entId = `ent-${nowMs.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

        const entitlement: RuntimeEntitlementRecord = {
          id: entId,
          tenantId: resolvedTenantId,
          orderId: order.id,
          orderLineId: line.id,
          catalogueItemId: line.catalogueItemId,
          itemName: line.itemName,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerEmail: order.customerEmail,
          entitlementType: 'membership_access',
          permissionTimeslotStartIso: new Date(nowMs).toISOString(),
          permissionTimeslotEndIso: periodEnd.toISOString(),
          maxUsageCount: null,
          consumedUsageCount: 0,
          status: 'active',
          createdAtIso: new Date(nowMs).toISOString(),
          updatedAtIso: new Date(nowMs).toISOString(),
        };
        state.entitlements.unshift(entitlement);
        createdEntitlements.push(entitlement);

        const subscription: RuntimeCustomerSubscription = {
          id: subId,
          tenantId: resolvedTenantId,
          catalogueItemId: line.catalogueItemId,
          planName: line.itemName,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerEmail: order.customerEmail,
          priceMinor: line.unitPriceMinor,
          currency: 'INR',
          billingInterval: item?.billingInterval ?? 'monthly',
          status: 'active',
          currentPeriodStartIso: new Date(nowMs).toISOString(),
          currentPeriodEndIso: periodEnd.toISOString(),
          cancelAtPeriodEnd: false,
          linkedEntitlementId: entId,
          createdAtIso: new Date(nowMs).toISOString(),
          updatedAtIso: new Date(nowMs).toISOString(),
        };
        state.customerSubscriptions.unshift(subscription);
        createdSubscriptions.push(subscription);
        line.subscriptionId = subId;
        line.entitlementId = entId;
        line.lineStatus = 'confirmed';
      }
    }

    order.status = 'confirmed';
    order.paymentStatus = 'captured';
    order.paymentMethod = input.paymentMethod ?? order.paymentMethod;
    order.updatedAtIso = new Date(nowMs).toISOString();

    RuntimeStateRepository.persist();

    return {
      order,
      fulfilments: createdFulfilments,
      entitlements: createdEntitlements,
      subscriptions: createdSubscriptions,
    };
  }

  public resetForTests(): void {
    RuntimeStateRepository.resetForTests(true);
  }
}
