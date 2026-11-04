import type { AuthenticatedActor } from '@/modules/auth/session.types';
import { assertTenantPermission } from '@/modules/auth/rbac';
import type {
  BusinessDashboardOverview,
  BusinessDashboardServicePort,
  DashboardDateRangeFilter,
} from './dashboard.service';
import { MOCK_BOOKINGS } from '@/lib/mock-data/mock-bookings';
import { MOCK_RESOURCES } from '@/lib/mock-data/mock-resources';

export class BusinessDashboardServiceImpl implements BusinessDashboardServicePort {
  public async getOverview(
    actor: AuthenticatedActor,
    filter: DashboardDateRangeFilter,
  ): Promise<BusinessDashboardOverview> {
    assertTenantPermission(actor, filter.tenantId, 'analytics:read');

    // Aggregate confirmed & completed bookings for this tenant
    const tenantBookings = MOCK_BOOKINGS.filter((b) => b.tenantId === filter.tenantId);
    const confirmed = tenantBookings.filter((b) => b.status === 'confirmed' || b.status === 'completed');
    const cancelled = tenantBookings.filter((b) => b.status === 'cancelled');

    const grossRevenueMinor = confirmed.reduce((acc, curr) => acc + curr.amountMinor, 0);
    // Platform fee deduction: 2% simulated SaaS processing fee
    const netRevenueMinor = Math.round(grossRevenueMinor * 0.98);

    const topResources = MOCK_RESOURCES.map((r) => {
      const resBookings = confirmed.filter((b) => b.resourceOrServiceName === r.name);
      const bookedHours = resBookings.length;
      const rev = resBookings.reduce((sum, curr) => sum + curr.amountMinor, 0);

      return {
        resourceId: r.id,
        resourceName: r.name,
        bookedHours,
        utilisationPercent: Math.min(Math.round((bookedHours / 8) * 100), 100),
        revenueMinor: rev,
      };
    });

    return {
      currency: 'INR',
      grossRevenueMinor,
      netRevenueMinor,
      confirmedBookingsCount: confirmed.length,
      cancelledBookingsCount: cancelled.length,
      repeatCustomerCount: 4,
      overallUtilisationPercent: 88,
      topResources,
      topStaff: [
        {
          staffMemberId: 'st-01',
          displayName: 'Arena Manager (Day Shift)',
          completedAppointments: confirmed.length,
          revenueMinor: grossRevenueMinor,
        },
      ],
    };
  }
}
