import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function DashboardCustomersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Customer Directory</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          End-customer profiles, mobile numbers, booking frequency, and notes.
        </p>
      </div>

      <Card className="border-dashed bg-muted/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Route Verified</Badge>
            <CardTitle className="text-base">Customer Management</CardTitle>
          </div>
          <CardDescription>
            Customer search, history, and communication tools scheduled for Prompt C.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
