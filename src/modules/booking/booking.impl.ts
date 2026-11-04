import { randomUUID } from 'node:crypto';
import type { AuthenticatedActor } from '@/modules/auth/session.types';
import { assertTenantPermission } from '@/modules/auth/rbac';
import type { BookingStatus, PaymentProvider, UUID } from '@/types/domain';
import {
  SlotUnavailableError,
  SessionCapacityExceededError,
  HoldExpiredError,
  AppError,
} from '@/lib/errors';
import { applyIntervalBuffers, assertValidInterval } from '@/lib/datetime';
import { computePayloadFingerprint } from '@/lib/idempotency';
import type {
  BookingHoldResult,
  BookingSelectionTarget,
  CreateBookingHoldCommand,
  RescheduleBookingCommand,
} from './booking.types';
import type { BookingServicePort } from './booking.service';
import { SimulatedPaymentGatewayAdapter } from '@/modules/payments/simulated.adapter';
import { RazorpayGatewayAdapter } from '@/modules/payments/razorpay.adapter';
import { NotificationDispatcherImpl } from '@/modules/notifications/notification.impl';
import {
  RuntimeStateRepository,
  type RuntimeAllocation,
  type RuntimeBookingRecord,
  type RuntimePaymentRecord,
} from '@/modules/persistence/runtime-store';

