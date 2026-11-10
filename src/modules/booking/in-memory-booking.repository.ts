import { randomUUID } from 'node:crypto';
import type { BookingRepositoryPort } from './booking.repository.port';
import type {
  BookingHoldResult,
  BookingSelectionTarget,
  CreateBookingHoldCommand,
  RescheduleBookingCommand,
} from './booking.types';
import {
  RuntimeStateRepository,
  type CatalogResourceEntity,
  type CatalogServiceEntity,
  type CatalogStaffEntity,
  type CatalogSessionEntity,
  type RuntimeAllocation,
  type RuntimeBookingRecord,
  type RuntimePaymentRecord,
  type RuntimeRefundRecord,
} from '@/modules/persistence/runtime-store';
import type { MockTenant } from '@/lib/mock-data/mock-tenants';
import type { BookingStatus, UUID } from '@/types/domain';
import type { AuthenticatedActor } from '@/modules/auth/session.types';
import {
  AppError,
  SlotUnavailableError,
  SessionCapacityExceededError,
  HoldExpiredError,
} from '@/lib/errors';
import { applyIntervalBuffers, assertValidInterval } from '@/lib/datetime';
import { computePayloadFingerprint } from '@/lib/idempotency';

function formatIstWallClock(date: Date): {
  dateLocal: string;
  timeHm: string;
  minutesFromMidnight: number;
} {
  const istMs = date.getTime() + 330 * 60_000;
  const ist = new Date(istMs);
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const d = String(ist.getUTCDate()).padStart(2, '0');
  const hh = ist.getUTCHours();
  const mm = ist.getUTCMinutes();
  return {
    dateLocal: `${y}-${m}-${d}`,
    timeHm: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
    minutesFromMidnight: hh * 60 + mm,
  };
}

function canonicalizeSelectionForFingerprint(
  selection: BookingSelectionTarget,
): Record<string, unknown> {
  if (selection.bookingModel === 'exclusive_resource') {
    return {
      bookingModel: selection.bookingModel,
      resourceId: selection.resourceId,
      serviceId: selection.serviceId ?? null,
      startsAtMs: selection.startsAt.getTime(),
      endsAtMs: selection.endsAt.getTime(),
    };
  }
  if (selection.bookingModel === 'staff_appointment') {
    return {
      bookingModel: selection.bookingModel,
      serviceId: selection.serviceId,
      staffMemberId: selection.staffMemberId,
      startsAtMs: selection.startsAt.getTime(),
      endsAtMs: selection.endsAt.getTime(),
    };
  }
  return {
    bookingModel: selection.bookingModel,
    sessionId: selection.sessionId,
    quantity: selection.quantity,
  };
}

export class InMemoryBookingRepository implements BookingRepositoryPort {
  public async resolveTenant(tenantIdOrSlug: string): Promise<MockTenant | null> {
    const state = RuntimeStateRepository.getState();
    const tenant = state.tenants.find(
      (t) => t.id === tenantIdOrSlug || t.slug === tenantIdOrSlug,
    );
    return tenant ?? null;
  }

  public async findResource(tenantId: UUID, resourceId: UUID): Promise<CatalogResourceEntity | null> {
    const state = RuntimeStateRepository.getState();
    const res = state.resources.find((r) => r.id === resourceId && r.tenantId === tenantId);
    return res ?? null;
  }

  public async findService(tenantId: UUID, serviceId: UUID): Promise<CatalogServiceEntity | null> {
    const state = RuntimeStateRepository.getState();
    const srv = state.services.find((s) => s.id === serviceId && s.tenantId === tenantId);
    return srv ?? null;
  }

  public async findStaff(tenantId: UUID, staffMemberId: UUID): Promise<CatalogStaffEntity | null> {
    const state = RuntimeStateRepository.getState();
    const staff = state.staffMembers.find((st) => st.id === staffMemberId && st.tenantId === tenantId);
    return staff ?? null;
  }

  public async findSession(tenantId: UUID, sessionId: UUID): Promise<CatalogSessionEntity | null> {
    const state = RuntimeStateRepository.getState();
    const sess = state.sessions.find((s) => s.id === sessionId && s.tenantId === tenantId);
    return sess ?? null;
  }

  public async findBookingById(tenantId: UUID, bookingId: UUID): Promise<RuntimeBookingRecord | null> {
    const state = RuntimeStateRepository.getState();
    const b = state.bookings.find((bk) => bk.bookingId === bookingId && bk.tenantId === tenantId);
    return b ?? null;
  }

