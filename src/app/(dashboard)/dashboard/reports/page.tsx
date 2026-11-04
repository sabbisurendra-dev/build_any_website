import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function DashboardReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Reports & Revenue Analytics</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Daily, weekly, and monthly revenue trends, payment reconciliation, and court utilisation rates.
        </p>
      </div>

      <Card className="border-dashed bg-muted/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Route Verified</Badge>
            <CardTitle className="text-base">Operational Reports</CardTitle>
          </div>
          <CardDescription>
            Comprehensive analytics and report exports scheduled for Prompt C.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
