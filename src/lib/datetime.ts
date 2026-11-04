import type { IanaTimezone } from '@/types/domain';

/**
 * Timezone-safe date/time utilities.
 *
 * Architectural Rules:
 * 1. All database instants (`starts_at`, `ends_at`, `expires_at`) are stored as UTC `timestamptz`.
 * 2. Recurring operating schedules (`availability_rules`) store wall-clock `day_of_week` + `HH:mm`
 *    and are projected into UTC instants using the explicit `locations.timezone` (e.g. 'Asia/Kolkata').
 * 3. Intervals follow half-open `[start, end)` semantics so adjacent slots
 *    (e.g., 18:00-19:00 and 19:00-20:00) never collide.
 */

export const DEFAULT_INDIA_TIMEZONE: IanaTimezone = 'Asia/Kolkata';

export interface UtcInterval {
  readonly startsAt: Date;
  readonly endsAt: Date;
}

export function assertValidInterval(interval: UtcInterval): void {
  const startMs = interval.startsAt.getTime();
  const endMs = interval.endsAt.getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
    throw new RangeError('Invalid interval: endsAt must be strictly greater than startsAt.');
  }
}

export function applyIntervalBuffers(
  interval: UtcInterval,
  bufferBeforeMinutes: number,
  bufferAfterMinutes: number,
): UtcInterval {
  assertValidInterval(interval);
  return {
    startsAt: new Date(interval.startsAt.getTime() - bufferBeforeMinutes * 60_000),
    endsAt: new Date(interval.endsAt.getTime() + bufferAfterMinutes * 60_000),
  };
}

export function intervalsOverlap(a: UtcInterval, b: UtcInterval): boolean {
  return a.startsAt < b.endsAt && b.startsAt < a.endsAt;
}

export function isValidIanaTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
