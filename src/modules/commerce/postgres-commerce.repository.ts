import { randomUUID } from 'node:crypto';
import { eq, and, sql, desc, gte } from 'drizzle-orm';
import { db, type AppDatabase } from '@/db';
import {
  catalogueItems,
  inventoryItems,
  inventoryReservations,
  inventoryMovements,
  orders,
  orderLines,
  fulfilments,
  entitlements,
  customerSubscriptions,
  tenants,
  bookingItems,
  outboxEvents,
} from '@/db/schema';
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
import type { MockTenant } from '@/lib/mock-data/mock-tenants';
import type { BillingModel, BookingModel, OrderStatus, UUID } from '@/types/domain';
import {
  AppError,
  HoldExpiredError,
  InsufficientStockError,
  ItemUnavailableError,
} from '@/lib/errors';
import { PostgresBookingRepository } from '@/modules/booking/postgres-booking.repository';

export class PostgresCommerceRepository implements CommerceRepositoryPort {
  private readonly db: AppDatabase;
  private readonly bookingRepo: PostgresBookingRepository;

  constructor(database?: AppDatabase, bookingRepo?: PostgresBookingRepository) {
    this.db = database ?? db;
    this.bookingRepo = bookingRepo ?? new PostgresBookingRepository(this.db);
  }

