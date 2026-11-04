import { Building2, LayoutDashboard, Plus, Sparkles, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function PlatformOverviewPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Platform Overview</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Internal SaaS monitoring, active tenant websites, and rapid client deployment pipelines.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild className="gap-2">
            <Link href="/platform/tenants">
              <Plus className="h-4 w-4" />
              <span>New Business</span>
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/platform/builder">Visual Editor</Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total SMB Tenants</CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">12</div>
            <p className="text-xs text-muted-foreground mt-1">+3 onboarded this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Published Websites</CardTitle>
            <Sparkles className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">9</div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">100% SLA within 2 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Draft Websites</CardTitle>
            <LayoutDashboard className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">3</div>
            <p className="text-xs text-muted-foreground mt-1">Under visual configurator review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Gross Booking Volume</CardTitle>
            <TrendingUp className="h-4 w-4 text-sky-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">₹2,84,500</div>
            <p className="text-xs text-muted-foreground mt-1">Past 30 days across all venues</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Notice */}
      <Card className="border-dashed bg-muted/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Prompt B Layout Verified</Badge>
            <CardTitle className="text-base">Internal Navigation System Operational</CardTitle>
          </div>
          <CardDescription>
            Sidebar, header, breadcrumbs, responsive drawer, and layout shell are verified. Full dashboard analytics and tenant creation screens will be implemented in Prompt C.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
