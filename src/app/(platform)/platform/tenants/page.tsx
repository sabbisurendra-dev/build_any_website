'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  PanelsTopLeft,
  ExternalLink,
  MapPin,
  Clock,
  Phone,
  Globe,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MOCK_TENANTS, type MockTenant } from '@/lib/mock-data/mock-tenants';
import type { BusinessVertical } from '@/types/domain';
import { useToast } from '@/components/ui/toast';

export default function PlatformTenantsPage() {
  const { toast } = useToast();
  const [tenants, setTenants] = React.useState<MockTenant[]>(MOCK_TENANTS);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedVertical, setSelectedVertical] = React.useState<string>('all');
  const [selectedTenant, setSelectedTenant] = React.useState<MockTenant | null>(null);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);

  // New business form state
  const [formName, setFormName] = React.useState('');
  const [formSlug, setFormSlug] = React.useState('');
  const [formVertical, setFormVertical] = React.useState<BusinessVertical>('sports_turf');
  const [formCity, setFormCity] = React.useState('Bengaluru');
  const [formAddress, setFormAddress] = React.useState('');
  const [formPlan, setFormPlan] = React.useState<'starter' | 'growth' | 'pro'>('growth');

  // Filtered tenants
  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.location.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesVertical = selectedVertical === 'all' || t.vertical === selectedVertical;
    return matchesSearch && matchesVertical;
  });

  const handleCreateTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formSlug.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please provide both business name and URL slug.',
        variant: 'destructive',
      });
      return;
    }

    const newTenant: MockTenant = {
      id: `t-${Date.now().toString(36)}`,
      name: formName.trim(),
      slug: formSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      vertical: formVertical,
      status: 'active',
      defaultCurrency: 'INR',
      plan: formPlan,
      domain: `${formSlug.trim().toLowerCase()}.localhost:3000`,
      websiteStatus: 'draft',
      publishedVersion: 1,
      location: {
        name: `${formName.trim()} Primary Venue`,
        city: formCity,
        state: 'Karnataka',
        address: formAddress.trim() || 'Main High Street, Central Road',
        phone: '+91 98000 11223',
        timezone: 'Asia/Kolkata',
      },
      stats: {
        totalBookings: 0,
        monthlyRevenueMinor: 0,
        utilizationRate: 0,
      },
      createdAt: new Date().toISOString(),
      onboardingTimeHours: 1,
    };

    setTenants((prev) => [newTenant, ...prev]);
    setIsCreateOpen(false);
    toast({
      title: 'Tenant Provisioned Successfully',
      description: `${formName} has been initialized with the 12-column starter blueprint.`,
      variant: 'success',
    });

    // Reset form
    setFormName('');
    setFormSlug('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">SMB Tenant Directory</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage multi-tenant business profiles, location timezones, subscription plans, and website deployments.
          </p>
        </div>

        {/* Create Business Modal */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-primary text-primary-foreground shadow-xs">
              <Plus className="h-4 w-4" />
              <span>Create New Business</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Provision New SMB Tenant</DialogTitle>
              <DialogDescription>
                Initializes an isolated tenant container, default location timezone, and seeds the starter website layout.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateTenant} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="biz-name">Business Legal / Display Name</Label>
                  <Input
                    id="biz-name"
                    placeholder="e.g. Strike Arena Football Turf"
                    value={formName}
                    onChange={(e) => {
                      setFormName(e.target.value);
                      if (!formSlug) {
                        setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                      }
                    }}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="biz-slug">Subdomain Slug</Label>
                  <Input
                    id="biz-slug"
                    placeholder="strike-arena"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">{formSlug || 'slug'}.localhost:3000</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="biz-vertical">Industry Vertical</Label>
                  <Select value={formVertical} onValueChange={(val) => setFormVertical(val as BusinessVertical)}>
                    <SelectTrigger id="biz-vertical">
                      <SelectValue placeholder="Select vertical" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sports_turf">Sports Turf (Football/Cricket)</SelectItem>
                      <SelectItem value="racquet_court">Racquet Venue (Badminton/Tennis)</SelectItem>
                      <SelectItem value="clinic_healthcare">Clinic & Doctors Practice</SelectItem>
                      <SelectItem value="salon_beauty">Salon, Spa & Beauty</SelectItem>
                      <SelectItem value="fitness_yoga">Yoga & Fitness Studio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="biz-city">Primary Location City</Label>
                  <Input
                    id="biz-city"
                    placeholder="Bengaluru"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="biz-plan">SaaS Subscription Plan</Label>
                  <Select value={formPlan} onValueChange={(val) => setFormPlan(val as 'starter' | 'growth' | 'pro')}>
                    <SelectTrigger id="biz-plan">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Starter (₹799/mo)</SelectItem>
                      <SelectItem value="growth">Growth (₹1,499/mo)</SelectItem>
                      <SelectItem value="pro">Pro Multi-Court (₹2,999/mo)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="biz-address">Address & Landmark</Label>
                  <Input
                    id="biz-address"
                    placeholder="e.g. 100 Feet Road, Near Metro Station"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Provision & Open Configurator</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by business name, city, or subdomain slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground hidden sm:inline" />
          <Select value={selectedVertical} onValueChange={setSelectedVertical}>
            <SelectTrigger className="w-[180px] text-xs">
              <SelectValue placeholder="All Verticals" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Verticals</SelectItem>
              <SelectItem value="sports_turf">Football Turfs</SelectItem>
              <SelectItem value="racquet_court">Badminton/Tennis</SelectItem>
              <SelectItem value="clinic_healthcare">Healthcare Clinics</SelectItem>
              <SelectItem value="salon_beauty">Salons & Spas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tenant Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTenants.map((tenant) => (
          <Card key={tenant.id} className="flex flex-col justify-between border-border hover:shadow-md transition-all">
            <CardHeader className="space-y-2 pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <CardTitle className="text-base line-clamp-1">{tenant.name}</CardTitle>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>{tenant.location.city}, {tenant.location.state}</span>
                  </p>
                </div>
                <Badge variant={tenant.websiteStatus === 'published' ? 'success' : 'warning'} className="text-[10px] capitalize shrink-0">
                  {tenant.websiteStatus}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 text-xs text-muted-foreground">
              <div className="flex items-center justify-between border-y border-border/60 py-2">
                <span className="capitalize">{tenant.vertical.replace('_', ' ')}</span>
                <span className="font-semibold text-foreground uppercase">{tenant.plan} Plan</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="rounded-lg bg-muted/50 p-2">
                  <span className="block text-sm font-bold text-foreground">{tenant.stats.totalBookings}</span>
                  <span className="text-[10px]">Bookings</span>
                </div>
                <div className="rounded-lg bg-muted/50 p-2">
                  <span className="block text-sm font-bold text-foreground">{tenant.stats.utilizationRate}%</span>
                  <span className="text-[10px]">Utilisation</span>
                </div>
                <div className="rounded-lg bg-muted/50 p-2">
                  <span className="block text-sm font-bold text-foreground">
                    ₹{(tenant.stats.monthlyRevenueMinor / 100000).toFixed(1)}k
                  </span>
                  <span className="text-[10px]">Revenue</span>
                </div>
              </div>

              {tenant.customDomain && (
                <div className="flex items-center gap-1.5 text-[11px] text-foreground pt-1">
                  <Globe className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="font-mono">{tenant.customDomain}</span>
                  <CheckCircle2 className="h-3 w-3 text-emerald-600 ml-auto" />
                </div>
              )}
            </CardContent>

            <CardFooter className="pt-2 border-t border-border flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTenant(tenant)}
                className="text-xs h-8 flex-1"
              >
                Details
              </Button>
              <Button size="sm" asChild className="text-xs h-8 gap-1.5 flex-1">
                <Link href={`/platform/builder?tenant=${tenant.slug}`}>
                  <PanelsTopLeft className="h-3.5 w-3.5" />
                  <span>Edit Layout</span>
                </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild className="h-8 w-8 shrink-0">
                <Link href={`/s/${tenant.slug}`} target="_blank">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Tenant Detail Modal */}
      {selectedTenant && (
        <Dialog open={!!selectedTenant} onOpenChange={(open) => !open && setSelectedTenant(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Badge variant={selectedTenant.websiteStatus === 'published' ? 'success' : 'warning'}>
                  {selectedTenant.websiteStatus}
                </Badge>
                <DialogTitle>{selectedTenant.name}</DialogTitle>
              </div>
              <DialogDescription>Tenant ID: {selectedTenant.id}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-xs py-2">
              <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Domain Route:</span>
                  <span className="font-mono font-medium text-foreground">{selectedTenant.domain}</span>
                </div>
                {selectedTenant.customDomain && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Custom SSL Domain:</span>
                    <span className="font-mono text-emerald-600 font-medium">{selectedTenant.customDomain}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Onboarding Turnaround SLA:</span>
                  <span className="font-semibold text-foreground">{selectedTenant.onboardingTimeHours} hours (Target ≤48h)</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  <span>Physical Venue Information</span>
                </h4>
                <p className="text-muted-foreground">{selectedTenant.location.address}, {selectedTenant.location.city}</p>
                <div className="flex items-center gap-4 text-muted-foreground pt-1">
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {selectedTenant.location.phone}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {selectedTenant.location.timezone}</span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedTenant(null)}>
                Close
              </Button>
              <Button asChild className="gap-2">
                <Link href={`/platform/builder?tenant=${selectedTenant.slug}`}>
                  <PanelsTopLeft className="h-4 w-4" />
                  <span>Open in Website Editor</span>
                </Link>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
