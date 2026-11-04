import { RuntimeStateRepository } from '@/modules/persistence/runtime-store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default function DashboardReportsPage() {
  const state = RuntimeStateRepository.getState();

  const activeBookings = state.bookings.filter(
    (b) => b.status === 'confirmed' || b.status === 'completed',
  );
  const grossMinor = activeBookings.reduce((acc, b) => acc + b.totalMinor, 0);
  const cancelledCount = state.bookings.filter((b) => b.status === 'cancelled').length;

  const byModel = {
    exclusive_resource: activeBookings.filter((b) => b.bookingModel === 'exclusive_resource'),
    staff_appointment: activeBookings.filter((b) => b.bookingModel === 'staff_appointment'),
    capacity_session: activeBookings.filter((b) => b.bookingModel === 'capacity_session'),
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Reports & Revenue Analytics</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Live revenue reconciliation, cancellation rates, and performance across booking models.
        </p>
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
              {state.refunds.length} automated refunds processed
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
            <div className="text-2xl font-bold font-mono">{state.notifications.length}</div>
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
            <CardTitle className="text-sm">Group Sessions (Model C)</CardTitle>
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
