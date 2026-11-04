import type { CurrencyCode, IanaTimezone, UUID } from '@/types/domain';
import { applyIntervalBuffers } from '@/lib/datetime';
import type {
  AvailabilityQueryInput,
  AvailabilityServicePort,
} from './availability.service';
import type { AvailableSlotCandidate } from './booking.types';
import { RuntimeStateRepository } from '@/modules/persistence/runtime-store';
import { BookingServiceImpl } from './booking.impl';

/**
 * Server-authoritative slot availability implementation.
 *
 * Evaluates:
 * 1. Tenant scoping & active resource/service/staff/session status.
 * 2. Opportunistic lazy expiry of expired temporary holds (`expires_at <= now()`).
 * 3. Venue/staff operating hours, lunch breaks, and holiday/exception windows.
 * 4. Service duration + pre/post buffer windows (`[bufferStartsAt, bufferEndsAt)`).
 * 5. Active confirmed bookings and active temporary holds in `RuntimeStateRepository`.
 * 6. Live session remaining capacity (`maxCapacity - bookedCount - heldCount`).
 */
export class AvailabilityServiceImpl implements AvailabilityServicePort {
  public async listAvailableSlots(
    query: AvailabilityQueryInput,
  ): Promise<readonly AvailableSlotCandidate[]> {
    const {
      tenantId,
      bookingModel,
      dateLocal,
      resourceId,
      serviceId,
      staffMemberId,
      durationMinutesOverride,
    } = query;

    // Ensure expired holds never block availability
    BookingServiceImpl.sweepExpiredAllocationsNow();

    const state = RuntimeStateRepository.getState();
    const tenant = state.tenants.find((t) => t.id === tenantId || t.slug === tenantId);
    const resolvedTenantId = tenant?.id ?? tenantId;

    const displayTimezone: IanaTimezone = tenant?.location.timezone ?? 'Asia/Kolkata';
    const currency: CurrencyCode = (tenant?.defaultCurrency as CurrencyCode) ?? 'INR';

    if (bookingModel === 'exclusive_resource') {
      return this.computeExclusiveResourceSlots(
        resolvedTenantId,
        dateLocal,
        displayTimezone,
        currency,
        resourceId,
        durationMinutesOverride,
      );
    }

    if (bookingModel === 'staff_appointment') {
      return this.computeStaffAppointmentSlots(
        resolvedTenantId,
        dateLocal,
        displayTimezone,
        currency,
        serviceId,
        staffMemberId,
        durationMinutesOverride,
      );
    }

    return this.computeCapacitySessionSlots(
      resolvedTenantId,
      dateLocal,
      displayTimezone,
      currency,
    );
  }

