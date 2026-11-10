import { RuntimeStateRepository } from '@/modules/persistence/runtime-store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

interface DashboardReportsPageProps {
  readonly searchParams?: Promise<{ readonly tenant?: string }>;
}

export default async function DashboardReportsPage({ searchParams }: DashboardReportsPageProps) {
  const params = await searchParams;
  const state = RuntimeStateRepository.getState();
  const defaultTenant = state.tenants[0]?.id ?? 't-kickoff-01';
  const tenantQuery = params?.tenant ?? defaultTenant;
  const activeTenant =
    state.tenants.find(
      (t) => t.id === tenantQuery || t.slug.toLowerCase() === tenantQuery.toLowerCase(),
    ) ?? state.tenants[0];
  const activeTenantId = activeTenant?.id ?? defaultTenant;

  const tenantBookings = state.bookings.filter((b) => b.tenantId === activeTenantId);
  const tenantRefunds = state.refunds.filter((r) => r.tenantId === activeTenantId);
  const tenantNotifications = state.notifications.filter((n) => n.tenantId === activeTenantId);

  const activeBookings = tenantBookings.filter(
    (b) => b.status === 'confirmed' || b.status === 'completed',
  );
  const grossMinor = activeBookings.reduce((acc, b) => acc + b.totalMinor, 0);
  const cancelledCount = tenantBookings.filter((b) => b.status === 'cancelled').length;

  const byModel = {
    exclusive_resource: activeBookings.filter((b) => b.bookingModel === 'exclusive_resource'),
    staff_appointment: activeBookings.filter((b) => b.bookingModel === 'staff_appointment'),
    capacity_session: activeBookings.filter((b) => b.bookingModel === 'capacity_session'),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Reports & Revenue Analytics</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Live revenue reconciliation, cancellation rates, and performance across booking models.
          </p>
        </div>
        {activeTenant && (
          <Badge variant="outline" className="self-start sm:self-auto text-xs font-mono py-1 px-2.5">
            Tenant: {activeTenant.name} ({activeTenant.slug})
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">
              Confirmed Gross Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              ₹{(grossMinor / 100).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {activeBookings.length} active/completed bookings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">
              Cancellations & Refunds
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{cancelledCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {tenantRefunds.length} automated refunds processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">
              Notification Outbox
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{tenantNotifications.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              WhatsApp & SMS transactional dispatches queued
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Exclusive Facilities (Model A)</CardTitle>
            <Badge variant="outline">{byModel.exclusive_resource.length}</Badge>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Revenue: ₹
            {(
              byModel.exclusive_resource.reduce((sum, b) => sum + b.totalMinor, 0) / 100
            ).toLocaleString('en-IN')}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Staff Appointments (Model B)</CardTitle>
            <Badge variant="outline">{byModel.staff_appointment.length}</Badge>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Revenue: ₹
            {(
              byModel.staff_appointment.reduce((sum, b) => sum + b.totalMinor, 0) / 100
            ).toLocaleString('en-IN')}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Group Batches (Model C)</CardTitle>
            <Badge variant="outline">{byModel.capacity_session.length}</Badge>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Revenue: ₹
            {(
              byModel.capacity_session.reduce((sum, b) => sum + b.totalMinor, 0) / 100
            ).toLocaleString('en-IN')}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
