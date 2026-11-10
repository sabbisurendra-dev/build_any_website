import { RuntimeStateRepository } from '@/modules/persistence/runtime-store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface DashboardResourcesPageProps {
  readonly searchParams?: Promise<{ readonly tenant?: string }>;
}

export default async function DashboardResourcesPage({ searchParams }: DashboardResourcesPageProps) {
  const params = await searchParams;
  const state = RuntimeStateRepository.getState();
  const defaultTenant = state.tenants[0]?.id ?? 't-kickoff-01';
  const tenantQuery = params?.tenant ?? defaultTenant;
  const activeTenant =
    state.tenants.find(
      (t) => t.id === tenantQuery || t.slug.toLowerCase() === tenantQuery.toLowerCase(),
    ) ?? state.tenants[0];
  const activeTenantId = activeTenant?.id ?? defaultTenant;

  const tenantResources = state.resources.filter((res) => res.tenantId === activeTenantId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Courts, Turfs & Physical Resources
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Exclusive resources (Model A) with daytime/peak floodlit pricing and maintenance status.
          </p>
        </div>
        {activeTenant && (
          <Badge variant="outline" className="self-start sm:self-auto text-xs font-mono py-1 px-2.5">
            Tenant: {activeTenant.name} ({activeTenant.slug})
          </Badge>
        )}
      </div>

      {tenantResources.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Trophy className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium">No bookable resources configured for this tenant.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tenantResources.map((res) => (
            <Card key={res.id}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{res.name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{res.description}</p>
                </div>
                <Badge variant={res.isActive ? 'success' : 'secondary'} className="text-[10px]">
                  {res.isActive ? 'Active' : 'Maintenance'}
                </Badge>
              </CardHeader>
              <CardContent className="text-xs space-y-1.5 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Base Rate:</span>
                  <span className="font-mono font-semibold text-foreground">
                    ₹{(res.basePriceMinor / 100).toLocaleString('en-IN')}/hr
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Peak Rate (6 PM+):</span>
                  <span className="font-mono font-semibold text-foreground">
                    ₹{(res.peakPriceMinor / 100).toLocaleString('en-IN')}/hr
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Operating Hours:</span>
                  <span className="font-mono text-foreground">{res.operatingHoursLabel}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
