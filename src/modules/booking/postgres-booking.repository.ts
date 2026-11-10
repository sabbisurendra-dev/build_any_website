import { randomUUID } from 'node:crypto';
import { eq, and, sql, desc } from 'drizzle-orm';
import { db, type AppDatabase } from '@/db';
import {
  bookings,
  bookingHolds,
  bookingItems,
  bookingSessions,
  customers,
  outboxEvents,
  payments,
  refunds,
  resources,
  services,
  staffMembers,
  tenants,
} from '@/db/schema';
import type { BookingRepositoryPort } from './booking.repository.port';
import type {
  BookingHoldResult,
  CreateBookingHoldCommand,
  RescheduleBookingCommand,
} from './booking.types';
import type {
  CatalogResourceEntity,
  CatalogServiceEntity,
  CatalogStaffEntity,
  CatalogSessionEntity,
  RuntimeBookingRecord,
  RuntimePaymentRecord,
  RuntimeRefundRecord,
} from '@/modules/persistence/runtime-store';
import type { MockTenant } from '@/lib/mock-data/mock-tenants';
import type { BookingStatus, CurrencyCode, PaymentStatus, UUID } from '@/types/domain';
import type { AuthenticatedActor } from '@/modules/auth/session.types';
import {
  AppError,
  SlotUnavailableError,
  SessionCapacityExceededError,
  HoldExpiredError,
} from '@/lib/errors';
import { applyIntervalBuffers, assertValidInterval } from '@/lib/datetime';

function isPostgresConflictOrExclusion(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const pgErr = err as { code?: string; message?: string; constraint?: string };
  // 23P01 = exclusion_violation, 40001 = serialization_failure, 40P01 = deadlock_detected
  if (pgErr.code === '23P01' || pgErr.code === '40001' || pgErr.code === '40P01') {
    return true;
  }
  const msg = String(pgErr.message || '').toLowerCase();
  return (
    msg.includes('exclusion') ||
    msg.includes('excl_booking_items') ||
    msg.includes('serialization failure') ||
    msg.includes('could not serialize access')
  );
}

export class PostgresBookingRepository implements BookingRepositoryPort {
  private readonly db: AppDatabase;

  constructor(database?: AppDatabase) {
    this.db = database ?? db;
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
      vertical: 'sports_turf',
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

  public async findResource(tenantId: UUID, resourceId: UUID): Promise<CatalogResourceEntity | null> {
    const [row] = await this.db
      .select()
      .from(resources)
      .where(and(eq(resources.id, resourceId), eq(resources.tenantId, tenantId)))
      .limit(1);

    if (!row) return null;

    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      type: row.resourceType,
      slotDurationMinutes: row.slotDurationMinutes,
      slotStepMinutes: row.slotStepMinutes,
      bufferBeforeMinutes: row.bufferBeforeMinutes,
      bufferAfterMinutes: row.bufferAfterMinutes,
      basePriceMinor: row.basePriceMinor,
      peakPriceMinor: row.basePriceMinor,
      description: row.description ?? '',
      operatingStartHour: 6,
      operatingEndHour: 23,
      operatingHoursLabel: '06:00 - 23:00',
      isActive: row.isActive,
    };
  }

