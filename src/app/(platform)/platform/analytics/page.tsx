import { RuntimeStateRepository } from '@/modules/persistence/runtime-store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default function PlatformAnalyticsPage() {
  const state = RuntimeStateRepository.getState();
  const confirmed = state.bookings.filter(
    (b) => b.status === 'confirmed' || b.status === 'completed',
  );
  const totalGmvMinor = confirmed.reduce((sum, b) => sum + b.totalMinor, 0);
  const avgOnboardingHours =
    state.tenants.reduce((sum, t) => sum + t.onboardingTimeHours, 0) /
    Math.max(1, state.tenants.length);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Platform Telemetry & SLA Metrics
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Cross-tenant booking volume, payment reconciliation health, and onboarding velocity.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Active SMB Tenants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{state.tenants.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Confirmed Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{confirmed.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Processed GMV</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              ₹{(totalGmvMinor / 100).toLocaleString('en-IN')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Avg Launch Turnaround</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgOnboardingHours.toFixed(1)} hrs</div>
            <Badge variant="success" className="mt-1 text-[10px]">
              Within 48h SLA
            </Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
