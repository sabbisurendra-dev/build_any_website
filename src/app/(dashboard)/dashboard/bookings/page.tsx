import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function DashboardBookingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Calendar & Bookings</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Live court timeline, walk-in appointments, confirmed bookings, and temporary holds.
        </p>
      </div>

      <Card className="border-dashed bg-muted/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Route Verified</Badge>
            <CardTitle className="text-base">Live Booking Calendar</CardTitle>
          </div>
          <CardDescription>
            Interactive timeline and slot management interface will be mounted here in Prompt C.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
