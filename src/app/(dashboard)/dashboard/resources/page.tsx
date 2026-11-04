import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function DashboardResourcesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Resources & Courts</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Exclusive bookable physical assets (Turf 1, Turf 2, Box Cricket) with independent slot durations and peak rates.
        </p>
      </div>

      <Card className="border-dashed bg-muted/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Route Verified</Badge>
            <CardTitle className="text-base">Resource Inventory</CardTitle>
          </div>
          <CardDescription>
            Resource management and pricing rules scheduled for Prompt C.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
