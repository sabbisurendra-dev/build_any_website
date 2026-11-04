import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function DashboardStaffPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Staff & Providers</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Staff availability schedules, assigned services, and booking permissions.
        </p>
      </div>

      <Card className="border-dashed bg-muted/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Route Verified</Badge>
            <CardTitle className="text-base">Staff Directory</CardTitle>
          </div>
          <CardDescription>
            Provider rosters and schedules scheduled for Prompt C.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
