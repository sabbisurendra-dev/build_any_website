import type { BookingModel, UUID } from '@/types/domain';
import type { AvailableSlotCandidate } from './booking.types';

export interface AvailabilityQueryInput {
  readonly tenantId: UUID;
  readonly locationId: UUID;
  readonly bookingModel: BookingModel;
  readonly dateLocal: string; // YYYY-MM-DD in location's explicit IANA timezone
  readonly resourceId?: UUID;
  readonly serviceId?: UUID;
  readonly staffMemberId?: UUID; // Optional in Model B ("Any available doctor/stylist")
  readonly durationMinutesOverride?: number;
}

/**
 * Server-authoritative availability computation contract.
 *
 * Resolution pipeline:
 * 1. Load `locations.timezone` (e.g. `Asia/Kolkata`) and validate notice/horizon bounds.
 * 2. Expand `availability_rules` for `dateLocal` into UTC candidate windows.
 * 3. Subtract `availability_exceptions` (`is_unavailable = true`) and union extra hours.
 * 4. Subtract active `booking_items` (`allocation_status = 'active'`, excluding any hold
 *    whose `booking_holds.expires_at <= now()`).
 * 5. Slice remaining open windows by `(duration + buffers)` at `slot_step_minutes`
 *    intervals and compute dynamic peak/off-peak `priceMinor`.
 *
 * NOTE: Availability lookup is advisory for UI display; hard concurrency guarantees
 * are enforced inside `BookingServicePort.createHold` via PostgreSQL GiST & FOR UPDATE locks.
 */
export interface AvailabilityServicePort {
  listAvailableSlots(query: AvailabilityQueryInput): Promise<readonly AvailableSlotCandidate[]>;
}
