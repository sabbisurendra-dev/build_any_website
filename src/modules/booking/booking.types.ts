import type {
  BookingStatus,
  CurrencyCode,
  IanaTimezone,
  MinorCurrencyAmount,
  UUID,
} from '@/types/domain';

/**
 * Unified Booking Domain Contracts supporting all three booking models:
 * - Model A (`exclusive_resource`): Turfs, courts, rooms
 * - Model B (`staff_appointment`): Doctors, salons, clinics
 * - Model C (`capacity_session`): Yoga classes, group fitness, workshops
 */

export interface AvailableSlotCandidate {
  readonly startsAtIso: string; // UTC ISO-8601
  readonly endsAtIso: string; // UTC ISO-8601
  readonly displayTimezone: IanaTimezone;
  readonly priceMinor: MinorCurrencyAmount;
  readonly currency: CurrencyCode;
  readonly resourceId?: UUID;
  readonly staffMemberId?: UUID;
  readonly sessionId?: UUID;
  readonly remainingCapacity?: number; // Populated for Model C
}

export type BookingSelectionTarget =
  | {
      readonly bookingModel: 'exclusive_resource';
      readonly resourceId: UUID;
      readonly serviceId?: UUID;
      readonly startsAt: Date;
      readonly endsAt: Date;
    }
  | {
      readonly bookingModel: 'staff_appointment';
      readonly serviceId: UUID;
      readonly staffMemberId: UUID;
      readonly startsAt: Date;
      readonly endsAt: Date;
    }
  | {
      readonly bookingModel: 'capacity_session';
      readonly sessionId: UUID;
      readonly quantity: number;
    };

export interface CreateBookingHoldCommand {
  readonly tenantId: UUID;
  readonly locationId: UUID;
  readonly idempotencyKey: string;
  readonly selection: BookingSelectionTarget;
  readonly customer: {
    readonly fullName: string;
    readonly phone: string; // Normalized E.164
    readonly email?: string;
    readonly notes?: string;
  };
  readonly couponCode?: string;
}

export interface BookingHoldResult {
  readonly bookingId: UUID;
  readonly bookingNumber: string;
  readonly holdId: UUID;
  readonly holdToken: string;
  readonly status: BookingStatus;
  readonly expiresAt: Date;
  readonly totalMinor: MinorCurrencyAmount;
  readonly currency: CurrencyCode;
}

export interface RescheduleBookingCommand {
  readonly tenantId: UUID;
  readonly bookingId: UUID;
  readonly idempotencyKey: string;
  readonly newSelection: BookingSelectionTarget;
  readonly reason?: string;
}
