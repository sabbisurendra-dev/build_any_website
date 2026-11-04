import type { AuthenticatedActor } from '@/modules/auth/session.types';
import type { PaymentProvider, UUID } from '@/types/domain';
import type {
  BookingHoldResult,
  CreateBookingHoldCommand,
  RescheduleBookingCommand,
} from './booking.types';

/**
 * Transactional Booking Lifecycle & Concurrency Service Contract.
 *
 * Critical Concurrency Guarantees (23-simultaneous-customers scenario):
 * 1. Idempotency check: `bookings(tenant_id, idempotency_key)` returns existing hold if replayed.
 * 2. Opportunistic lazy expiry: inside the same transaction, expire any stale holds
 *    (`expires_at <= now()`) overlapping the target resource/staff/session before locking.
 * 3. Model A & B: `INSERT INTO booking_items (... allocation_status = 'active')` relies on
 *    PostgreSQL `EXCLUDE USING gist` (`excl_booking_items_resource_overlap` /
 *    `excl_booking_items_staff_overlap`). Exactly 1 concurrent transaction succeeds; the
 *    remaining 22 catch SQLSTATE `23P01` -> `SlotUnavailableError` (HTTP 409).
 * 4. Model C: `SELECT ... FROM booking_sessions WHERE id = $1 FOR UPDATE` serializes
 *    concurrent seat claims; `booked_count + held_count + qty <= max_capacity` is verified
 *    in code AND enforced by `chk_booking_sessions_capacity_bounds`.
 * 5. Delayed Payment Webhook Safety: if payment succeeds AFTER hold TTL expiry,
 *    `confirmBookingFromVerifiedPayment` attempts slot re-activation inside a PostgreSQL
 *    `SAVEPOINT`. If the slot is still free, confirmation succeeds; if another customer
 *    claimed the slot, the savepoint rolls back cleanly, payment is marked
 *    `captured_requires_refund`, and an automated refund is enqueued—never leaving an
 *    untracked payment or duplicate booking.
 */
export interface BookingServicePort {
  createHold(command: CreateBookingHoldCommand): Promise<BookingHoldResult>;

  initiateCheckoutPayment(params: {
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
  }>;

  confirmBookingFromVerifiedPayment(params: {
    readonly tenantId: UUID;
    readonly bookingId: UUID;
    readonly paymentId: UUID;
  }): Promise<{
    readonly outcome: 'confirmed' | 'conflict_auto_refund_queued';
  }>;

  cancelBooking(params: {
    readonly actor: AuthenticatedActor | 'customer_verified_token';
    readonly tenantId: UUID;
    readonly bookingId: UUID;
    readonly reason: string;
    readonly idempotencyKey: string;
  }): Promise<void>;

  rescheduleBooking(
    actor: AuthenticatedActor | 'customer_verified_token',
    command: RescheduleBookingCommand,
  ): Promise<{ newBookingId: UUID }>;

  sweepExpiredHolds(batchSize?: number): Promise<{ releasedCount: number }>;
}