  public async findBookingByIdempotency(
    tenantId: UUID,
    idempotencyKey: string,
  ): Promise<RuntimeBookingRecord | null> {
    const state = RuntimeStateRepository.getState();
    const b = state.bookings.find(
      (bk) => bk.tenantId === tenantId && bk.idempotencyKey === idempotencyKey,
    );
    return b ?? null;
  }

  public async listBookings(
    tenantId: UUID,
    filter?: { status?: BookingStatus; dateLocal?: string; locationId?: UUID },
  ): Promise<RuntimeBookingRecord[]> {
    const state = RuntimeStateRepository.getState();
    return state.bookings.filter((b) => {
      if (b.tenantId !== tenantId) return false;
      if (filter?.status && b.status !== filter.status) return false;
      if (filter?.dateLocal && b.dateLocal !== filter.dateLocal) return false;
      if (filter?.locationId && b.locationId !== filter.locationId) return false;
      return true;
    });
  }

  public async createHold(
    command: CreateBookingHoldCommand,
    options?: { excludeAllocationId?: UUID },
  ): Promise<BookingHoldResult> {
    const state = RuntimeStateRepository.getState();
    const tenant = await this.resolveTenant(command.tenantId);
    const resolvedTenantId = tenant?.id ?? command.tenantId;
    const { locationId, idempotencyKey, selection, customer } = command;

    const payloadFingerprint = computePayloadFingerprint({
      tenantId: resolvedTenantId,
      ...canonicalizeSelectionForFingerprint(selection),
    });

    const existing = state.bookings.find(
      (b) => b.tenantId === resolvedTenantId && b.idempotencyKey === idempotencyKey,
    );
    if (existing) {
      if (existing.payloadFingerprint !== payloadFingerprint) {
        throw new AppError(
          'IDEMPOTENCY_CONFLICT',
          'This Idempotency-Key was already used with different booking parameters.',
          409,
        );
      }
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

    const nowMs = Date.now();
    const ttlSeconds = Number(process.env.BOOKING_HOLD_TTL_SECONDS) || 480;
    const expiresAtMs = nowMs + ttlSeconds * 1000;
    const expiresAt = new Date(expiresAtMs);

    this.sweepExpiredAllocations(nowMs);

    const allocationId = randomUUID();
    const bookingId = randomUUID();
    let totalMinor = 0;
    let resourceOrServiceName = '';
    let staffName: string | undefined;
    let courtOrRoom: string | undefined;
    let dateLocal = '';
    let startTime = '';
    let endTime = '';
    let startsAtIso = '';
    let endsAtIso = '';
    let quantity = 1;
    let newAllocation: RuntimeAllocation;

    if (selection.bookingModel === 'exclusive_resource') {
      const { resourceId, startsAt, endsAt } = selection;
      assertValidInterval({ startsAt, endsAt });

      const resource = state.resources.find((r) => r.id === resourceId);
      if (!resource || resource.tenantId !== resolvedTenantId) {
        throw new AppError(
          'NOT_FOUND',
          'Requested court or facility does not belong to this business.',
          404,
        );
      }
      if (!resource.isActive) {
        throw new SlotUnavailableError(
          `${resource.name} is currently unavailable or closed for maintenance.`,
        );
      }

      const buffered = applyIntervalBuffers(
        { startsAt, endsAt },
        resource.bufferBeforeMinutes,
        resource.bufferAfterMinutes,
      );
      const bufStartMs = buffered.startsAt.getTime();
      const bufEndMs = buffered.endsAt.getTime();

      for (const alloc of state.allocations) {
        if (options?.excludeAllocationId && alloc.id === options.excludeAllocationId) {
          continue;
        }
        if (
          alloc.resourceId === resourceId &&
          (alloc.status === 'held' || alloc.status === 'confirmed')
        ) {
          const overlaps =
            Math.max(bufStartMs, alloc.bufferStartsAtMs) <
            Math.min(bufEndMs, alloc.bufferEndsAtMs);
          if (overlaps) {
            throw new SlotUnavailableError(
              'The selected court or facility slot is already held or booked by another customer.',
            );
          }
        }
      }

      const startWall = formatIstWallClock(startsAt);
      const endWall = formatIstWallClock(endsAt);
      const durationMin = Math.round((endsAt.getTime() - startsAt.getTime()) / 60_000);
      const startHourIst = Math.floor(startWall.minutesFromMidnight / 60);
      const hourlyPrice =
        startHourIst >= 18 ? resource.peakPriceMinor : resource.basePriceMinor;

      totalMinor = Math.round((hourlyPrice * durationMin) / 60);
      resourceOrServiceName = resource.name;
      courtOrRoom = resource.name;
      dateLocal = startWall.dateLocal;
      startTime = startWall.timeHm;
      endTime = endWall.timeHm;
      startsAtIso = startsAt.toISOString();
      endsAtIso = endsAt.toISOString();

      newAllocation = {
        id: allocationId,
        tenantId: resolvedTenantId,
        bookingId,
        bookingModel: 'exclusive_resource',
        resourceId,
        serviceId: selection.serviceId,
        quantity: 1,
        startsAtMs: startsAt.getTime(),
        endsAtMs: endsAt.getTime(),
        bufferStartsAtMs: bufStartMs,
        bufferEndsAtMs: bufEndMs,
        expiresAtMs,
        status: 'held',
      };
    } else if (selection.bookingModel === 'staff_appointment') {
      const { serviceId, staffMemberId, startsAt, endsAt } = selection;
      assertValidInterval({ startsAt, endsAt });

      const service = state.services.find((s) => s.id === serviceId);
      if (!service || service.tenantId !== resolvedTenantId || !service.isActive) {
        throw new AppError(
          'NOT_FOUND',
          'Service is unavailable or does not belong to this business.',
          404,
        );
      }

      const staff = state.staffMembers.find((st) => st.id === staffMemberId);
      if (!staff || staff.tenantId !== resolvedTenantId || !staff.isActive) {
        throw new AppError(
          'NOT_FOUND',
          'Staff member was not found for this business.',
          404,
        );
      }

      const buffered = applyIntervalBuffers(
        { startsAt, endsAt },
        service.bufferBeforeMinutes,
        service.bufferAfterMinutes,
      );
      const bufStartMs = buffered.startsAt.getTime();
      const bufEndMs = buffered.endsAt.getTime();

      for (const alloc of state.allocations) {
        if (options?.excludeAllocationId && alloc.id === options.excludeAllocationId) {
          continue;
        }
        if (
          alloc.staffMemberId === staffMemberId &&
          (alloc.status === 'held' || alloc.status === 'confirmed')
        ) {
          const overlaps =
            Math.max(bufStartMs, alloc.bufferStartsAtMs) <
            Math.min(bufEndMs, alloc.bufferEndsAtMs);
          if (overlaps) {
            throw new SlotUnavailableError(
              `${staff.displayName} is already booked (or in turnaround buffer) during this time window.`,
            );
          }
        }
      }

      const startWall = formatIstWallClock(startsAt);
      const endWall = formatIstWallClock(endsAt);

      totalMinor = service.priceMinor;
      resourceOrServiceName = service.name;
      staffName = staff.displayName;
      courtOrRoom = staff.displayName;
      dateLocal = startWall.dateLocal;
      startTime = startWall.timeHm;
      endTime = endWall.timeHm;
      startsAtIso = startsAt.toISOString();
      endsAtIso = endsAt.toISOString();

      newAllocation = {
        id: allocationId,
        tenantId: resolvedTenantId,
        bookingId,
        bookingModel: 'staff_appointment',
        serviceId,
        staffMemberId,
        quantity: 1,
        startsAtMs: startsAt.getTime(),
        endsAtMs: endsAt.getTime(),
        bufferStartsAtMs: bufStartMs,
        bufferEndsAtMs: bufEndMs,
        expiresAtMs,
        status: 'held',
      };
    } else {
      const { sessionId, quantity: requestedQty } = selection;
      if (!Number.isInteger(requestedQty) || requestedQty < 1 || requestedQty > 20) {
        throw new AppError(
          'VALIDATION_ERROR',
          'Session booking quantity must be an integer between 1 and 20.',
          400,
        );
      }

      const session = state.sessions.find((s) => s.id === sessionId);
      if (!session || session.tenantId !== resolvedTenantId || !session.isActive) {
        throw new AppError(
          'NOT_FOUND',
          'Requested group class session was not found for this business.',
          404,
        );
      }

      const remaining = session.maxCapacity - (session.bookedCount + session.heldCount);
      if (requestedQty > remaining) {
        throw new SessionCapacityExceededError(
          `Insufficient class capacity. Remaining seats: ${Math.max(0, remaining)}.`,
        );
      }

      session.heldCount += requestedQty;
      const todayIst = formatIstWallClock(new Date(nowMs)).dateLocal;
      const effectiveDate = session.dateLocal === '*' ? todayIst : session.dateLocal;

      const parts = session.startTime.split(':').map(Number);
      const endParts = session.endTime.split(':').map(Number);
      const startH = parts[0] ?? 0;
      const startM = parts[1] ?? 0;
      const endH = endParts[0] ?? 0;
      const endM = endParts[1] ?? 0;
      const sessionStartsAt = new Date(`${effectiveDate}T00:00:00+05:30`);
      sessionStartsAt.setMinutes(startH * 60 + startM);
      const sessionEndsAt = new Date(`${effectiveDate}T00:00:00+05:30`);
      sessionEndsAt.setMinutes(endH * 60 + endM);

      totalMinor = session.priceMinor * requestedQty;
      resourceOrServiceName = session.name;
      staffName = session.instructorName;
      courtOrRoom = session.name;
      dateLocal = effectiveDate;
      startTime = session.startTime;
      endTime = session.endTime;
      startsAtIso = sessionStartsAt.toISOString();
      endsAtIso = sessionEndsAt.toISOString();
      quantity = requestedQty;

      newAllocation = {
        id: allocationId,
        tenantId: resolvedTenantId,
        bookingId,
        bookingModel: 'capacity_session',
        sessionId,
        quantity: requestedQty,
        startsAtMs: sessionStartsAt.getTime(),
        endsAtMs: sessionEndsAt.getTime(),
        bufferStartsAtMs: sessionStartsAt.getTime(),
        bufferEndsAtMs: sessionEndsAt.getTime(),
        expiresAtMs,
        status: 'held',
      };
    }

    const holdId = randomUUID();
    const holdToken = `ht_${randomUUID().replace(/-/g, '')}`;
    const seq = state.bookings.length + 1;
    const yearMonth = dateLocal.replace(/-/g, '').slice(0, 8);
    const bookingNumber = `BK-${yearMonth}-${String(seq).padStart(4, '0')}`;

    const record: RuntimeBookingRecord = {
      bookingId,
      bookingNumber,
      tenantId: resolvedTenantId,
      locationId,
      bookingModel: selection.bookingModel,
      idempotencyKey,
      payloadFingerprint,
      holdId,
      holdToken,
      status: 'temporarily_held',
      paymentStatus: 'pending',
      paymentMethod: 'unknown',
      expiresAtIso: expiresAt.toISOString(),
      totalMinor,
      currency: 'INR',
      customerName: customer.fullName,
      customerPhone: customer.phone,
      customerEmail: customer.email,
      notes: customer.notes,
      resourceOrServiceName,
      staffName,
      courtOrRoom,
      dateLocal,
      startTime,
      endTime,
      startsAtIso,
      endsAtIso,
      resourceId:
        selection.bookingModel === 'exclusive_resource' ? selection.resourceId : undefined,
      serviceId:
        selection.bookingModel === 'exclusive_resource'
          ? selection.serviceId
          : selection.bookingModel === 'staff_appointment'
          ? selection.serviceId
          : undefined,
      staffMemberId:
        selection.bookingModel === 'staff_appointment'
          ? selection.staffMemberId
          : undefined,
      sessionId:
        selection.bookingModel === 'capacity_session' ? selection.sessionId : undefined,
      quantity,
      allocationId,
      createdAtIso: new Date(nowMs).toISOString(),
    };

    state.allocations.push(newAllocation);
    state.bookings.unshift(record);
    RuntimeStateRepository.persist();

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
  }

  public async claimHold(tenantId: UUID, bookingId: UUID, holdToken: string): Promise<void> {
    const state = RuntimeStateRepository.getState();
    const booking = state.bookings.find(
      (b) => b.bookingId === bookingId && b.tenantId === tenantId,
    );
    if (!booking) {
      throw new AppError('NOT_FOUND', 'Booking record was not found.', 404);
    }
    if (booking.holdToken !== holdToken) {
      throw new AppError('VALIDATION_ERROR', 'Invalid hold token provided for booking claim.', 400);
    }
    const alloc = state.allocations.find((a) => a.bookingId === bookingId);
    if (!alloc || alloc.status !== 'held') {
      throw new HoldExpiredError('Hold has expired or was already claimed.');
    }
    alloc.status = 'confirmed';
    booking.status = 'confirmed';
    RuntimeStateRepository.persist();
  }

  public async releaseHold(tenantId: UUID, bookingId: UUID, _holdToken?: string): Promise<void> {
    const state = RuntimeStateRepository.getState();
    const alloc = state.allocations.find(
      (a) => a.bookingId === bookingId && a.tenantId === tenantId,
    );
    if (alloc && alloc.status === 'held') {
      alloc.status = 'released';
      if (alloc.bookingModel === 'capacity_session' && alloc.sessionId) {
        const sess = state.sessions.find((s) => s.id === alloc.sessionId);
        if (sess) {
          sess.heldCount = Math.max(0, sess.heldCount - alloc.quantity);
        }
      }
      RuntimeStateRepository.persist();
    }
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
    const state = RuntimeStateRepository.getState();
    const booking = state.bookings.find(
      (b) => b.bookingId === bookingId && b.tenantId === tenantId,
    );
    if (!booking) {
      throw new AppError('NOT_FOUND', 'Booking not found.', 404);
    }

    const alloc = state.allocations.find((a) => a.bookingId === bookingId);
    if (alloc && alloc.status === 'held') {
      alloc.status = 'confirmed';
      if (alloc.bookingModel === 'capacity_session' && alloc.sessionId) {
        const sess = state.sessions.find((s) => s.id === alloc.sessionId);
        if (sess) {
          sess.heldCount = Math.max(0, sess.heldCount - alloc.quantity);
          sess.bookedCount += alloc.quantity;
        }
      }
    }

    booking.status = 'confirmed';
    booking.paymentStatus = 'paid';
    booking.paymentMethod = paymentDetails.paymentMethod ?? 'upi';
    RuntimeStateRepository.persist();
    return booking;
  }

  public async rescheduleBooking(command: RescheduleBookingCommand): Promise<BookingHoldResult> {
    const state = RuntimeStateRepository.getState();
    const booking = state.bookings.find(
      (b) => b.bookingId === command.bookingId && b.tenantId === command.tenantId,
    );
    if (!booking) {
      throw new AppError('NOT_FOUND', 'Original booking not found.', 404);
    }

    // Release old allocation
    const oldAlloc = state.allocations.find((a) => a.bookingId === booking.bookingId);
    if (oldAlloc) {
      oldAlloc.status = 'released';
      if (oldAlloc.bookingModel === 'capacity_session' && oldAlloc.sessionId) {
        const sess = state.sessions.find((s) => s.id === oldAlloc.sessionId);
        if (sess) {
          sess.bookedCount = Math.max(0, sess.bookedCount - oldAlloc.quantity);
        }
      }
    }

    // Create new hold
    const hold = await this.createHold({
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

    return hold;
  }

  public async cancelBooking(
    tenantId: UUID,
    bookingId: UUID,
    _reason?: string,
    _actor?: AuthenticatedActor,
  ): Promise<RuntimeBookingRecord> {
    const state = RuntimeStateRepository.getState();
    const booking = state.bookings.find(
      (b) => b.bookingId === bookingId && b.tenantId === tenantId,
    );
    if (!booking) {
      throw new AppError('NOT_FOUND', 'Booking not found.', 404);
    }

    booking.status = 'cancelled';
    const alloc = state.allocations.find((a) => a.bookingId === bookingId);
    if (alloc) {
      alloc.status = 'released';
      if (alloc.bookingModel === 'capacity_session' && alloc.sessionId) {
        const sess = state.sessions.find((s) => s.id === alloc.sessionId);
        if (sess) {
          if (booking.paymentStatus === 'paid') {
            sess.bookedCount = Math.max(0, sess.bookedCount - alloc.quantity);
          } else {
            sess.heldCount = Math.max(0, sess.heldCount - alloc.quantity);
          }
        }
      }
    }

    RuntimeStateRepository.persist();
    return booking;
  }

  public async savePayment(payment: RuntimePaymentRecord): Promise<void> {
    const state = RuntimeStateRepository.getState();
    state.payments.push(payment);
    RuntimeStateRepository.persist();
  }

  public async saveRefund(refund: RuntimeRefundRecord): Promise<void> {
    const state = RuntimeStateRepository.getState();
    state.refunds.push(refund);
    RuntimeStateRepository.persist();
  }

  public async findPayment(tenantId: UUID, paymentId: UUID): Promise<RuntimePaymentRecord | null> {
    const state = RuntimeStateRepository.getState();
    const p = state.payments.find((pm) => pm.paymentId === paymentId && pm.tenantId === tenantId);
    return p ?? null;
  }

  public resetForTests(): void {
    RuntimeStateRepository.resetForTests(true);
  }

  private sweepExpiredAllocations(nowMs: number): void {
    const state = RuntimeStateRepository.getState();
    for (const alloc of state.allocations) {
      if (alloc.status === 'held' && alloc.expiresAtMs <= nowMs) {
        alloc.status = 'expired';
        if (alloc.bookingModel === 'capacity_session' && alloc.sessionId) {
          const sess = state.sessions.find((s) => s.id === alloc.sessionId);
          if (sess) {
            sess.heldCount = Math.max(0, sess.heldCount - alloc.quantity);
          }
        }
        const bk = state.bookings.find((b) => b.bookingId === alloc.bookingId);
        if (bk && bk.status === 'temporarily_held') {
          bk.status = 'expired';
        }
      }
    }
  }
}