  public async resolveTenant(tenantIdOrSlug: string): Promise<MockTenant | null> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      tenantIdOrSlug,
    );

    const [row] = isUuid
      ? await this.db.select().from(tenants).where(eq(tenants.id, tenantIdOrSlug)).limit(1)
      : await this.db.select().from(tenants).where(eq(tenants.slug, tenantIdOrSlug)).limit(1);

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      vertical: 'universal_commerce',
      status: 'active',
      defaultCurrency: 'INR',
      plan: 'starter',
      domain: `${row.slug}.buildanywebsite.com`,
      websiteStatus: 'published',
      publishedVersion: 1,
      location: {
        name: 'Main Branch',
        city: 'Bengaluru',
        state: 'Karnataka',
        address: '100 Feet Road, Indiranagar, Bengaluru',
        phone: '+91 98765 43210',
        timezone: 'Asia/Kolkata',
      },
      stats: {
        totalBookings: 0,
        monthlyRevenueMinor: 0,
        utilizationRate: 0,
      },
      createdAt: '2026-11-01T00:00:00Z',
      onboardingTimeHours: 24,
    };
  }

  public async findCatalogueItem(tenantId: UUID, itemId: UUID): Promise<RuntimeCatalogueItem | null> {
    const [row] = await this.db
      .select()
      .from(catalogueItems)
      .where(and(eq(catalogueItems.id, itemId), eq(catalogueItems.tenantId, tenantId)))
      .limit(1);

    if (!row) return null;

    const attrs = (row.attributes ?? {}) as Record<string, unknown>;
    return {
      id: row.id,
      tenantId: row.tenantId,
      businessUnitId: row.businessUnitId ?? undefined,
      categoryName: 'General',
      subEntityName: 'Main',
      domainName: 'Store',
      itemType: row.itemType,
      fulfilmentType: row.fulfilmentType,
      billingModel: (attrs.billingModel as BillingModel) ?? 'one_time',
      name: row.name,
      slug: row.slug,
      sku: row.sku ?? '',
      shortDescription: row.shortDescription ?? '',
      description: row.description ?? '',
      status: row.status,
      priceMinor: row.basePriceMinor,
      currency: 'INR',
      unitLabel: (attrs.unitLabel as string) ?? 'unit',
      resourceId: row.resourceId ?? undefined,
      serviceId: row.serviceId ?? undefined,
      sessionId: (attrs.sessionId as string) ?? undefined,
      accessDurationDays: row.accessDurationDays ?? undefined,
      billingInterval: (attrs.billingInterval as 'monthly' | 'yearly') ?? undefined,
      includedUsageUnits: (attrs.includedUsageUnits as number) ?? undefined,
    };
  }

  public async listCatalogueItems(
    tenantId: UUID,
    filter?: { itemType?: string },
  ): Promise<RuntimeCatalogueItem[]> {
    let rows = await this.db
      .select()
      .from(catalogueItems)
      .where(eq(catalogueItems.tenantId, tenantId));

    if (filter?.itemType) {
      rows = rows.filter((r) => r.itemType === filter.itemType);
    }

    return rows.map((row) => {
      const attrs = (row.attributes ?? {}) as Record<string, unknown>;
      return {
        id: row.id,
        tenantId: row.tenantId,
        businessUnitId: row.businessUnitId ?? undefined,
        categoryName: 'General',
        subEntityName: 'Main',
        domainName: 'Store',
        itemType: row.itemType,
        fulfilmentType: row.fulfilmentType,
        billingModel: (attrs.billingModel as BillingModel) ?? 'one_time',
        name: row.name,
        slug: row.slug,
        sku: row.sku ?? '',
        shortDescription: row.shortDescription ?? '',
        description: row.description ?? '',
        status: row.status,
        priceMinor: row.basePriceMinor,
        currency: 'INR',
        unitLabel: (attrs.unitLabel as string) ?? 'unit',
        resourceId: row.resourceId ?? undefined,
        serviceId: row.serviceId ?? undefined,
        sessionId: (attrs.sessionId as string) ?? undefined,
        accessDurationDays: row.accessDurationDays ?? undefined,
        billingInterval: (attrs.billingInterval as 'monthly' | 'yearly') ?? undefined,
        includedUsageUnits: (attrs.includedUsageUnits as number) ?? undefined,
      };
    });
  }

  public async findInventoryItem(
    tenantId: UUID,
    catalogueItemId: UUID,
  ): Promise<RuntimeInventoryItem | null> {
    const [row] = await this.db
      .select()
      .from(inventoryItems)
      .where(
        and(
          eq(inventoryItems.catalogueItemId, catalogueItemId),
          eq(inventoryItems.tenantId, tenantId),
        ),
      )
      .limit(1);

    if (!row) return null;

    return {
      id: row.id,
      tenantId: row.tenantId,
      catalogueItemId: row.catalogueItemId,
      sku: '',
      unitLabel: row.unitLabel,
      quantityOnHand: row.quantityOnHand,
      quantityReserved: row.quantityReserved,
      lowStockThreshold: row.lowStockThreshold,
      allowBackorder: row.allowBackorder,
      updatedAtIso: row.updatedAt.toISOString(),
    };
  }

  public async findOrderById(tenantId: UUID, orderId: UUID): Promise<RuntimeOrderRecord | null> {
    const [o] = await this.db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)))
      .limit(1);

    if (!o) return null;

    const lines = await this.db
      .select()
      .from(orderLines)
      .where(and(eq(orderLines.orderId, o.id), eq(orderLines.tenantId, tenantId)));

    return {
      id: o.id,
      orderNumber: o.orderNumber,
      tenantId: o.tenantId,
      businessUnitId: o.businessUnitId ?? undefined,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      customerEmail: o.customerEmail ?? undefined,
      shippingAddress: o.shippingAddress ? JSON.stringify(o.shippingAddress) : undefined,
      fulfilmentPreference: undefined,
      status: o.status as OrderStatus,
      paymentStatus: (o.paymentStatus === 'captured' ? 'paid' : o.paymentStatus) as RuntimeOrderRecord['paymentStatus'],
      paymentMethod: 'upi',
      subtotalMinor: o.subtotalMinor,
      taxMinor: o.taxMinor,
      totalMinor: o.totalMinor,
      currency: 'INR',
      idempotencyKey: o.idempotencyKey,
      expiresAtIso: o.expiresAt ? o.expiresAt.toISOString() : new Date().toISOString(),
      lines: (Array.isArray(lines) ? lines : []).map((l) => ({
        id: l.id,
        orderId: l.orderId,
        tenantId: l.tenantId,
        catalogueItemId: l.catalogueItemId,
        itemName: l.titleSnapshot,
        itemType: l.itemType,
        fulfilmentType: l.fulfilmentType,
        quantity: l.quantity,
        unitLabel: 'unit',
        unitPriceMinor: l.unitPriceMinor,
        lineTotalMinor: l.lineTotalMinor,
        lineStatus: l.lineStatus as RuntimeOrderLineRecord['lineStatus'],
        bookingId: l.bookingId ?? undefined,
      })),
      createdAtIso: o.createdAt.toISOString(),
      updatedAtIso: o.updatedAt.toISOString(),
    };
  }

  public async findOrderByIdempotency(
    tenantId: UUID,
    idempotencyKey: string,
  ): Promise<RuntimeOrderRecord | null> {
    const [o] = await this.db
      .select()
      .from(orders)
      .where(and(eq(orders.tenantId, tenantId), eq(orders.idempotencyKey, idempotencyKey)))
      .limit(1);

    if (!o) return null;
    return this.findOrderById(tenantId, o.id);
  }

  public async listOrders(tenantId: UUID): Promise<RuntimeOrderRecord[]> {
    const rows = await this.db
      .select()
      .from(orders)
      .where(eq(orders.tenantId, tenantId))
      .orderBy(desc(orders.createdAt))
      .limit(100);

    const results: RuntimeOrderRecord[] = [];
    for (const r of rows) {
      const full = await this.findOrderById(tenantId, r.id);
      if (full) results.push(full);
    }
    return results;
  }

  /**
   * 3.3 Transactional Checkout: Atomic order creation, inventory reservation & hold claim.
   */
  public async createOrderAndHold(input: CreateUniversalOrderInput): Promise<{
    order: RuntimeOrderRecord;
    fulfilments: RuntimeFulfilmentRecord[];
    entitlements: RuntimeEntitlementRecord[];
    subscriptions: RuntimeCustomerSubscription[];
  }> {
    const tenant = await this.resolveTenant(input.tenantId);
    const resolvedTenantId = tenant?.id ?? input.tenantId;

    // Idempotency check
    const existing = await this.findOrderByIdempotency(resolvedTenantId, input.idempotencyKey);
    if (existing) {
      return {
        order: existing,
        fulfilments: [],
        entitlements: [],
        subscriptions: [],
      };
    }

    if (!input.lines || input.lines.length === 0) {
      throw new AppError('VALIDATION_ERROR', 'Order must contain at least one line item.', 400);
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 8 * 60 * 1000);
    const orderId = randomUUID();
    const seq = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `ORD-${now.getFullYear()}-${seq}`;

    return await this.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${resolvedTenantId}, true)`);

      const runtimeLines: RuntimeOrderLineRecord[] = [];
      let subtotalMinor = 0;

      for (let idx = 0; idx < input.lines.length; idx += 1) {
        const lineReq = input.lines[idx]!;
        const qty = Math.max(1, Math.round(lineReq.quantity ?? 1));

        const [item] = await tx
          .select()
          .from(catalogueItems)
          .where(
            and(
              eq(catalogueItems.id, lineReq.catalogueItemId),
              eq(catalogueItems.tenantId, resolvedTenantId),
            ),
          )
          .limit(1);

        if (!item) {
          throw new AppError(
            'NOT_FOUND',
            `Catalogue item '${lineReq.catalogueItemId}' not found.`,
            404,
          );
        }

        if (item.status !== 'active' && item.status !== 'ready_to_upgrade') {
          throw new ItemUnavailableError(`Item '${item.name}' cannot be purchased.`);
        }

        const lineId = randomUUID();
        const unitPriceMinor = item.basePriceMinor;
        const lineTotalMinor = unitPriceMinor * qty;
        let inventoryReservationId: UUID | undefined;
        let bookingId: UUID | undefined;
        let bookingHoldToken: string | undefined;

        // 1. Atomic Physical Inventory Reservation
        if (item.itemType === 'physical_product') {
          // Atomically decrement / reserve with check: on_hand - reserved >= qty
          const updated = await tx
            .update(inventoryItems)
            .set({
              quantityReserved: sql`${inventoryItems.quantityReserved} + ${qty}`,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(inventoryItems.catalogueItemId, item.id),
                eq(inventoryItems.tenantId, resolvedTenantId),
                sql`(${inventoryItems.quantityOnHand} - ${inventoryItems.quantityReserved} >= ${qty} OR ${inventoryItems.allowBackorder} = true)`,
              ),
            )
            .returning();

          if (updated.length === 0) {
            throw new InsufficientStockError(`Insufficient stock for '${item.name}'.`);
          }

          inventoryReservationId = randomUUID();
          await tx.insert(inventoryReservations).values({
            id: inventoryReservationId,
            tenantId: resolvedTenantId,
            inventoryItemId: updated[0]!.id,
            orderId,
            quantity: qty,
            status: 'active',
            expiresAt,
            idempotencyKey: `${input.idempotencyKey}-line-${idx + 1}`,
          });
        }

        // 2. Bookable resource / appointment / session hold
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
            : new Date(now.getTime() + 24 * 3600_000);
          const endsAt = lineReq.slotSelection?.endsAt
            ? new Date(lineReq.slotSelection.endsAt)
            : new Date(startsAt.getTime() + 3600_000);

          const holdSelection =
            bookingModel === 'exclusive_resource'
              ? {
                  bookingModel: 'exclusive_resource' as const,
                  resourceId: lineReq.slotSelection?.resourceId ?? item.resourceId ?? randomUUID(),
                  startsAt,
                  endsAt,
                }
              : bookingModel === 'staff_appointment'
              ? {
                  bookingModel: 'staff_appointment' as const,
                  serviceId: lineReq.slotSelection?.serviceId ?? item.serviceId ?? randomUUID(),
                  staffMemberId: lineReq.slotSelection?.staffMemberId ?? randomUUID(),
                  startsAt,
                  endsAt,
                }
              : {
                  bookingModel: 'capacity_session' as const,
                  sessionId:
                    lineReq.slotSelection?.sessionId ??
                    ((item.attributes as Record<string, unknown>)?.sessionId as string) ??
                    randomUUID(),
                  quantity: qty,
                };

          const holdResult = await this.bookingRepo.createHold({
            tenantId: resolvedTenantId,
            locationId: (tenant?.location as { id?: UUID } | undefined)?.id ?? randomUUID(),
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
        }

        await tx.insert(orderLines).values({
          id: lineId,
          tenantId: resolvedTenantId,
          orderId,
          catalogueItemId: item.id,
          itemType: item.itemType,
          fulfilmentType: item.fulfilmentType,
          titleSnapshot: item.name,
          quantity: qty,
          unitPriceMinor,
          lineTotalMinor,
          bookingId,
          lineStatus: 'pending',
        });

        runtimeLines.push({
          id: lineId,
          orderId,
          tenantId: resolvedTenantId,
          catalogueItemId: item.id,
          itemName: item.name,
          itemType: item.itemType,
          fulfilmentType: item.fulfilmentType,
          quantity: qty,
          unitLabel:
            ((item.attributes as Record<string, unknown>)?.unitLabel as string) ?? 'unit',
          unitPriceMinor,
          lineTotalMinor,
          lineStatus: 'pending',
          bookingId,
          bookingHoldToken,
        });

        subtotalMinor += lineTotalMinor;
      }

      // Insert master order
      await tx.insert(orders).values({
        id: orderId,
        tenantId: resolvedTenantId,
        orderNumber,
        customerName: input.customer.fullName,
        customerPhone: input.customer.phone,
        customerEmail: input.customer.email,
        status: 'awaiting_payment',
        paymentStatus: 'unpaid',
        subtotalMinor,
        totalMinor: subtotalMinor,
        idempotencyKey: input.idempotencyKey,
        expiresAt,
      });

      // 3.4 Insert outbox event in same transaction
      await tx.insert(outboxEvents).values({
        id: randomUUID(),
        tenantId: resolvedTenantId,
        eventType: 'order.created',
        aggregateType: 'order',
        aggregateId: orderId,
        payload: {
          orderId,
          orderNumber,
          totalMinor: subtotalMinor,
          itemCount: runtimeLines.length,
        },
        idempotencyKey: `outbox-order-${orderId}`,
        status: 'pending',
      });

      const orderRecord: RuntimeOrderRecord = {
        id: orderId,
        orderNumber,
        tenantId: resolvedTenantId,
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
        totalMinor: subtotalMinor,
        currency: 'INR',
        idempotencyKey: input.idempotencyKey,
        expiresAtIso: expiresAt.toISOString(),
        lines: runtimeLines,
        createdAtIso: now.toISOString(),
        updatedAtIso: now.toISOString(),
      };

      if (input.autoConfirmPayment) {
        return this.confirmOrderPayment({
          tenantId: resolvedTenantId,
          orderId,
          paymentMethod: input.paymentMethod,
        });
      }

      return {
        order: orderRecord,
        fulfilments: [],
        entitlements: [],
        subscriptions: [],
      };
    });
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
    const now = input.confirmedAtMs ? new Date(input.confirmedAtMs) : new Date();

    return await this.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${input.tenantId}, true)`);

      const [order] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.id, input.orderId), eq(orders.tenantId, input.tenantId)))
        .limit(1);

      if (!order) {
        throw new AppError('NOT_FOUND', `Order '${input.orderId}' not found.`, 404);
      }

      if (order.paymentStatus === 'captured') {
        const full = await this.findOrderById(input.tenantId, input.orderId);
        return {
          order: full!,
          fulfilments: [],
          entitlements: [],
          subscriptions: [],
        };
      }

      if (order.expiresAt && order.expiresAt.getTime() <= now.getTime()) {
        await tx
          .update(orders)
          .set({ status: 'cancelled', paymentStatus: 'failed' })
          .where(eq(orders.id, input.orderId));
        throw new HoldExpiredError('Order reservation window expired.');
      }

      const lines = await tx
        .select()
        .from(orderLines)
        .where(and(eq(orderLines.orderId, input.orderId), eq(orderLines.tenantId, input.tenantId)));

      const createdFulfilments: RuntimeFulfilmentRecord[] = [];
      const createdEntitlements: RuntimeEntitlementRecord[] = [];
      const createdSubscriptions: RuntimeCustomerSubscription[] = [];

      for (const line of lines) {
        // 1. Commit physical inventory
        if (line.itemType === 'physical_product') {
          const updated = await tx
            .update(inventoryItems)
            .set({
              quantityOnHand: sql`${inventoryItems.quantityOnHand} - ${line.quantity}`,
              quantityReserved: sql`GREATEST(0, ${inventoryItems.quantityReserved} - ${line.quantity})`,
              updatedAt: now,
            })
            .where(
              and(
                eq(inventoryItems.catalogueItemId, line.catalogueItemId),
                eq(inventoryItems.tenantId, input.tenantId),
                gte(inventoryItems.quantityOnHand, line.quantity),
              ),
            )
            .returning();

          if (updated.length === 0) {
            throw new InsufficientStockError(`Insufficient stock to commit line '${line.titleSnapshot}'.`);
          }

          // Insert movement
          await tx.insert(inventoryMovements).values({
            id: randomUUID(),
            tenantId: input.tenantId,
            inventoryItemId: updated[0]!.id,
            movementType: 'sale_commit',
            deltaQuantity: -line.quantity,
            referenceId: order.orderNumber,
          });

          // Insert fulfilment
          const fulId = randomUUID();
          await tx.insert(fulfilments).values({
            id: fulId,
            tenantId: input.tenantId,
            orderId: order.id,
            orderLineId: line.id,
            method: 'local_delivery',
            status: 'pending',
          });

          createdFulfilments.push({
            id: fulId,
            tenantId: input.tenantId,
            orderId: order.id,
            orderLineId: line.id,
            catalogueItemId: line.catalogueItemId,
            itemName: line.titleSnapshot,
            quantity: line.quantity,
            unitLabel: 'unit',
            method: 'local_delivery',
            status: 'pending',
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            recipientAddress: order.shippingAddress ? JSON.stringify(order.shippingAddress) : '',
            trackingNumber: `TRK-${order.orderNumber}`,
            createdAtIso: now.toISOString(),
          });
        }

        // 2. Claim booking hold atomically (3.3 step 1)
        if (
          line.itemType === 'bookable_resource' ||
          line.itemType === 'service_appointment' ||
          line.itemType === 'capacity_session'
        ) {
          if (line.bookingId) {
            const updatedBookingItem = await tx
              .update(bookingItems)
              .set({ allocationStatus: 'consumed' })
              .where(
                and(
                  eq(bookingItems.bookingId, line.bookingId),
                  eq(bookingItems.allocationStatus, 'active'),
                ),
              )
              .returning();

            if (updatedBookingItem.length === 0) {
              throw new HoldExpiredError('Booking hold was already consumed or expired.');
            }

            const entId = randomUUID();
            await tx.insert(entitlements).values({
              id: entId,
              tenantId: input.tenantId,
              orderId: order.id,
              orderLineId: line.id,
              catalogueItemId: line.catalogueItemId,
              bookingId: line.bookingId,
              customerName: order.customerName,
              customerPhone: order.customerPhone,
              entitlementType: 'time_slot_access',
              validFrom: updatedBookingItem[0]!.startsAt,
              validUntil: updatedBookingItem[0]!.endsAt,
              status: 'active',
            });

            createdEntitlements.push({
              id: entId,
              tenantId: input.tenantId,
              orderId: order.id,
              orderLineId: line.id,
              catalogueItemId: line.catalogueItemId,
              itemName: line.titleSnapshot,
              bookingId: line.bookingId,
              customerName: order.customerName,
              customerPhone: order.customerPhone,
              entitlementType: 'time_slot_access',
              permissionTimeslotStartIso: updatedBookingItem[0]!.startsAt.toISOString(),
              permissionTimeslotEndIso: updatedBookingItem[0]!.endsAt.toISOString(),
              maxUsageCount: null,
              consumedUsageCount: 0,
              status: 'active',
              createdAtIso: now.toISOString(),
              updatedAtIso: now.toISOString(),
            });
          }
        }

        // 3. Digital Content Entitlement
        if (line.itemType === 'digital_content' || (line.itemType as string) === 'digital_course') {
          const entId = randomUUID();
          const validUntil = new Date(now.getTime() + 90 * 24 * 3600_000);
          await tx.insert(entitlements).values({
            id: entId,
            tenantId: input.tenantId,
            orderId: order.id,
            orderLineId: line.id,
            catalogueItemId: line.catalogueItemId,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            entitlementType: 'digital_content_access',
            validFrom: now,
            validUntil,
            status: 'active',
          });

          createdEntitlements.push({
            id: entId,
            tenantId: input.tenantId,
            orderId: order.id,
            orderLineId: line.id,
            catalogueItemId: line.catalogueItemId,
            itemName: line.titleSnapshot,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            entitlementType: 'digital_content_access',
            permissionTimeslotStartIso: now.toISOString(),
            permissionTimeslotEndIso: validUntil.toISOString(),
            maxUsageCount: null,
            consumedUsageCount: 0,
            status: 'active',
            createdAtIso: now.toISOString(),
            updatedAtIso: now.toISOString(),
          });
        }

        // 4. Recurring Subscription
        if (line.itemType === 'subscription_plan' || (line.itemType as string) === 'subscription_membership') {
          const subId = randomUUID();
          const periodEnd = new Date(now.getTime() + 30 * 24 * 3600_000);
          await tx.insert(customerSubscriptions).values({
            id: subId,
            tenantId: input.tenantId,
            catalogueItemId: line.catalogueItemId,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            status: 'active',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          });

          createdSubscriptions.push({
            id: subId,
            tenantId: input.tenantId,
            catalogueItemId: line.catalogueItemId,
            planName: line.titleSnapshot,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            priceMinor: line.unitPriceMinor,
            currency: 'INR',
            billingInterval: 'monthly',
            status: 'active',
            currentPeriodStartIso: now.toISOString(),
            currentPeriodEndIso: periodEnd.toISOString(),
            cancelAtPeriodEnd: false,
            linkedEntitlementId: randomUUID(),
            createdAtIso: now.toISOString(),
            updatedAtIso: now.toISOString(),
          });
        }

        await tx
          .update(orderLines)
          .set({ lineStatus: 'confirmed' })
          .where(eq(orderLines.id, line.id));
      }

      // Update order to confirmed & captured
      await tx
        .update(orders)
        .set({
          status: 'confirmed',
          paymentStatus: 'captured',
          updatedAt: now,
        })
        .where(eq(orders.id, input.orderId));

      // Outbox event in same transaction
      await tx.insert(outboxEvents).values({
        id: randomUUID(),
        tenantId: input.tenantId,
        eventType: 'order.payment_confirmed',
        aggregateType: 'order',
        aggregateId: input.orderId,
        payload: {
          orderId: input.orderId,
          orderNumber: order.orderNumber,
          paymentMethod: input.paymentMethod ?? 'upi',
          confirmedAtIso: now.toISOString(),
        },
        idempotencyKey: `outbox-order-confirm-${input.orderId}`,
        status: 'pending',
      });

      const fullOrder = await this.findOrderById(input.tenantId, input.orderId);
      return {
        order: fullOrder!,
        fulfilments: createdFulfilments,
        entitlements: createdEntitlements,
        subscriptions: createdSubscriptions,
      };
    });
  }
}
