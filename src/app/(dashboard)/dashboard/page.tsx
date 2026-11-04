import { Calendar, DollarSign, Users, Trophy } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function DashboardOverviewPage() {
  return (
    <div className="space-y-6">
      {/* Venue Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Kickoff Football Turf & Arena</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Indiranagar Arena • Dual 5v5 & 7v7 synthetic courts • Operational
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild className="gap-2">
            <Link href="/dashboard/bookings">
              <Calendar className="h-4 w-4" />
              <span>Open Calendar</span>
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/s/kickoff-turf" target="_blank">
              <span>View Customer Site</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Todays Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">8 Slots</div>
            <p className="text-xs text-muted-foreground mt-1">4 morning, 4 evening floodlit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Todays Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">₹9,600</div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">100% UPI verified</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Peak Court Utilisation</CardTitle>
            <Trophy className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">92%</div>
            <p className="text-xs text-muted-foreground mt-1">Slots between 6 PM – 11 PM</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Repeat Customers</CardTitle>
            <Users className="h-4 w-4 text-sky-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">64%</div>
            <p className="text-xs text-muted-foreground mt-1">Last 30 days retention</p>
          </CardContent>
        </Card>
      </div>

      {/* Prompt Status Notice */}
      <Card className="border-dashed bg-muted/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Prompt B Layout Verified</Badge>
            <CardTitle className="text-base">Business Dashboard Navigation Operational</CardTitle>
          </div>
          <CardDescription>
            Sidebar navigation, location switcher, role-based visibility, and layout shell are verified. Interactive bookings calendar, slot matrices, and revenue analytics will be implemented in Prompt C.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
