import { RuntimeStateRepository } from '@/modules/persistence/runtime-store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default function DashboardSettingsPage() {
  const state = RuntimeStateRepository.getState();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Business Settings & Venue Policies
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Timezone configuration, checkout hold TTL, cancellation rules, and payment gateway status.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Slot Hold & Concurrency Policy</CardTitle>
            <Badge variant="default">Active</Badge>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1.5">
            <div>Temporary Hold TTL: 10 minutes (lazy + cron expiration)</div>
            <div>Timezone Standard: Asia/Kolkata (IST, UTC+05:30)</div>
            <div>Late Webhook Reconciliation: Automatic SAVEPOINT re-acquire or instant refund</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Payment & Notification Gateways</CardTitle>
            <Badge variant="outline">HMAC Enforced</Badge>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1.5">
            <div>Primary Currency: INR (minor paise integer accounting)</div>
            <div>Configured Tenants on Instance: {state.tenants.length}</div>
            <div>Transactional Channels: WhatsApp Business + SMS Fallback</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
