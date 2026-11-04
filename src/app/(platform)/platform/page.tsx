import Link from 'next/link';
import {
  Building2,
  Sparkles,
  LayoutDashboard,
  TrendingUp,
  Plus,
  PanelsTopLeft,
  LayoutTemplate,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  CalendarCheck2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MOCK_TENANTS } from '@/lib/mock-data/mock-tenants';
import { MOCK_BOOKINGS } from '@/lib/mock-data/mock-bookings';

export default function PlatformOverviewPage() {
  const totalTenants = MOCK_TENANTS.length;
  const publishedCount = MOCK_TENANTS.filter((t) => t.websiteStatus === 'published').length;
  const draftCount = MOCK_TENANTS.filter((t) => t.websiteStatus === 'draft').length;
  const totalRevenuePaise = MOCK_TENANTS.reduce((sum, t) => sum + t.stats.monthlyRevenueMinor, 0);
  const totalRevenueFormatted = `₹${(totalRevenuePaise / 100).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-8">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Platform Console</h2>
            <Badge variant="outline" className="font-mono text-xs">SLA: 1–2 Days</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Rapid tenant provisioning, Metabase visual website generation, and booking engine telemetry.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button asChild className="gap-2 bg-primary text-primary-foreground shadow-xs">
            <Link href="/platform/tenants">
              <Plus className="h-4 w-4" />
              <span>Create Business</span>
            </Link>
          </Button>
          <Button variant="outline" asChild className="gap-2">
            <Link href="/platform/builder">
              <PanelsTopLeft className="h-4 w-4" />
              <span>Visual Editor</span>
            </Link>
          </Button>
          <Button variant="ghost" asChild className="gap-2">
            <Link href="/platform/templates">
              <LayoutTemplate className="h-4 w-4" />
              <span>Templates</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-xs hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Onboarded Tenants
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Building2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalTenants} SMBs</div>
            <p className="text-xs text-muted-foreground mt-1">Sports, clinics, salons, fitness</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs hover:border-emerald-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Live Websites
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {publishedCount} Published
            </div>
            <p className="text-xs text-muted-foreground mt-1">Avg 24h deployment turnaround</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs hover:border-amber-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Draft Layouts
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <LayoutDashboard className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{draftCount} in Config</div>
            <p className="text-xs text-muted-foreground mt-1">Metabase 12-col grid editor</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs hover:border-sky-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Platform GMV
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalRevenueFormatted}</div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">100% verified Indian UPI & Cards</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Sections: Active Tenants Table + Recent Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Tenant List & 1-2 Day Delivery Pipeline */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-foreground">Active SMB Client Deployments</h3>
              <p className="text-xs text-muted-foreground">Managed businesses configured and operating on the platform.</p>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs gap-1">
              <Link href="/platform/tenants">
                <span>View All</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden shadow-xs">
            {MOCK_TENANTS.map((tenant) => (
              <div key={tenant.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 hover:bg-muted/40 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">{tenant.name}</span>
                    <Badge variant={tenant.websiteStatus === 'published' ? 'success' : 'warning'} className="text-[10px] py-0 capitalize">
                      {tenant.websiteStatus} v{tenant.publishedVersion}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>{tenant.location.city}</span>
                    <span>•</span>
                    <span className="capitalize">{tenant.vertical.replace('_', ' ')}</span>
                    <span>•</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                      ₹{(tenant.stats.monthlyRevenueMinor / 100).toLocaleString('en-IN')} / mo
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <div className="hidden sm:flex flex-col text-right text-xs">
                    <span className="font-medium text-foreground">{tenant.onboardingTimeHours}h SLA</span>
                    <span className="text-[10px] text-muted-foreground">Target: ≤48h</span>
                  </div>
                  <Button variant="outline" size="sm" asChild className="text-xs h-8">
                    <Link href={`/platform/builder?tenant=${tenant.slug}`}>
                      <span>Edit Layout</span>
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild className="text-xs h-8">
                    <Link href={`/s/${tenant.slug}`} target="_blank">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Live Activity Stream & Architecture Invariant Checks */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-foreground">Operational Telemetry</h3>
            <p className="text-xs text-muted-foreground">Real-time concurrency and deployment events.</p>
          </div>

          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <CardTitle className="text-sm font-semibold">Integrity Watchdog</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">PostgreSQL GiST Range Exclusion</p>
                  <p className="text-muted-foreground">0 double-booking collisions across 342 reservations.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">HMAC Webhook Signature Verification</p>
                  <p className="text-muted-foreground">100% gateway callbacks verified in constant time.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">Booking Hold TTL Expiry Worker</p>
                  <p className="text-muted-foreground">Active 480s hold cleaner running without contention.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Booking Activity */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CalendarCheck2 className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">Recent Booking Events</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {MOCK_BOOKINGS.slice(0, 4).map((bk) => (
                <div key={bk.id} className="flex items-center justify-between text-xs border-b border-border/50 pb-2 last:border-0 last:pb-0">
                  <div className="space-y-0.5">
                    <p className="font-medium text-foreground">{bk.customerName}</p>
                    <p className="text-muted-foreground text-[11px]">{bk.resourceOrServiceName}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={bk.status === 'confirmed' ? 'success' : 'warning'} className="text-[10px] py-0 capitalize">
                      {bk.status.replace('_', ' ')}
                    </Badge>
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                      ₹{(bk.amountMinor / 100).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
