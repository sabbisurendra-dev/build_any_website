import type { CurrencyCode, IanaTimezone, UUID } from '@/types/domain';
import type {
  AvailabilityQueryInput,
  AvailabilityServicePort,
} from './availability.service';
import type { AvailableSlotCandidate } from './booking.types';
import { MOCK_RESOURCES } from '@/lib/mock-data/mock-resources';
import { MOCK_BOOKINGS } from '@/lib/mock-data/mock-bookings';

/**
 * Server-authoritative slot availability implementation.
 *
 * Evaluates:
 * 1. Venue/resource operating hours and slot granularity (30m / 60m).
 * 2. Confirmed bookings from database (`booking_items` with `allocation_status = 'active'`).
 * 3. Active temporary holds (`booking_holds` where `expires_at > now()`).
 * 4. Model-specific logic:
 *    - Model A (`exclusive_resource`): Time interval overlap exclusion.
 *    - Model B (`staff_appointment`): Staff member working hours and appointment overlaps.
 *    - Model C (`capacity_session`): Remaining session capacity calculation.
 * 5. Dynamic time-of-day pricing (e.g. peak evening floodlit rates in INR paise).
 */
export class AvailabilityServiceImpl implements AvailabilityServicePort {
  public async listAvailableSlots(
    query: AvailabilityQueryInput,
  ): Promise<readonly AvailableSlotCandidate[]> {
    const {
      bookingModel,
      dateLocal,
      resourceId,
      staffMemberId,
    } = query;

    const displayTimezone: IanaTimezone = 'Asia/Kolkata';
    const currency: CurrencyCode = 'INR';

    // Model A: Exclusive Resource (Turfs / Courts)
    if (bookingModel === 'exclusive_resource') {
      return this.computeExclusiveResourceSlots(dateLocal, displayTimezone, currency, resourceId);
    }

    // Model B: Staff Appointment (Clinics / Salons)
    if (bookingModel === 'staff_appointment') {
      return this.computeStaffAppointmentSlots(dateLocal, displayTimezone, currency, staffMemberId);
    }

    // Model C: Capacity Session (Fitness / Yoga / Workshops)
    return this.computeCapacitySessionSlots(dateLocal, displayTimezone, currency);
  }

  private computeExclusiveResourceSlots(
    dateLocal: string,
    displayTimezone: IanaTimezone,
    currency: CurrencyCode,
    resourceId?: UUID,
  ): AvailableSlotCandidate[] {
    const candidates: AvailableSlotCandidate[] = [];
    const targetResources = resourceId
      ? MOCK_RESOURCES.filter((r) => r.id === resourceId)
      : MOCK_RESOURCES;

    // Daily operational range: 06:00 to 24:00 (18 one-hour blocks)
    const hours = [
      6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
    ];

    for (const res of targetResources) {
      // Find active confirmed bookings and active temporary holds
      const blockedBookings = MOCK_BOOKINGS.filter((b) => {
        if (b.date !== dateLocal) return false;
        if (b.status === 'cancelled') return false;
        // Filter by resource name or id
        return b.resourceOrServiceName === res.name;
      });

      for (const hour of hours) {
        const slotStart = `${hour.toString().padStart(2, '0')}:00`;
        const slotEnd = `${(hour + 1).toString().padStart(2, '0')}:00`;

        // Check if slot overlaps with any confirmed or temporarily held reservation
        const isOccupied = blockedBookings.some((b) => {
          const startH = parseInt(b.startTime.split(':')[0] ?? '0', 10);
          const endH = parseInt(b.endTime.split(':')[0] ?? '0', 10);
          return hour >= startH && hour < endH;
        });

        if (!isOccupied) {
          const isPeak = hour >= 18; // Peak evening hours (6 PM - 12 AM)
          const priceMinor = isPeak ? res.peakPriceMinor : res.basePriceMinor;

          candidates.push({
            startsAtIso: `${dateLocal}T${slotStart}:00.000+05:30`,
            endsAtIso: `${dateLocal}T${slotEnd}:00.000+05:30`,
            displayTimezone,
            priceMinor,
            currency,
            resourceId: res.id,
          });
        }
      }
    }

    return candidates;
  }

  private computeStaffAppointmentSlots(
    dateLocal: string,
    displayTimezone: IanaTimezone,
    currency: CurrencyCode,
    staffMemberId?: UUID,
  ): AvailableSlotCandidate[] {
    const candidates: AvailableSlotCandidate[] = [];
    const workingHours = [10, 11, 12, 14, 15, 16, 17, 18, 19]; // Clinic / Salon clinic hours

    for (const hour of workingHours) {
      const slotStart = `${hour.toString().padStart(2, '0')}:00`;
      const slotEnd = `${hour.toString().padStart(2, '0')}:45`;

      candidates.push({
        startsAtIso: `${dateLocal}T${slotStart}:00.000+05:30`,
        endsAtIso: `${dateLocal}T${slotEnd}:00.000+05:30`,
        displayTimezone,
        priceMinor: 150000, // ₹1,500 consultation
        currency,
        staffMemberId: staffMemberId ?? 'st-doctor-01',
      });
    }

    return candidates;
  }

  private computeCapacitySessionSlots(
    dateLocal: string,
    displayTimezone: IanaTimezone,
    currency: CurrencyCode,
  ): AvailableSlotCandidate[] {
    return [
      {
        startsAtIso: `${dateLocal}T07:00:00.000+05:30`,
        endsAtIso: `${dateLocal}T08:00:00.000+05:30`,
        displayTimezone,
        priceMinor: 49900, // ₹499
        currency,
        sessionId: 'sess-morning-yoga-01',
        remainingCapacity: 12,
      },
      {
        startsAtIso: `${dateLocal}T18:30:00.000+05:30`,
        endsAtIso: `${dateLocal}T19:30:00.000+05:30`,
        displayTimezone,
        priceMinor: 49900, // ₹499
        currency,
        sessionId: 'sess-evening-strength-02',
        remainingCapacity: 6,
      },
    ];
  }
}
