import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function DashboardSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Business Settings & Venue Policies</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Operating hours, cross-midnight rules, cancellation policies, and payment setup.
        </p>
      </div>

      <Card className="border-dashed bg-muted/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Route Verified</Badge>
            <CardTitle className="text-base">Settings Panel</CardTitle>
          </div>
          <CardDescription>
            Business policies and payment configuration scheduled for Prompt C.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
