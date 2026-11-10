import { RuntimeStateRepository } from '@/modules/persistence/runtime-store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Scissors } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface DashboardServicesPageProps {
  readonly searchParams?: Promise<{ readonly tenant?: string }>;
}

export default async function DashboardServicesPage({ searchParams }: DashboardServicesPageProps) {
  const params = await searchParams;
  const state = RuntimeStateRepository.getState();
  const defaultTenant = state.tenants[0]?.id ?? 't-kickoff-01';
  const tenantQuery = params?.tenant ?? defaultTenant;
  const activeTenant =
    state.tenants.find(
      (t) => t.id === tenantQuery || t.slug.toLowerCase() === tenantQuery.toLowerCase(),
    ) ?? state.tenants[0];
  const activeTenantId = activeTenant?.id ?? defaultTenant;

  const tenantServices = state.services.filter((srv) => srv.tenantId === activeTenantId);
  const tenantSessions = state.sessions.filter((sess) => sess.tenantId === activeTenantId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Services, Treatments & Group Batches
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configured clinical/salon services (Model B) and capacity-based class sessions (Model C).
          </p>
        </div>
        {activeTenant && (
          <Badge variant="outline" className="self-start sm:self-auto text-xs font-mono py-1 px-2.5">
            Tenant: {activeTenant.name} ({activeTenant.slug})
          </Badge>
        )}
      </div>

      {tenantServices.length === 0 && tenantSessions.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Scissors className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium">No services or group sessions configured for this tenant.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tenantServices.map((srv) => (
            <Card key={srv.id}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{srv.name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{srv.description}</p>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  ₹{(srv.priceMinor / 100).toLocaleString('en-IN')}
                </Badge>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Duration: {srv.durationMinutes}m • Post-appointment buffer: {srv.bufferAfterMinutes}m
              </CardContent>
            </Card>
          ))}

          {tenantSessions.map((sess) => (
            <Card key={sess.id}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{sess.name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Instructor: {sess.instructorName} ({sess.startTime} – {sess.endTime})
                  </p>
                </div>
                <Badge variant="secondary" className="font-mono text-xs">
                  {Math.max(0, sess.maxCapacity - sess.bookedCount - sess.heldCount)}/{sess.maxCapacity} left
                </Badge>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Fee: ₹{(sess.priceMinor / 100).toLocaleString('en-IN')} per participant seat
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