  public async findService(tenantId: UUID, serviceId: UUID): Promise<CatalogServiceEntity | null> {
    const [row] = await this.db
      .select()
      .from(services)
      .where(and(eq(services.id, serviceId), eq(services.tenantId, tenantId)))
      .limit(1);

    if (!row) return null;

    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      description: row.description ?? '',
      durationMinutes: row.durationMinutes,
      bufferBeforeMinutes: row.bufferBeforeMinutes,
      bufferAfterMinutes: row.bufferAfterMinutes,
      priceMinor: row.priceMinor,
      isActive: row.isActive,
    };
  }

  public async findStaff(tenantId: UUID, staffMemberId: UUID): Promise<CatalogStaffEntity | null> {
    const [row] = await this.db
      .select()
      .from(staffMembers)
      .where(and(eq(staffMembers.id, staffMemberId), eq(staffMembers.tenantId, tenantId)))
      .limit(1);

    if (!row) return null;

    return {
      id: row.id,
      tenantId: row.tenantId,
      displayName: row.displayName,
      specialty: row.title ?? '',
      serviceIds: [],
      workingStartHour: 9,
      workingEndHour: 18,
      exceptions: [],
      isActive: row.isActive,
    };
  }

  public async findSession(tenantId: UUID, sessionId: UUID): Promise<CatalogSessionEntity | null> {
    const [row] = await this.db
      .select()
      .from(bookingSessions)
      .where(and(eq(bookingSessions.id, sessionId), eq(bookingSessions.tenantId, tenantId)))
      .limit(1);

    if (!row) return null;

    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.title,
      instructorName: 'Instructor',
      description: '',
      dateLocal: row.startsAt.toISOString().slice(0, 10),
      startTime: row.startsAt.toISOString().slice(11, 16),
      endTime: row.endsAt.toISOString().slice(11, 16),
      maxCapacity: row.maxCapacity,
      bookedCount: row.bookedCount,
      heldCount: row.heldCount,
      priceMinor: row.priceMinor,
      isActive: true,
    };
  }

  public async findBookingById(tenantId: UUID, bookingId: UUID): Promise<RuntimeBookingRecord | null> {
    const [b] = await this.db
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, bookingId), eq(bookings.tenantId, tenantId)))
      .limit(1);

    if (!b) return null;

    const [hold] = await this.db
      .select()
      .from(bookingHolds)
      .where(eq(bookingHolds.bookingId, b.id))
      .limit(1);

    const [item] = await this.db
      .select()
      .from(bookingItems)
      .where(eq(bookingItems.bookingId, b.id))
      .limit(1);

    return {
      bookingId: b.id,
      bookingNumber: b.bookingNumber,
      tenantId: b.tenantId,
      locationId: b.locationId,
      bookingModel: b.bookingModel,
      idempotencyKey: b.idempotencyKey,
      payloadFingerprint: '',
      holdId: hold?.id ?? randomUUID(),
      holdToken: hold?.holdToken ?? '',
      status: b.status as BookingStatus,
      paymentStatus: (b.paymentStatus === 'partially_paid' || b.paymentStatus === 'refund_pending'
        ? 'pending'
        : b.paymentStatus) as RuntimeBookingRecord['paymentStatus'],
      paymentMethod: 'unknown',
      expiresAtIso: hold?.expiresAt ? hold.expiresAt.toISOString() : new Date().toISOString(),
      totalMinor: b.totalMinor,
      currency: 'INR',
      customerName: b.customerSnapshot?.fullName ?? '',
      customerPhone: b.customerSnapshot?.phone ?? '',
      customerEmail: b.customerSnapshot?.email,
      resourceOrServiceName: '',
      dateLocal: item?.startsAt ? item.startsAt.toISOString().slice(0, 10) : '',
      startTime: item?.startsAt ? item.startsAt.toISOString().slice(11, 16) : '',
      endTime: item?.endsAt ? item.endsAt.toISOString().slice(11, 16) : '',
      startsAtIso: item?.startsAt ? item.startsAt.toISOString() : '',
      endsAtIso: item?.endsAt ? item.endsAt.toISOString() : '',
      quantity: item?.quantity ?? 1,
      allocationId: item?.id ?? randomUUID(),
      createdAtIso: b.createdAt.toISOString(),
    };
  }

  public async findBookingByIdempotency(
    tenantId: UUID,
    idempotencyKey: string,
  ): Promise<RuntimeBookingRecord | null> {
    const [b] = await this.db
      .select()
      .from(bookings)
      .where(and(eq(bookings.tenantId, tenantId), eq(bookings.idempotencyKey, idempotencyKey)))
      .limit(1);

    if (!b) return null;
    return this.findBookingById(tenantId, b.id);
  }

  public async listBookings(
    tenantId: UUID,
    filter?: { status?: BookingStatus; dateLocal?: string; locationId?: UUID },
  ): Promise<RuntimeBookingRecord[]> {
    const query = this.db.select().from(bookings).where(eq(bookings.tenantId, tenantId));
    const rows = await query.orderBy(desc(bookings.createdAt)).limit(100);

    const results: RuntimeBookingRecord[] = [];
    for (const b of rows) {
      if (filter?.status && b.status !== filter.status) continue;
      const full = await this.findBookingById(tenantId, b.id);
      if (full) results.push(full);
    }
    return results;
  }

  /**
   * 3.2 Transactional Hold Creation inside Drizzle / Postgres transaction.
   * Enforces:
   * 1. Check capacity / existing active holds (SELECT ... FOR UPDATE).
   * 2. Insert booking_item with allocation_status = 'active' and expires_at.
   * 3. Catches GiST exclusion violation (23P01 / serialization failure) -> returns 409 Conflict.
   * 4. Inserts transactional outbox event inside the same transaction.
   */
  public async createHold(
    command: CreateBookingHoldCommand,
    _options?: { excludeAllocationId?: UUID },
  ): Promise<BookingHoldResult> {
    const tenant = await this.resolveTenant(command.tenantId);
    const resolvedTenantId = tenant?.id ?? command.tenantId;
    const { selection, customer, idempotencyKey } = command;

    // 1. Idempotency Check
    const existing = await this.findBookingByIdempotency(resolvedTenantId, idempotencyKey);
    if (existing) {
      return {
        bookingId: existing.bookingId,
        bookingNumber: existing.bookingNumber,
        holdId: existing.holdId,
        holdToken: existing.holdToken,
        status: existing.status,
        expiresAt: new Date(existing.expiresAtIso),
        totalMinor: existing.totalMinor,
        currency: existing.currency,
      };
    }

    const now = new Date();
    const ttlSeconds = Number(process.env.BOOKING_HOLD_TTL_SECONDS) || 480;
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
    const bookingId = randomUUID();
    const holdId = randomUUID();
    const holdToken = `ht_${randomUUID().replace(/-/g, '')}`;
    const seq = Math.floor(1000 + Math.random() * 9000);
    const bookingNumber = `BK-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${seq}`;

    try {
      return await this.db.transaction(async (tx) => {
        // Scoped tenant setting for PgBouncer
        await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${resolvedTenantId}, true)`);

        let totalMinor = 0;
        let startsAt: Date;
        let endsAt: Date;
        let bufferStartsAt: Date;
        let bufferEndsAt: Date;
        let resourceId: UUID | undefined;
        let serviceId: UUID | undefined;
        let staffMemberId: UUID | undefined;
        let sessionId: UUID | undefined;
        let quantity = 1;

        if (selection.bookingModel === 'exclusive_resource') {
          resourceId = selection.resourceId;
          serviceId = selection.serviceId;
          startsAt = selection.startsAt;
          endsAt = selection.endsAt;
          assertValidInterval({ startsAt, endsAt });

          const [resource] = await tx
            .select()
            .from(resources)
            .where(and(eq(resources.id, resourceId), eq(resources.tenantId, resolvedTenantId)))
            .limit(1);

          if (!resource) {
            throw new AppError('NOT_FOUND', 'Requested court or facility does not exist.', 404);
          }
          if (!resource.isActive) {
            throw new SlotUnavailableError(`${resource.name} is currently unavailable.`);
          }

          const buffered = applyIntervalBuffers(
            { startsAt, endsAt },
            resource.bufferBeforeMinutes,
            resource.bufferAfterMinutes,
          );
          bufferStartsAt = buffered.startsAt;
          bufferEndsAt = buffered.endsAt;

          const durationMin = Math.round((endsAt.getTime() - startsAt.getTime()) / 60_000);
          totalMinor = Math.round((resource.basePriceMinor * durationMin) / 60);
        } else if (selection.bookingModel === 'staff_appointment') {
          serviceId = selection.serviceId;
          staffMemberId = selection.staffMemberId;
          startsAt = selection.startsAt;
          endsAt = selection.endsAt;
          assertValidInterval({ startsAt, endsAt });

          const [service] = await tx
            .select()
            .from(services)
            .where(and(eq(services.id, serviceId), eq(services.tenantId, resolvedTenantId)))
            .limit(1);

          if (!service) {
            throw new AppError('NOT_FOUND', 'Service was not found.', 404);
          }

          const [staff] = await tx
            .select()
            .from(staffMembers)
            .where(and(eq(staffMembers.id, staffMemberId), eq(staffMembers.tenantId, resolvedTenantId)))
            .limit(1);

          if (!staff) {
            throw new AppError('NOT_FOUND', 'Staff member was not found.', 404);
          }

          const buffered = applyIntervalBuffers(
            { startsAt, endsAt },
            service.bufferBeforeMinutes,
            service.bufferAfterMinutes,
          );
          bufferStartsAt = buffered.startsAt;
          bufferEndsAt = buffered.endsAt;
          totalMinor = service.priceMinor;
        } else {
          sessionId = selection.sessionId;
          quantity = selection.quantity;

          // Model C: SELECT ... FOR UPDATE on session to guarantee capacity
          const [sessionRow] = await tx
            .select()
            .from(bookingSessions)
            .where(and(eq(bookingSessions.id, sessionId), eq(bookingSessions.tenantId, resolvedTenantId)))
            .for('update');

          if (!sessionRow || sessionRow.status === 'cancelled') {
            throw new AppError('NOT_FOUND', 'Group class session not found.', 404);
          }

          const remaining = sessionRow.maxCapacity - (sessionRow.bookedCount + sessionRow.heldCount);
          if (quantity > remaining) {
            throw new SessionCapacityExceededError(
              `Insufficient class capacity. Remaining seats: ${Math.max(0, remaining)}.`,
            );
          }

          // Atomically reserve held count
          await tx
            .update(bookingSessions)
            .set({
              heldCount: sessionRow.heldCount + quantity,
            })
            .where(eq(bookingSessions.id, sessionId));

          startsAt = new Date();
          endsAt = new Date(startsAt.getTime() + 3600_000);
          bufferStartsAt = startsAt;
          bufferEndsAt = endsAt;
          totalMinor = sessionRow.priceMinor * quantity;
        }

        // Upsert customer record
        let customerId: string = randomUUID();
        const [existingCustomer] = await tx
          .select()
          .from(customers)
          .where(and(eq(customers.tenantId, resolvedTenantId), eq(customers.phone, customer.phone)))
          .limit(1);

        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          await tx.insert(customers).values({
            id: customerId,
            tenantId: resolvedTenantId,
            fullName: customer.fullName,
            phone: customer.phone,
            email: customer.email,
          });
        }

        // Insert master booking record
        await tx.insert(bookings).values({
          id: bookingId,
          tenantId: resolvedTenantId,
          locationId: command.locationId,
          customerId,
          bookingNumber,
          bookingModel: selection.bookingModel,
          status: 'temporarily_held',
          paymentStatus: 'unpaid',
          idempotencyKey,
          subtotalMinor: totalMinor,
          totalMinor,
          customerSnapshot: {
            fullName: customer.fullName,
            phone: customer.phone,
            email: customer.email,
          },
        });

        // Insert booking hold record
        await tx.insert(bookingHolds).values({
          id: holdId,
          tenantId: resolvedTenantId,
          bookingId,
          holdToken,
          idempotencyKey,
          status: 'active',
          expiresAt,
        });

        // Insert concrete booking item (enforces GiST exclusion!)
        await tx.insert(bookingItems).values({
          id: randomUUID(),
          tenantId: resolvedTenantId,
          bookingId,
          serviceId,
          resourceId,
          staffMemberId,
          sessionId,
          quantity,
          startsAt,
          endsAt,
          bufferStartsAt,
          bufferEndsAt,
          allocationStatus: 'active',
          unitPriceMinor: totalMinor / quantity,
          totalPriceMinor: totalMinor,
        });

        // 3.4 Outbox event in same transaction
        await tx.insert(outboxEvents).values({
          id: randomUUID(),
          tenantId: resolvedTenantId,
          eventType: 'booking.hold_created',
          aggregateType: 'booking',
          aggregateId: bookingId,
          payload: {
            bookingId,
            bookingNumber,
            holdToken,
            expiresAtIso: expiresAt.toISOString(),
            totalMinor,
          },
          idempotencyKey: `outbox-hold-${bookingId}`,
          status: 'pending',
        });

        return {
          bookingId,
          bookingNumber,
          holdId,
          holdToken,
          status: 'temporarily_held',
          expiresAt,
          totalMinor,
          currency: 'INR',
        };
      });
    } catch (err) {
      if (isPostgresConflictOrExclusion(err)) {
        throw new SlotUnavailableError(
          'The selected court or facility slot is already held or booked by another customer.',
        );
      }
      throw err;
    }
  }

  public async claimHold(tenantId: UUID, bookingId: UUID, holdToken: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`);

      // 1. Verify hold token and status
      const [hold] = await tx
        .select()
        .from(bookingHolds)
        .where(
          and(
            eq(bookingHolds.bookingId, bookingId),
            eq(bookingHolds.tenantId, tenantId),
            eq(bookingHolds.holdToken, holdToken),
          ),
        )
        .limit(1);

      if (!hold) {
        throw new AppError('NOT_FOUND', 'Valid booking hold was not found.', 404);
      }
      if (hold.status !== 'active' || hold.expiresAt.getTime() <= Date.now()) {
        throw new HoldExpiredError('Booking hold has expired or was already claimed.');
      }

      // 2. Claim booking item atomically
      const updated = await tx
        .update(bookingItems)
        .set({ allocationStatus: 'consumed' })
        .where(
          and(
            eq(bookingItems.bookingId, bookingId),
            eq(bookingItems.allocationStatus, 'active'),
          ),
        )
        .returning();

      if (updated.length === 0) {
        throw new HoldExpiredError('Slot hold was already claimed or released.');
      }

      // 3. Update hold and booking
      await tx
        .update(bookingHolds)
        .set({ status: 'converted', convertedAt: new Date() })
        .where(eq(bookingHolds.id, hold.id));

      await tx
        .update(bookings)
        .set({ status: 'confirmed' })
        .where(eq(bookings.id, bookingId));
    });
  }

  public async releaseHold(tenantId: UUID, bookingId: UUID, _holdToken?: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`);

      await tx
        .update(bookingItems)
        .set({ allocationStatus: 'released' })
        .where(
          and(
            eq(bookingItems.bookingId, bookingId),
            eq(bookingItems.allocationStatus, 'active'),
          ),
        );

      await tx
        .update(bookingHolds)
        .set({ status: 'released', releasedAt: new Date() })
        .where(eq(bookingHolds.bookingId, bookingId));

      await tx
        .update(bookings)
        .set({ status: 'cancelled', cancellationReason: 'Hold released or expired.' })
        .where(eq(bookings.id, bookingId));
    });
  }

  public async confirmBooking(
    tenantId: UUID,
    bookingId: UUID,
    paymentDetails: {
      paymentId?: UUID;
      paymentMethod?: 'upi' | 'card' | 'cash';
      amountPaidMinor?: number;
    },
  ): Promise<RuntimeBookingRecord> {
    await this.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`);

      await tx
        .update(bookingItems)
        .set({ allocationStatus: 'consumed' })
        .where(eq(bookingItems.bookingId, bookingId));

      await tx
        .update(bookings)
        .set({
          status: 'confirmed',
          paymentStatus: 'paid',
          amountPaidMinor: paymentDetails.amountPaidMinor ?? undefined,
          confirmedAt: new Date(),
        })
        .where(eq(bookings.id, bookingId));

      // Outbox event in same transaction
      await tx.insert(outboxEvents).values({
        id: randomUUID(),
        tenantId,
        eventType: 'booking.confirmed',
        aggregateType: 'booking',
        aggregateId: bookingId,
        payload: {
          bookingId,
          paymentMethod: paymentDetails.paymentMethod ?? 'upi',
          confirmedAtIso: new Date().toISOString(),
        },
        idempotencyKey: `outbox-confirm-${bookingId}`,
        status: 'pending',
      });
    });

    const b = await this.findBookingById(tenantId, bookingId);
    if (!b) throw new AppError('NOT_FOUND', 'Booking was not found.', 404);
    return b;
  }

  public async rescheduleBooking(command: RescheduleBookingCommand): Promise<BookingHoldResult> {
    const booking = await this.findBookingById(command.tenantId, command.bookingId);
    if (!booking) throw new AppError('NOT_FOUND', 'Booking not found.', 404);

    await this.releaseHold(command.tenantId, command.bookingId);

    return this.createHold({
      tenantId: command.tenantId,
      locationId: booking.locationId,
      idempotencyKey: command.idempotencyKey,
      selection: command.newSelection,
      customer: {
        fullName: booking.customerName,
        phone: booking.customerPhone,
        email: booking.customerEmail,
      },
    });
  }

  public async cancelBooking(
    tenantId: UUID,
    bookingId: UUID,
    reason?: string,
    _actor?: AuthenticatedActor,
  ): Promise<RuntimeBookingRecord> {
    await this.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`);

      await tx
        .update(bookingItems)
        .set({ allocationStatus: 'cancelled' })
        .where(eq(bookingItems.bookingId, bookingId));

      await tx
        .update(bookings)
        .set({
          status: 'cancelled',
          cancellationReason: reason ?? 'Cancelled by customer or staff.',
          cancelledAt: new Date(),
        })
        .where(eq(bookings.id, bookingId));

      await tx.insert(outboxEvents).values({
        id: randomUUID(),
        tenantId,
        eventType: 'booking.cancelled',
        aggregateType: 'booking',
        aggregateId: bookingId,
        payload: { bookingId, reason },
        idempotencyKey: `outbox-cancel-${bookingId}`,
        status: 'pending',
      });
    });

    const b = await this.findBookingById(tenantId, bookingId);
    if (!b) throw new AppError('NOT_FOUND', 'Booking not found.', 404);
    return b;
  }

  public async savePayment(payment: RuntimePaymentRecord): Promise<void> {
    await this.db.insert(payments).values({
      id: payment.paymentId,
      tenantId: payment.tenantId,
      bookingId: payment.bookingId,
      provider: payment.provider,
      providerOrderId: payment.providerOrderId,
      providerPaymentId: payment.providerPaymentId,
      idempotencyKey: payment.idempotencyKey,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      status: ((payment.status as string) === 'paid' ? 'captured' : payment.status) as typeof payments.$inferInsert['status'],
    }).onConflictDoNothing();
  }

  public async saveRefund(refund: RuntimeRefundRecord): Promise<void> {
    await this.db.insert(refunds).values({
      id: refund.refundId,
      tenantId: refund.tenantId,
      bookingId: refund.bookingId,
      paymentId: refund.paymentId,
      providerRefundId: refund.providerRefundId,
      amountMinor: refund.amountMinor,
      reason: refund.reason,
      idempotencyKey: randomUUID(),
      status: 'processed',
    }).onConflictDoNothing();
  }

  public async findPayment(tenantId: UUID, paymentId: UUID): Promise<RuntimePaymentRecord | null> {
    const [p] = await this.db
      .select()
      .from(payments)
      .where(and(eq(payments.id, paymentId), eq(payments.tenantId, tenantId)))
      .limit(1);

    if (!p) return null;

    return {
      paymentId: p.id,
      tenantId: p.tenantId,
      bookingId: p.bookingId,
      provider: p.provider as RuntimePaymentRecord['provider'],
      providerOrderId: p.providerOrderId,
      providerPaymentId: p.providerPaymentId ?? undefined,
      amountMinor: p.amountMinor,
      currency: p.currency as CurrencyCode,
      status: (p.status === 'captured' ? 'paid' : p.status) as PaymentStatus,
      idempotencyKey: p.idempotencyKey,
      createdAtIso: p.createdAt.toISOString(),
    };
  }
}
