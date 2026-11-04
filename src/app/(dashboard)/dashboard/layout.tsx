import type { ReactNode } from 'react';
import { DashboardLayoutShell } from '@/components/layout/dashboard/dashboard-layout-shell';

/**
 * Route Group Boundary: SMB Business Portal (`app.*`).
 * Restricted to `business_owner` and `business_staff` memberships for the active tenant.
 * Houses bookings calendar, availability management, payments/refunds, and analytics.
 */
export default function BusinessDashboardLayout({ children }: { readonly children: ReactNode }) {
  return <DashboardLayoutShell userRole="business_owner">{children}</DashboardLayoutShell>;
}