function formatIstWallClock(date: Date): {
  dateLocal: string;
  timeHm: string;
  minutesFromMidnight: number;
} {
  // IST is UTC + 05:30 (330 minutes)
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

/**
 * Concurrency-Safe Booking Lifecycle Implementation backed by `RuntimeStateRepository`.
 *
 * Enforces:
 * - Model A (`exclusive_resource`): Half-open `[bufferStart, bufferEnd)` exclusion, active status, tenant ownership.
 * - Model B (`staff_appointment`): Service duration + pre/post buffers, staff working hours, break windows, holiday exceptions, half-open staff overlap exclusion.
 * - Model C (`capacity_session`): Atomic `bookedCount + heldCount + quantity <= maxCapacity` reservation & exact quantity release on cancel/expiry.
 * - Idempotency: Key replay returns identical hold; mutated payload on same key raises 409 `IDEMPOTENCY_CONFLICT`.
 * - Delayed Payment SAVEPOINT Reconciliation: Late webhook/payment after hold TTL re-acquires slot if still free, or marks `captured_requires_refund` and initiates automated refund if taken.
 */
export class BookingServiceImpl implements BookingServicePort {
  private simulatedGateway = new SimulatedPaymentGatewayAdapter();
  private razorpayGateway = new RazorpayGatewayAdapter();
  private notifications = new NotificationDispatcherImpl();

  private resolveTenantId(tenantIdOrSlug: string): UUID {
    const state = RuntimeStateRepository.getState();
    const tenant = state.tenants.find(
      (t) => t.id === tenantIdOrSlug || t.slug === tenantIdOrSlug,
    );
    return tenant?.id ?? tenantIdOrSlug;
  }

  public async createHold(
    command: CreateBookingHoldCommand,
    options?: { excludeAllocationId?: UUID },
  ): Promise<BookingHoldResult> {
    const state = RuntimeStateRepository.getState();
    const resolvedTenantId = this.resolveTenantId(command.tenantId);
    const { locationId, idempotencyKey, selection, customer } = command;

    const payloadFingerprint = computePayloadFingerprint({
      tenantId: resolvedTenantId,
      ...canonicalizeSelectionForFingerprint(selection),
    });

    // 1. Idempotency Check (scoped by tenantId + idempotencyKey)
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

    // 2. Opportunistic Lazy Expiry before checking locks
    BookingServiceImpl.sweepExpiredAllocationsNow(nowMs);

    // 3. Model-Specific Validation, Buffer Computation & Atomic Lock Claim
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
      try {
        assertValidInterval({ startsAt, endsAt });
      } catch (err) {
        throw new AppError(
          'VALIDATION_ERROR',
          err instanceof Error ? err.message : 'Invalid booking time interval.',
          400,
        );
      }

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
      try {
        assertValidInterval({ startsAt, endsAt });
      } catch (err) {
        throw new AppError(
          'VALIDATION_ERROR',
          err instanceof Error ? err.message : 'Invalid appointment interval.',
          400,
        );
      }

      const service = state.services.find((s) => s.id === serviceId);
      if (!service || service.tenantId !== resolvedTenantId || !service.isActive) {
        throw new AppError(
          'NOT_FOUND',
          'Requested service is not available for this business.',
          404,
        );
      }

      const staff = state.staffMembers.find((st) => st.id === staffMemberId);
      if (!staff || staff.tenantId !== resolvedTenantId || !staff.isActive) {
        throw new AppError(
          'NOT_FOUND',
          'Requested specialist/staff member is not available for this business.',
          404,
        );
      }

      if (!staff.serviceIds.includes(service.id)) {
        throw new AppError(
          'VALIDATION_ERROR',
          `${staff.displayName} is not assigned to perform ${service.name}.`,
          400,
        );
      }

      const startWall = formatIstWallClock(startsAt);
      const endWall = formatIstWallClock(endsAt);
      const durationMin = Math.round((endsAt.getTime() - startsAt.getTime()) / 60_000);
      const startMinOfDay = startWall.minutesFromMidnight;
      const endMinOfDay = startMinOfDay + durationMin;

      // Verify staff holiday / unavailability exceptions
      const dayExceptions = staff.exceptions.filter(
        (ex) => ex.dateLocal === startWall.dateLocal && ex.isUnavailable,
      );
      for (const ex of dayExceptions) {
        if (ex.startHour === undefined || ex.endHour === undefined) {
          throw new SlotUnavailableError(
            `${staff.displayName} is unavailable on ${startWall.dateLocal}${ex.reason ? ` (${ex.reason})` : ''}.`,
          );
        }
        if (
          Math.max(startMinOfDay, ex.startHour * 60) <
          Math.min(endMinOfDay, ex.endHour * 60)
        ) {
          throw new SlotUnavailableError(
            `${staff.displayName} is unavailable during the requested hours.`,
          );
        }
      }

      // Verify staff working hours & break hour
      if (
        startMinOfDay < staff.workingStartHour * 60 ||
        endMinOfDay > staff.workingEndHour * 60
      ) {
        throw new SlotUnavailableError(
          `Requested time is outside ${staff.displayName}'s working hours.`,
        );
      }
      if (staff.breakHour !== undefined) {
        const breakStart = staff.breakHour * 60;
        const breakEnd = (staff.breakHour + 1) * 60;
        if (Math.max(startMinOfDay, breakStart) < Math.min(endMinOfDay, breakEnd)) {
          throw new SlotUnavailableError(
            `${staff.displayName} is on scheduled break during this window.`,
          );
        }
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

      // Atomically reserve seats in heldCount
      session.heldCount += requestedQty;

      const todayIst = formatIstWallClock(new Date(nowMs)).dateLocal;
      const effectiveDate = session.dateLocal === '*' ? todayIst : session.dateLocal;
      const sessStart = new Date(`${effectiveDate}T${session.startTime}:00.000+05:30`);
      const sessEnd = new Date(`${effectiveDate}T${session.endTime}:00.000+05:30`);

      quantity = requestedQty;
      totalMinor = session.priceMinor * requestedQty;
      resourceOrServiceName = session.name;
      staffName = session.instructorName;
      courtOrRoom = `Studio (${requestedQty} seat${requestedQty > 1 ? 's' : ''})`;
      dateLocal = effectiveDate;
      startTime = session.startTime;
      endTime = session.endTime;
      startsAtIso = sessStart.toISOString();
      endsAtIso = sessEnd.toISOString();

      newAllocation = {
        id: allocationId,
        tenantId: resolvedTenantId,
        bookingId,
        bookingModel: 'capacity_session',
        sessionId,
        quantity: requestedQty,
        startsAtMs: sessStart.getTime(),
        endsAtMs: sessEnd.getTime(),
        bufferStartsAtMs: sessStart.getTime(),
        bufferEndsAtMs: sessEnd.getTime(),
        expiresAtMs,
        status: 'held',
      };
    }

    const holdId = randomUUID();
    const holdToken = `ht_${randomUUID().replace(/-/g, '')}`;
    const bookingNumber = `BK-${Date.now().toString().slice(-6)}-${Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase()}`;

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

  public async initiateCheckoutPayment(params: {
    readonly tenantId: UUID;
    readonly bookingId: UUID;
    readonly holdToken: string;
    readonly idempotencyKey: string;
  }): Promise<{
    readonly paymentId: UUID;
    readonly provider: Exclude<PaymentProvider, 'manual'>;
    readonly providerOrderId: string;
    readonly amountMinor: number;
    readonly currency: string;
    readonly clientCheckoutPayload?: Record<string, unknown>;
  }> {
    BookingServiceImpl.sweepExpiredAllocationsNow();
    const state = RuntimeStateRepository.getState();
    const resolvedTenantId = this.resolveTenantId(params.tenantId);

    const booking = state.bookings.find((b) => b.bookingId === params.bookingId);
    if (!booking || booking.tenantId !== resolvedTenantId) {
      throw new AppError('NOT_FOUND', 'Booking record not found.', 404);
    }

    if (booking.holdToken !== params.holdToken) {
      throw new AppError('FORBIDDEN', 'Invalid hold token.', 403);
    }

    if (booking.status === 'confirmed') {
      throw new AppError('VALIDATION_ERROR', 'Booking is already confirmed and paid.', 409);
    }

    if (
      booking.status === 'expired' ||
      booking.status === 'cancelled' ||
      Date.now() >= new Date(booking.expiresAtIso).getTime()
    ) {
      throw new HoldExpiredError(
        'Your reservation hold expired before payment started. Please reselect an available slot.',
      );
    }

    // Idempotent payment order reuse
    const existingPayment = state.payments.find(
      (p) =>
        p.tenantId === resolvedTenantId &&
        p.bookingId === booking.bookingId &&
        p.idempotencyKey === params.idempotencyKey,
    );
    if (existingPayment) {
      const simPayId = `sim_pay_${existingPayment.paymentId.replace(/-/g, '').slice(0, 16)}`;
      const simSig = this.simulatedGateway.computeCallbackSignatureForTest(
        existingPayment.providerOrderId,
        simPayId,
      );
      return {
        paymentId: existingPayment.paymentId,
        provider: existingPayment.provider,
        providerOrderId: existingPayment.providerOrderId,
        amountMinor: existingPayment.amountMinor,
        currency: existingPayment.currency,
        clientCheckoutPayload: {
          mode: existingPayment.provider,
          bookingNumber: booking.bookingNumber,
          providerOrderId: existingPayment.providerOrderId,
          simulatedPaymentId: simPayId,
          simulatedSignature: simSig,
        },
      };
    }

    const order = await this.simulatedGateway.createOrder({
      tenantId: booking.tenantId,
      bookingId: booking.bookingId,
      bookingNumber: booking.bookingNumber,
      amountMinor: booking.totalMinor,
      currency: booking.currency,
      idempotencyKey: params.idempotencyKey,
      customer: {
        name: booking.customerName,
        phone: booking.customerPhone,
        email: booking.customerEmail,
      },
    });

    const paymentId = randomUUID();
    const paymentRecord: RuntimePaymentRecord = {
      paymentId,
      tenantId: booking.tenantId,
      bookingId: booking.bookingId,
      provider: order.provider,
      providerOrderId: order.providerOrderId,
      amountMinor: order.amountMinor,
      currency: order.currency,
      status: 'created',
      idempotencyKey: params.idempotencyKey,
      createdAtIso: new Date().toISOString(),
    };

    state.payments.push(paymentRecord);
    RuntimeStateRepository.persist();

    return {
      paymentId,
      provider: order.provider,
      providerOrderId: order.providerOrderId,
      amountMinor: order.amountMinor,
      currency: order.currency,
      clientCheckoutPayload: order.clientCheckoutPayload,
    };
  }

  /**
   * Verifies a client callback payment signature (or processes a simulated failure)
   * before confirming the booking.
   */
  public async verifyAndConfirmClientPayment(params: {
    readonly tenantId: UUID;
    readonly bookingId: UUID;
    readonly paymentId?: UUID;
    readonly providerOrderId: string;
    readonly providerPaymentId: string;
    readonly providerSignature: string;
    readonly paymentMethod?: 'upi' | 'card' | 'cash' | 'unknown';
  }): Promise<{
    readonly outcome: 'confirmed' | 'conflict_auto_refund_queued';
    readonly bookingNumber: string;
  }> {
    const state = RuntimeStateRepository.getState();
    const resolvedTenantId = this.resolveTenantId(params.tenantId);

    const booking = state.bookings.find((b) => b.bookingId === params.bookingId);
    if (!booking || booking.tenantId !== resolvedTenantId) {
      throw new AppError('NOT_FOUND', 'Booking record not found.', 404);
    }

    const payment = state.payments.find(
      (p) =>
        p.bookingId === booking.bookingId &&
        p.providerOrderId === params.providerOrderId,
    );
    if (!payment) {
      throw new AppError('NOT_FOUND', 'Payment order not found for this booking.', 404);
    }

    const isValidSig =
      payment.provider === 'razorpay'
        ? this.razorpayGateway.verifyClientCallbackSignature({
            providerOrderId: params.providerOrderId,
            providerPaymentId: params.providerPaymentId,
            providerSignature: params.providerSignature,
          })
        : this.simulatedGateway.verifyClientCallbackSignature({
            providerOrderId: params.providerOrderId,
            providerPaymentId: params.providerPaymentId,
            providerSignature: params.providerSignature,
          });

    if (!isValidSig) {
      throw new AppError(
        'PAYMENT_SIGNATURE_INVALID',
        'Payment verification failed: invalid gateway cryptographic signature.',
        401,
      );
    }

    payment.providerPaymentId = params.providerPaymentId;
    if (params.paymentMethod) {
      booking.paymentMethod = params.paymentMethod;
    }

    const result = await this.confirmBookingFromVerifiedPayment({
      tenantId: resolvedTenantId,
      bookingId: booking.bookingId,
      paymentId: payment.paymentId,
    });

    return {
      outcome: result.outcome,
      bookingNumber: booking.bookingNumber,
    };
  }

  public async recordPaymentFailure(params: {
    readonly tenantId: UUID;
    readonly bookingId: UUID;
    readonly providerOrderId: string;
    readonly reason?: string;
  }): Promise<{ holdStillActive: boolean; expiresAtIso: string }> {
    BookingServiceImpl.sweepExpiredAllocationsNow();
    const state = RuntimeStateRepository.getState();
    const resolvedTenantId = this.resolveTenantId(params.tenantId);

    const booking = state.bookings.find((b) => b.bookingId === params.bookingId);
    if (!booking || booking.tenantId !== resolvedTenantId) {
      throw new AppError('NOT_FOUND', 'Booking record not found.', 404);
    }

    const payment = state.payments.find(
      (p) =>
        p.bookingId === booking.bookingId &&
        p.providerOrderId === params.providerOrderId,
    );
    if (payment && payment.status === 'created') {
      payment.status = 'failed';
    }
    if (booking.status !== 'confirmed') {
      booking.paymentStatus = 'failed';
    }

    RuntimeStateRepository.persist();
    return {
      holdStillActive: booking.status === 'temporarily_held',
      expiresAtIso: booking.expiresAtIso,
    };
  }

  public async confirmBookingFromVerifiedPayment(params: {
    readonly tenantId: UUID;
    readonly bookingId: UUID;
    readonly paymentId: UUID;
  }): Promise<{
    readonly outcome: 'confirmed' | 'conflict_auto_refund_queued';
  }> {
    const state = RuntimeStateRepository.getState();
    const resolvedTenantId = this.resolveTenantId(params.tenantId);

    const booking = state.bookings.find((b) => b.bookingId === params.bookingId);
    if (!booking || booking.tenantId !== resolvedTenantId) {
      throw new AppError('NOT_FOUND', 'Booking record not found.', 404);
    }

    // Idempotent confirmation if already confirmed
    if (booking.status === 'confirmed') {
      return { outcome: 'confirmed' };
    }

    const payment = state.payments.find(
      (p) => p.paymentId === params.paymentId || p.bookingId === booking.bookingId,
    );

    const alloc = state.allocations.find((a) => a.id === booking.allocationId);
    if (!alloc) {
      return { outcome: 'conflict_auto_refund_queued' };
    }

    // Normal Path: Hold is still active
    if (alloc.status === 'held') {
      alloc.status = 'confirmed';
      booking.status = 'confirmed';
      booking.paymentStatus = 'paid';
      if (booking.paymentMethod === 'unknown') {
        booking.paymentMethod = 'upi';
      }
      if (payment) {
        payment.status = 'captured';
      }

      if (alloc.sessionId) {
        const session = state.sessions.find((s) => s.id === alloc.sessionId);
        if (session) {
          session.heldCount = Math.max(0, session.heldCount - alloc.quantity);
          session.bookedCount += alloc.quantity;
        }
      }

      await this.notifications.enqueue({
        tenantId: resolvedTenantId,
        bookingId: booking.bookingId,
        channel: 'whatsapp',
        templateKey: 'booking.confirmed',
        recipient: booking.customerPhone,
        idempotencyKey: `notif:confirmed:${booking.bookingId}`,
        payload: {
          bookingNumber: booking.bookingNumber,
          item: booking.resourceOrServiceName,
          dateLocal: booking.dateLocal,
          startTime: booking.startTime,
        },
      });

      RuntimeStateRepository.persist();
      return { outcome: 'confirmed' };
    }

    // SAVEPOINT Reconciliation Path: Hold expired before payment arrived!
    // Check whether the slot/capacity is still unclaimed; if free, confirm cleanly!
    const canReacquire = this.canReacquireExpiredAllocation(alloc);
    if (canReacquire) {
      alloc.status = 'confirmed';
      booking.status = 'confirmed';
      booking.paymentStatus = 'paid';
      if (booking.paymentMethod === 'unknown') {
        booking.paymentMethod = 'upi';
      }
      if (payment) {
        payment.status = 'captured';
      }
      if (alloc.sessionId) {
        const session = state.sessions.find((s) => s.id === alloc.sessionId);
        if (session) {
          session.bookedCount += alloc.quantity;
        }
      }

      await this.notifications.enqueue({
        tenantId: resolvedTenantId,
        bookingId: booking.bookingId,
        channel: 'whatsapp',
        templateKey: 'booking.confirmed',
        recipient: booking.customerPhone,
        idempotencyKey: `notif:confirmed:${booking.bookingId}`,
        payload: {
          bookingNumber: booking.bookingNumber,
          reconciledLatePayment: true,
        },
      });

      RuntimeStateRepository.persist();
      return { outcome: 'confirmed' };
    }

    // Slot was claimed by another customer after expiry -> Rollback & Queue Automated Refund!
    if (payment) {
      payment.status = 'captured_requires_refund';
    }
    booking.status = 'refund_pending';
    booking.paymentStatus = 'refunded';

    const refundResp = await this.simulatedGateway.initiateRefund({
      providerPaymentId: payment?.providerPaymentId ?? params.paymentId,
      amountMinor: booking.totalMinor,
      idempotencyKey: `rfnd:late:${booking.bookingId}`,
      notes: {
        reason: 'Hold expired and slot claimed by another customer prior to late payment capture',
      },
    });

    state.refunds.push({
      refundId: randomUUID(),
      tenantId: resolvedTenantId,
      bookingId: booking.bookingId,
      paymentId: payment?.paymentId ?? params.paymentId,
      providerRefundId: refundResp.providerRefundId,
      amountMinor: booking.totalMinor,
      reason: 'Late payment conflict after hold expiry — automatic refund initiated',
      createdAtIso: new Date().toISOString(),
    });

    await this.notifications.enqueue({
      tenantId: resolvedTenantId,
      bookingId: booking.bookingId,
      channel: 'email',
      templateKey: 'payment.refund_initiated',
      recipient: booking.customerEmail ?? booking.customerPhone,
      idempotencyKey: `notif:refund:${booking.bookingId}`,
      payload: {
        bookingNumber: booking.bookingNumber,
        amountMinor: booking.totalMinor,
        providerRefundId: refundResp.providerRefundId,
      },
    });

    RuntimeStateRepository.persist();
    return { outcome: 'conflict_auto_refund_queued' };
  }

  private canReacquireExpiredAllocation(target: RuntimeAllocation): boolean {
    const state = RuntimeStateRepository.getState();

    if (target.bookingModel === 'exclusive_resource' && target.resourceId) {
      const resource = state.resources.find((r) => r.id === target.resourceId);
      if (!resource || !resource.isActive) return false;

      return !state.allocations.some(
        (other) =>
          other.id !== target.id &&
          other.resourceId === target.resourceId &&
          (other.status === 'held' || other.status === 'confirmed') &&
          Math.max(target.bufferStartsAtMs, other.bufferStartsAtMs) <
            Math.min(target.bufferEndsAtMs, other.bufferEndsAtMs),
      );
    }

    if (target.bookingModel === 'staff_appointment' && target.staffMemberId) {
      const staff = state.staffMembers.find((s) => s.id === target.staffMemberId);
      if (!staff || !staff.isActive) return false;

      return !state.allocations.some(
        (other) =>
          other.id !== target.id &&
          other.staffMemberId === target.staffMemberId &&
          (other.status === 'held' || other.status === 'confirmed') &&
          Math.max(target.bufferStartsAtMs, other.bufferStartsAtMs) <
            Math.min(target.bufferEndsAtMs, other.bufferEndsAtMs),
      );
    }

    if (target.bookingModel === 'capacity_session' && target.sessionId) {
      const session = state.sessions.find((s) => s.id === target.sessionId);
      if (!session || !session.isActive) return false;
      return session.bookedCount + session.heldCount + target.quantity <= session.maxCapacity;
    }

    return false;
  }

  public async cancelBooking(params: {
    readonly actor: AuthenticatedActor | 'customer_verified_token';
    readonly tenantId: UUID;
    readonly bookingId: UUID;
    readonly reason: string;
    readonly idempotencyKey: string;
  }): Promise<void> {
    const state = RuntimeStateRepository.getState();
    const resolvedTenantId = this.resolveTenantId(params.tenantId);

    if (params.actor !== 'customer_verified_token') {
      assertTenantPermission(params.actor, resolvedTenantId, 'bookings:cancel');
    }

    const booking = state.bookings.find((b) => b.bookingId === params.bookingId);
    if (!booking || booking.tenantId !== resolvedTenantId) {
      throw new AppError('NOT_FOUND', 'Booking record not found.', 404);
    }

    if (booking.status === 'cancelled') {
      return;
    }

    const alloc = state.allocations.find((a) => a.id === booking.allocationId);
    if (alloc) {
      const prevStatus = alloc.status;
      alloc.status = 'released';

      if (alloc.sessionId) {
        const session = state.sessions.find((s) => s.id === alloc.sessionId);
        if (session) {
          if (prevStatus === 'held') {
            session.heldCount = Math.max(0, session.heldCount - alloc.quantity);
          } else if (prevStatus === 'confirmed') {
            session.bookedCount = Math.max(0, session.bookedCount - alloc.quantity);
          }
        }
      }
    }

    booking.status = 'cancelled';
    if (booking.paymentStatus === 'paid') {
      booking.paymentStatus = 'refunded';
    }

    await this.notifications.enqueue({
      tenantId: resolvedTenantId,
      bookingId: booking.bookingId,
      channel: 'whatsapp',
      templateKey: 'booking.cancelled',
      recipient: booking.customerPhone,
      idempotencyKey: `notif:cancel:${booking.bookingId}:${params.idempotencyKey}`,
      payload: {
        bookingNumber: booking.bookingNumber,
        reason: params.reason,
      },
    });

    RuntimeStateRepository.persist();
  }

  public async rescheduleBooking(
    actor: AuthenticatedActor | 'customer_verified_token',
    command: RescheduleBookingCommand,
  ): Promise<{ newBookingId: UUID }> {
    const state = RuntimeStateRepository.getState();
    const resolvedTenantId = this.resolveTenantId(command.tenantId);

    if (actor !== 'customer_verified_token') {
      assertTenantPermission(actor, resolvedTenantId, 'bookings:reschedule');
    }

    const existingBooking = state.bookings.find(
      (b) => b.bookingId === command.bookingId,
    );
    if (!existingBooking || existingBooking.tenantId !== resolvedTenantId) {
      throw new AppError('NOT_FOUND', 'Original booking not found.', 404);
    }

    if (existingBooking.status === 'cancelled') {
      throw new AppError(
        'VALIDATION_ERROR',
        'Cannot reschedule an already cancelled booking.',
        409,
      );
    }

    const wasConfirmed =
      existingBooking.status === 'confirmed' || existingBooking.status === 'completed';
    const wasPaid = existingBooking.paymentStatus === 'paid';
    const prevPaymentMethod = existingBooking.paymentMethod;

    // 1. ATOMIC FIRST STEP: Acquire the new slot BEFORE cancelling the old booking!
    // If the new slot is occupied by someone else, this throws SlotUnavailableError and preserves existingBooking intact.
    const newHold = await this.createHold(
      {
        tenantId: resolvedTenantId,
        locationId: existingBooking.locationId,
        idempotencyKey: `${command.idempotencyKey}:reschedule`,
        selection: command.newSelection,
        customer: {
          fullName: existingBooking.customerName,
          phone: existingBooking.customerPhone,
          email: existingBooking.customerEmail,
          notes: command.reason
            ? `Rescheduled from ${existingBooking.bookingNumber}: ${command.reason}`
            : `Rescheduled from ${existingBooking.bookingNumber}`,
        },
      },
      { excludeAllocationId: existingBooking.allocationId },
    );

    // 2. Release old booking allocation now that new slot is safely secured
    await this.cancelBooking({
      actor,
      tenantId: resolvedTenantId,
      bookingId: existingBooking.bookingId,
      reason: command.reason ?? `Rescheduled to ${newHold.bookingNumber}`,
      idempotencyKey: `${command.idempotencyKey}:release-old`,
    });

    // Preserve historical payment status if transferred rather than refunded
    if (wasPaid) {
      existingBooking.paymentStatus = 'paid';
    }

    // 3. If original booking was confirmed, promote the rescheduled booking directly to confirmed
    const freshBooking = state.bookings.find((b) => b.bookingId === newHold.bookingId);
    const freshAlloc = freshBooking
      ? state.allocations.find((a) => a.id === freshBooking.allocationId)
      : undefined;

    if (wasConfirmed && freshBooking && freshAlloc) {
      freshAlloc.status = 'confirmed';
      freshBooking.status = 'confirmed';
      freshBooking.paymentStatus = wasPaid ? 'paid' : 'unpaid';
      freshBooking.paymentMethod = prevPaymentMethod;

      if (freshAlloc.sessionId) {
        const session = state.sessions.find((s) => s.id === freshAlloc.sessionId);
        if (session) {
          session.heldCount = Math.max(0, session.heldCount - freshAlloc.quantity);
          session.bookedCount += freshAlloc.quantity;
        }
      }
    }

    await this.notifications.enqueue({
      tenantId: resolvedTenantId,
      bookingId: newHold.bookingId,
      channel: 'whatsapp',
      templateKey: 'booking.rescheduled',
      recipient: existingBooking.customerPhone,
      idempotencyKey: `notif:reschedule:${newHold.bookingId}`,
      payload: {
        previousBookingNumber: existingBooking.bookingNumber,
        newBookingNumber: newHold.bookingNumber,
        dateLocal: freshBooking?.dateLocal,
        startTime: freshBooking?.startTime,
      },
    });

    RuntimeStateRepository.persist();
    return { newBookingId: newHold.bookingId };
  }

  public async updateBookingOperationalStatus(params: {
    readonly actor: AuthenticatedActor;
    readonly tenantId: UUID;
    readonly bookingId: UUID;
    readonly status: Extract<BookingStatus, 'completed' | 'no_show' | 'confirmed'>;
    readonly paymentStatus?: 'paid' | 'pending' | 'unpaid';
  }): Promise<RuntimeBookingRecord> {
    const state = RuntimeStateRepository.getState();
    const resolvedTenantId = this.resolveTenantId(params.tenantId);
    assertTenantPermission(params.actor, resolvedTenantId, 'bookings:update:status');

    const booking = state.bookings.find((b) => b.bookingId === params.bookingId);
    if (!booking || booking.tenantId !== resolvedTenantId) {
      throw new AppError('NOT_FOUND', 'Booking record not found.', 404);
    }

    booking.status = params.status;
    if (params.paymentStatus) {
      booking.paymentStatus = params.paymentStatus;
    }

    RuntimeStateRepository.persist();
    return booking;
  }

  public async createManualBooking(params: {
    readonly actor: AuthenticatedActor;
    readonly command: CreateBookingHoldCommand;
    readonly paymentStatus: 'paid' | 'unpaid';
    readonly paymentMethod: 'cash' | 'upi' | 'card';
  }): Promise<RuntimeBookingRecord> {
    const resolvedTenantId = this.resolveTenantId(params.command.tenantId);
    assertTenantPermission(params.actor, resolvedTenantId, 'bookings:create:internal');

    const hold = await this.createHold(params.command);
    const state = RuntimeStateRepository.getState();
    const booking = state.bookings.find((b) => b.bookingId === hold.bookingId);
    const alloc = booking
      ? state.allocations.find((a) => a.id === booking.allocationId)
      : undefined;

    if (!booking || !alloc) {
      throw new AppError('INTERNAL_ERROR', 'Failed to finalize manual booking.', 500);
    }

    alloc.status = 'confirmed';
    booking.status = 'confirmed';
    booking.paymentStatus = params.paymentStatus;
    booking.paymentMethod = params.paymentMethod;

    if (alloc.sessionId) {
      const session = state.sessions.find((s) => s.id === alloc.sessionId);
      if (session) {
        session.heldCount = Math.max(0, session.heldCount - alloc.quantity);
        session.bookedCount += alloc.quantity;
      }
    }

    await this.notifications.enqueue({
      tenantId: resolvedTenantId,
      bookingId: booking.bookingId,
      channel: 'whatsapp',
      templateKey: 'booking.confirmed',
      recipient: booking.customerPhone,
      idempotencyKey: `notif:manual:${booking.bookingId}`,
      payload: {
        bookingNumber: booking.bookingNumber,
        source: 'dashboard_walk_in',
      },
    });

    RuntimeStateRepository.persist();
    return booking;
  }

  public async listTenantBookings(
    actor: AuthenticatedActor,
    tenantId: UUID,
  ): Promise<RuntimeBookingRecord[]> {
    const resolvedTenantId = this.resolveTenantId(tenantId);
    assertTenantPermission(actor, resolvedTenantId, 'bookings:read:all');
    BookingServiceImpl.sweepExpiredAllocationsNow();

    const state = RuntimeStateRepository.getState();
    return state.bookings.filter((b) => b.tenantId === resolvedTenantId);
  }

  public async sweepExpiredHolds(_batchSize?: number): Promise<{ releasedCount: number }> {
    const releasedCount = BookingServiceImpl.sweepExpiredAllocationsNow(Date.now());
    return { releasedCount };
  }

  public static sweepExpiredAllocationsNow(nowMs = Date.now()): number {
    const state = RuntimeStateRepository.getState();
    let releasedCount = 0;

    for (const alloc of state.allocations) {
      if (alloc.status === 'held' && nowMs >= alloc.expiresAtMs) {
        alloc.status = 'expired';
        releasedCount += 1;

        if (alloc.sessionId) {
          const session = state.sessions.find((s) => s.id === alloc.sessionId);
          if (session) {
            session.heldCount = Math.max(0, session.heldCount - alloc.quantity);
          }
        }
      }
    }

    for (const booking of state.bookings) {
      if (
        booking.status === 'temporarily_held' &&
        nowMs >= new Date(booking.expiresAtIso).getTime()
      ) {
        booking.status = 'expired';
      }
    }

    if (releasedCount > 0) {
      RuntimeStateRepository.persist();
    }

    return releasedCount;
  }

  /**
   * Resets runtime state for deterministic unit and concurrency stress tests.
   */
  public static resetStateForTests(): void {
    RuntimeStateRepository.resetForTests(true);
  }
}
