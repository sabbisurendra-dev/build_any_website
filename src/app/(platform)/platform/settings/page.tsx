import { RuntimeStateRepository } from '@/modules/persistence/runtime-store';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default function PlatformSettingsPage() {
  const state = RuntimeStateRepository.getState();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Platform Governance & Audit Log
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Security parameters, hold TTL defaults, and immutable administrative audit records.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Engine Runtime Guards</CardTitle>
          <CardDescription>Enforced across all tenant websites and API endpoints</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 rounded-lg border border-border bg-muted/20">
            <div className="text-muted-foreground">Temporary Slot Hold TTL</div>
            <div className="text-base font-bold font-mono mt-1">480 Seconds (8m)</div>
          </div>
          <div className="p-3 rounded-lg border border-border bg-muted/20">
            <div className="text-muted-foreground">Payment Verification Mode</div>
            <div className="text-base font-bold font-mono mt-1">HMAC-SHA256 Strict</div>
          </div>
          <div className="p-3 rounded-lg border border-border bg-muted/20">
            <div className="text-muted-foreground">Default Tenant Timezone</div>
            <div className="text-base font-bold font-mono mt-1">Asia/Kolkata (IST)</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Administrative Audit Trail ({state.auditLogs.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          {state.auditLogs.length === 0 ? (
            <p className="text-muted-foreground">
              Provision a new tenant or publish a layout to record administrative audit entries.
            </p>
          ) : (
            state.auditLogs.slice(0, 10).map((log, i) => (
              <div
                key={i}
                className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg border border-border"
              >
                <div>
                  <span className="font-mono font-semibold text-foreground">{log.action}</span>
                  <span className="text-muted-foreground ml-2">
                    ({log.entityType}: {log.entityId})
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {log.actorRole}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
