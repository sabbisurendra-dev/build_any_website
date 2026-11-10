import type { UUID, BookingStatus } from '@/types/domain';
import type { AuthenticatedActor } from '@/modules/auth/session.types';
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

export interface BookingRepositoryPort {
  resolveTenant(tenantIdOrSlug: string): Promise<MockTenant | null>;
  findResource(tenantId: UUID, resourceId: UUID): Promise<CatalogResourceEntity | null>;
  findService(tenantId: UUID, serviceId: UUID): Promise<CatalogServiceEntity | null>;
  findStaff(tenantId: UUID, staffMemberId: UUID): Promise<CatalogStaffEntity | null>;
  findSession(tenantId: UUID, sessionId: UUID): Promise<CatalogSessionEntity | null>;
  findBookingById(tenantId: UUID, bookingId: UUID): Promise<RuntimeBookingRecord | null>;
  findBookingByIdempotency(tenantId: UUID, idempotencyKey: string): Promise<RuntimeBookingRecord | null>;
  listBookings(
    tenantId: UUID,
    filter?: { status?: BookingStatus; dateLocal?: string; locationId?: UUID },
  ): Promise<RuntimeBookingRecord[]>;
  createHold(
    command: CreateBookingHoldCommand,
    options?: { excludeAllocationId?: UUID },
  ): Promise<BookingHoldResult>;
  claimHold(tenantId: UUID, bookingId: UUID, holdToken: string): Promise<void>;
  releaseHold(tenantId: UUID, bookingId: UUID, holdToken?: string): Promise<void>;
  confirmBooking(
    tenantId: UUID,
    bookingId: UUID,
    paymentDetails: {
      paymentId?: UUID;
      paymentMethod?: 'upi' | 'card' | 'cash';
      amountPaidMinor?: number;
    },
  ): Promise<RuntimeBookingRecord>;
  rescheduleBooking(command: RescheduleBookingCommand): Promise<BookingHoldResult>;
  cancelBooking(
    tenantId: UUID,
    bookingId: UUID,
    reason?: string,
    actor?: AuthenticatedActor,
  ): Promise<RuntimeBookingRecord>;
  savePayment(payment: RuntimePaymentRecord): Promise<void>;
  saveRefund(refund: RuntimeRefundRecord): Promise<void>;
  findPayment(tenantId: UUID, paymentId: UUID): Promise<RuntimePaymentRecord | null>;
  resetForTests?(): void;
}