  private computeExclusiveResourceSlots(
    tenantId: UUID,
    dateLocal: string,
    displayTimezone: IanaTimezone,
    currency: CurrencyCode,
    resourceId?: UUID,
    durationMinutesOverride?: number,
  ): AvailableSlotCandidate[] {
    const state = RuntimeStateRepository.getState();
    const candidates: AvailableSlotCandidate[] = [];

    const targetResources = state.resources.filter((r) => {
      if (r.tenantId !== tenantId || !r.isActive) return false;
      if (resourceId && r.id !== resourceId) return false;
      return true;
    });

    for (const res of targetResources) {
      const durationMin = durationMinutesOverride ?? res.slotDurationMinutes;
      const stepMin = res.slotStepMinutes || 60;

      const activeAllocs = state.allocations.filter(
        (a) =>
          a.resourceId === res.id &&
          (a.status === 'held' || a.status === 'confirmed'),
      );

      const dayStartMin = res.operatingStartHour * 60;
      const dayEndMin = res.operatingEndHour * 60;

      for (let startMin = dayStartMin; startMin + durationMin <= dayEndMin; startMin += stepMin) {
        const endMin = startMin + durationMin;
        const startIso = this.buildIstIso(dateLocal, startMin);
        const endIso = this.buildIstIso(dateLocal, endMin);

        const rawInterval = {
          startsAt: new Date(startIso),
          endsAt: new Date(endIso),
        };
        const buffered = applyIntervalBuffers(
          rawInterval,
          res.bufferBeforeMinutes,
          res.bufferAfterMinutes,
        );
        const candStartMs = buffered.startsAt.getTime();
        const candEndMs = buffered.endsAt.getTime();

        const isOccupied = activeAllocs.some(
          (a) => Math.max(candStartMs, a.bufferStartsAtMs) < Math.min(candEndMs, a.bufferEndsAtMs),
        );

        if (!isOccupied) {
          const startHour = Math.floor(startMin / 60);
          const isPeak = startHour >= 18;
          const hourlyRate = isPeak ? res.peakPriceMinor : res.basePriceMinor;
          const priceMinor = Math.round((hourlyRate * durationMin) / 60);

          candidates.push({
            startsAtIso: startIso,
            endsAtIso: endIso,
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
    tenantId: UUID,
    dateLocal: string,
    displayTimezone: IanaTimezone,
    currency: CurrencyCode,
    serviceId?: UUID,
    staffMemberId?: UUID,
    durationMinutesOverride?: number,
  ): AvailableSlotCandidate[] {
    const state = RuntimeStateRepository.getState();
    const candidates: AvailableSlotCandidate[] = [];

    const tenantServices = state.services.filter((s) => s.tenantId === tenantId && s.isActive);
    const service = serviceId
      ? tenantServices.find((s) => s.id === serviceId)
      : tenantServices[0];

    if (!service) return [];

    const durationMin = durationMinutesOverride ?? service.durationMinutes;

    const eligibleStaff = state.staffMembers.filter((st) => {
      if (st.tenantId !== tenantId || !st.isActive) return false;
      if (!st.serviceIds.includes(service.id)) return false;
      if (staffMemberId && st.id !== staffMemberId) return false;
      return true;
    });

    for (const staff of eligibleStaff) {
      // Check full-day holiday exception
      const dayExceptions = staff.exceptions.filter(
        (ex) => ex.dateLocal === dateLocal && ex.isUnavailable,
      );
      const isFullDayOff = dayExceptions.some(
        (ex) => ex.startHour === undefined || ex.endHour === undefined,
      );
      if (isFullDayOff) continue;

      const activeAllocs = state.allocations.filter(
        (a) =>
          a.staffMemberId === staff.id &&
          (a.status === 'held' || a.status === 'confirmed'),
      );

      const workStartMin = staff.workingStartHour * 60;
      const workEndMin = staff.workingEndHour * 60;
      const stepMin = 30;

      for (let startMin = workStartMin; startMin + durationMin <= workEndMin; startMin += stepMin) {
        const endMin = startMin + durationMin;

        // Skip staff break hour
        if (staff.breakHour !== undefined) {
          const breakStart = staff.breakHour * 60;
          const breakEnd = (staff.breakHour + 1) * 60;
          if (Math.max(startMin, breakStart) < Math.min(endMin, breakEnd)) {
            continue;
          }
        }

        // Skip partial-day exception windows
        const overlapsException = dayExceptions.some((ex) => {
          if (ex.startHour === undefined || ex.endHour === undefined) return true;
          return Math.max(startMin, ex.startHour * 60) < Math.min(endMin, ex.endHour * 60);
        });
        if (overlapsException) continue;

        const startIso = this.buildIstIso(dateLocal, startMin);
        const endIso = this.buildIstIso(dateLocal, endMin);
        const buffered = applyIntervalBuffers(
          { startsAt: new Date(startIso), endsAt: new Date(endIso) },
          service.bufferBeforeMinutes,
          service.bufferAfterMinutes,
        );

        const candStartMs = buffered.startsAt.getTime();
        const candEndMs = buffered.endsAt.getTime();

        const isOccupied = activeAllocs.some(
          (a) => Math.max(candStartMs, a.bufferStartsAtMs) < Math.min(candEndMs, a.bufferEndsAtMs),
        );

        if (!isOccupied) {
          candidates.push({
            startsAtIso: startIso,
            endsAtIso: endIso,
            displayTimezone,
            priceMinor: service.priceMinor,
            currency,
            staffMemberId: staff.id,
          });
        }
      }
    }

    return candidates;
  }

  private computeCapacitySessionSlots(
    tenantId: UUID,
    dateLocal: string,
    displayTimezone: IanaTimezone,
    currency: CurrencyCode,
  ): AvailableSlotCandidate[] {
    const state = RuntimeStateRepository.getState();
    const sessions = state.sessions.filter(
      (s) =>
        s.tenantId === tenantId &&
        s.isActive &&
        (s.dateLocal === '*' || s.dateLocal === dateLocal),
    );

    return sessions.map((s) => {
      const remainingCapacity = Math.max(0, s.maxCapacity - s.bookedCount - s.heldCount);
      return {
        startsAtIso: `${dateLocal}T${s.startTime}:00.000+05:30`,
        endsAtIso: `${dateLocal}T${s.endTime}:00.000+05:30`,
        displayTimezone,
        priceMinor: s.priceMinor,
        currency,
        sessionId: s.id,
        remainingCapacity,
      };
    });
  }

  private buildIstIso(dateLocal: string, minutesFromMidnight: number): string {
    if (minutesFromMidnight >= 1440) {
      // Midnight / next-day boundary (24:00 -> next calendar day 00:00+05:30)
      const [y, m, d] = dateLocal.split('-').map(Number);
      const nextDate = new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1, (d ?? 1) + 1));
      const ny = nextDate.getUTCFullYear();
      const nm = String(nextDate.getUTCMonth() + 1).padStart(2, '0');
      const nd = String(nextDate.getUTCDate()).padStart(2, '0');
      const rem = minutesFromMidnight - 1440;
      const hh = String(Math.floor(rem / 60)).padStart(2, '0');
      const mm = String(rem % 60).padStart(2, '0');
      return `${ny}-${nm}-${nd}T${hh}:${mm}:00.000+05:30`;
    }

    const hh = String(Math.floor(minutesFromMidnight / 60)).padStart(2, '0');
    const mm = String(minutesFromMidnight % 60).padStart(2, '0');
    return `${dateLocal}T${hh}:${mm}:00.000+05:30`;
  }
}
