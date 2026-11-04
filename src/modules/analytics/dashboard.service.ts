import type { AuthenticatedActor } from '@/modules/auth/session.types';
import type { CurrencyCode, MinorCurrencyAmount, UUID } from '@/types/domain';

export interface DashboardDateRangeFilter {
  readonly tenantId: UUID;
  readonly locationId?: UUID;
  readonly fromDateLocal: string; // YYYY-MM-DD in location timezone
  readonly toDateLocal: string;
}

export interface BusinessDashboardOverview {
  readonly currency: CurrencyCode;
  readonly grossRevenueMinor: MinorCurrencyAmount;
  readonly netRevenueMinor: MinorCurrencyAmount;
  readonly confirmedBookingsCount: number;
  readonly cancelledBookingsCount: number;
  readonly repeatCustomerCount: number;
  readonly overallUtilisationPercent: number;
  readonly topResources: ReadonlyArray<{
    readonly resourceId: UUID;
    readonly resourceName: string;
    readonly bookedHours: number;
    readonly utilisationPercent: number;
    readonly revenueMinor: MinorCurrencyAmount;
  }>;
  readonly topStaff: ReadonlyArray<{
    readonly staffMemberId: UUID;
    readonly displayName: string;
    readonly completedAppointments: number;
    readonly revenueMinor: MinorCurrencyAmount;
  }>;
}

export interface BusinessDashboardServicePort {
  getOverview(
    actor: AuthenticatedActor,
    filter: DashboardDateRangeFilter,
  ): Promise<BusinessDashboardOverview>;
}
