import { RuntimeStateRepository } from '@/modules/persistence/runtime-store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default function DashboardResourcesPage() {
  const state = RuntimeStateRepository.getState();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Courts, Turfs & Physical Resources
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Exclusive resources (Model A) with daytime/peak floodlit pricing and maintenance status.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {state.resources.map((res) => (
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
    </div>
  );
}
