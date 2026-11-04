import Link from 'next/link';
import { Sparkles, Building2, ExternalLink, ArrowRight, ShieldCheck, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function RootHomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="font-bold tracking-tight text-lg">Antigravity SlotBook</span>
            <Badge variant="outline" className="ml-2 text-[10px] font-mono">
              v0.1.0 ARCHITECTURE
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/platform">Platform Console</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/dashboard">Business Dashboard</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Gateway Hub */}
      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 text-center space-y-12">
        <div className="space-y-4 max-w-2xl mx-auto">
          <Badge variant="success" className="uppercase font-mono text-[11px] px-3 py-1">
            Multi-Tenant SaaS Foundation Ready
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-foreground">
            SMB Website Builder & Slot Booking Platform
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
            Select one of the three isolated application surfaces to explore navigation, layout boundaries, and design system components.
          </p>
        </div>

        {/* 3 Application Surfaces */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {/* Surface 1: Platform Console */}
          <Card className="flex flex-col justify-between border-border hover:border-primary/50 transition-colors shadow-sm">
            <CardHeader className="space-y-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">Platform Console</CardTitle>
              <CardDescription>
                Internal SaaS console for Super Admins and Configurators to provision tenants, manage templates, and launch websites in 1–2 days.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1.5">
              <p>• Hostname: <code className="text-foreground">platform.domain</code></p>
              <p>• Roles: <span className="text-foreground">Super Admin, Configurator</span></p>
              <p>• Metabase-style visual grid editor</p>
            </CardContent>
            <CardFooter className="pt-2">
              <Button asChild className="w-full gap-2">
                <Link href="/platform">
                  <span>Open Console</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Surface 2: Business Dashboard */}
          <Card className="flex flex-col justify-between border-border hover:border-emerald-500/50 transition-colors shadow-sm">
            <CardHeader className="space-y-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <Building2 className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">Business Dashboard</CardTitle>
              <CardDescription>
                Operational portal for SMB business owners and staff to manage live court/clinic bookings, schedules, customers, and revenue.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1.5">
              <p>• Hostname: <code className="text-foreground">app.domain</code></p>
              <p>• Roles: <span className="text-foreground">Business Owner, Staff</span></p>
              <p>• Multi-location venue management</p>
            </CardContent>
            <CardFooter className="pt-2">
              <Button asChild variant="outline" className="w-full gap-2 border-emerald-600/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10">
                <Link href="/dashboard">
                  <span>Open Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Surface 3: Public Customer Website */}
          <Card className="flex flex-col justify-between border-border hover:border-sky-500/50 transition-colors shadow-sm">
            <CardHeader className="space-y-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
                <Calendar className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">Public Customer Site</CardTitle>
              <CardDescription>
                Branded customer-facing website with real-time slot selection, zero double-booking concurrency protection, and UPI checkout.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1.5">
              <p>• Hostname: <code className="text-foreground">tenant.domain</code></p>
              <p>• Audience: <span className="text-foreground">End Customers</span></p>
              <p>• Live reference: <span className="text-foreground">Kickoff Football Turf</span></p>
            </CardContent>
            <CardFooter className="pt-2">
              <Button asChild variant="secondary" className="w-full gap-2">
                <Link href="/s/kickoff-turf">
                  <span>Visit Demo Site</span>
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        <p>Antigravity Multi-Tenant SaaS Platform • India-First SMB Booking Engine</p>
      </footer>
    </div>
  );
}
