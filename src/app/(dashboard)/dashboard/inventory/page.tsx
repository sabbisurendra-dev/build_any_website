'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Package,
  Plus,
  Search,
  Truck,
  KeyRound,
  RefreshCw,
  Layers,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  BookOpen,
  Repeat,
  ArrowUpCircle,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import type {
  MasterDataTableRow,
  RuntimeCatalogueItem,
  RuntimeCustomerSubscription,
  RuntimeEntitlementRecord,
  RuntimeFulfilmentRecord,
} from '@/modules/commerce/commerce.types';
import type {
  CatalogueItemStatus,
  CatalogueItemType,
  FulfilmentStatus,
  FulfilmentType,
} from '@/types/domain';

type EnrichedCatalogueItem = RuntimeCatalogueItem & {
  stockOnHand: number | null;
  stockReserved: number | null;
  stockAvailable: number | null;
  derivedStatus: 'dormant' | 'unavailable' | 'available' | 'sold' | 'ready_to_upgrade';
};

interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  vertical: string;
}

const TENANT_OPTIONS: TenantSummary[] = [
  { id: 't-uni-06', name: 'OmniMarket Universal Store, Turf & Academy', slug: 'omni-market', vertical: 'universal_commerce' },
  { id: 't-kickoff-01', name: 'Kickoff Turf Arena', slug: 'kickoff-turf', vertical: 'sports_turf' },
  { id: 't-apex-02', name: 'Apex Racquet & Badminton Club', slug: 'apex-racquet', vertical: 'racquet_court' },
  { id: 't-pulse-03', name: 'Pulse Care Multi-Specialty Clinic', slug: 'pulse-clinic', vertical: 'clinic_healthcare' },
  { id: 't-aura-04', name: 'Aura Luxe Salon & Spa', slug: 'aura-salon', vertical: 'salon_beauty' },
  { id: 't-zenfit-05', name: 'ZenFit Yoga & Coaching Studio', slug: 'zenfit-studio', vertical: 'fitness_yoga' },
];

function formatInr(minor: number): string {
  return `₹${(minor / 100).toLocaleString('en-IN')}`;
}

function UniversalInventoryWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTenantId = searchParams.get('tenant') ?? 't-uni-06';
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<'master' | 'catalogue' | 'fulfilments' | 'entitlements'>('master');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterType, setFilterType] = React.useState<string>('all');
  const [filterStatus, setFilterStatus] = React.useState<string>('all');

  const [catalogueItems, setCatalogueItems] = React.useState<EnrichedCatalogueItem[]>([]);
  const [masterTable, setMasterTable] = React.useState<MasterDataTableRow[]>([]);
  const [entitlements, setEntitlements] = React.useState<RuntimeEntitlementRecord[]>([]);
  const [fulfilments, setFulfilments] = React.useState<RuntimeFulfilmentRecord[]>([]);
  const [subscriptions, setSubscriptions] = React.useState<RuntimeCustomerSubscription[]>([]);

  // New Item Modal State
  const [createOpen, setCreateOpen] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [newSubEntity, setNewSubEntity] = React.useState('Fresh Dairy & Retail');
  const [newCategory, setNewCategory] = React.useState('Physical Goods');
  const [newItemType, setNewItemType] = React.useState<CatalogueItemType>('physical_product');
  const [newFulfilmentType, setNewFulfilmentType] = React.useState<FulfilmentType>('physical_delivery');
  const [newPriceRupees, setNewPriceRupees] = React.useState('150');
  const [newStock, setNewStock] = React.useState('40');
  const [newDurationDays, setNewDurationDays] = React.useState('90');
  const [newFlag1, setNewFlag1] = React.useState('perishable_daily');
  const [newFlag2, setNewFlag2] = React.useState('cold_chain_delivery');

  const fetchInventoryState = React.useCallback(async (tenantId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/inventory?tenantId=${encodeURIComponent(tenantId)}`);
      const json = await res.json();
      if (res.ok) {
        setCatalogueItems(json.catalogueItems ?? []);
        setMasterTable(json.masterProjection ?? []);
        setEntitlements(json.entitlements ?? []);
        setFulfilments(json.fulfilments ?? []);
        setSubscriptions(json.subscriptions ?? []);
      }
    } catch {
      toast({
        title: 'Failed to load universal inventory',
        description: 'Could not reach /api/dashboard/inventory.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    void fetchInventoryState(activeTenantId);
  }, [activeTenantId, fetchInventoryState]);

  const handleTenantChange = (tenantId: string) => {
    router.push(`/dashboard/inventory?tenant=${encodeURIComponent(tenantId)}`);
  };

  const handleStatusChange = async (catalogueItemId: string, status: CatalogueItemStatus) => {
    try {
      const res = await fetch('/api/dashboard/inventory', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          patchType: 'catalogue_item',
          tenantId: activeTenantId,
          catalogueItemId,
          status,
        }),
      });
      if (res.ok) {
        toast({
          title: 'Catalogue status updated',
          description: `Item status set to "${status}".`,
          variant: 'success',
        });
        void fetchInventoryState(activeTenantId);
      }
    } catch {
      toast({
        title: 'Status update failed',
        variant: 'destructive',
      });
    }
  };

  const handleRestock = async (catalogueItemId: string, restockDelta: number) => {
    try {
      const res = await fetch('/api/dashboard/inventory', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          patchType: 'catalogue_item',
          tenantId: activeTenantId,
          catalogueItemId,
          restockDelta,
        }),
      });
      if (res.ok) {
        toast({
          title: 'Inventory adjusted',
          description: `Added ${restockDelta} units to available stock.`,
          variant: 'success',
        });
        void fetchInventoryState(activeTenantId);
      }
    } catch {
      toast({
        title: 'Stock adjustment failed',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateFulfilment = async (
    fulfilmentId: string,
    status: FulfilmentStatus,
  ) => {
    try {
      const res = await fetch('/api/dashboard/inventory', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          patchType: 'fulfilment',
          tenantId: activeTenantId,
          fulfilmentId,
          status,
        }),
      });
      if (res.ok) {
        toast({
          title: 'Fulfilment updated',
          description: `Order fulfilment marked as ${status.replace(/_/g, ' ')}.`,
          variant: 'success',
        });
        void fetchInventoryState(activeTenantId);
      }
    } catch {
      toast({
        title: 'Fulfilment update failed',
        variant: 'destructive',
      });
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const res = await fetch('/api/dashboard/inventory', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tenantId: activeTenantId,
          name: newName.trim(),
          subEntityName: newSubEntity.trim(),
          categoryName: newCategory.trim(),
          itemType: newItemType,
          fulfilmentType: newFulfilmentType,
          priceMinor: Math.max(0, Math.round(Number(newPriceRupees) * 100)),
          initialStock: newItemType === 'physical_product' ? Number(newStock) : undefined,
          accessDurationDays:
            newItemType === 'digital_content' || newItemType === 'subscription_plan'
              ? Number(newDurationDays)
              : undefined,
          flag1: newFlag1.trim() || undefined,
          flag2: newFlag2.trim() || undefined,
        }),
      });
      if (res.ok) {
        toast({
          title: 'Universal offering created',
          description: `"${newName}" is now live in the catalogue and Master Data Table.`,
          variant: 'success',
        });
        setCreateOpen(false);
        setNewName('');
        void fetchInventoryState(activeTenantId);
      }
    } catch {
      toast({
        title: 'Failed to create item',
        variant: 'destructive',
      });
    }
  };

  const activeTenant = TENANT_OPTIONS.find((t) => t.id === activeTenantId) ?? TENANT_OPTIONS[0]!;

  const filteredMasterRows = masterTable.filter((row) => {
    const matchesSearch =
      !searchQuery.trim() ||
      row.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.sub_entity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (row.flag_1 ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (row.flag_2 ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || row.item_type === filterType;
    const matchesStatus = filterStatus === 'all' || row.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const totalAvailableUnits = catalogueItems.reduce((acc, s) => acc + (s.stockAvailable ?? 0), 0);
  const activeEntitlementsCount = entitlements.filter((e) => e.status === 'active').length;
  const pendingFulfilmentsCount = fulfilments.filter(
    (f) => f.status !== 'delivered' && f.status !== 'picked_up' && f.status !== 'returned',
  ).length;

  return (
    <div className="space-y-6 p-6">
      {/* Header & Tenant Switcher */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-600 text-white">Universal Commerce &amp; Entitlement Engine</Badge>
            <Badge variant="outline" className="font-mono text-xs">
              v_universal_commerce_master
            </Badge>
          </div>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">
            Universal Inventory, Catalogue &amp; Entitlements
          </h1>
          <p className="text-sm text-muted-foreground">
            Sell physical items (Milk, Laptops), time-slot property bookings (Turf, Clinic), capacity classes, 90-day digital courses, and recurring subscriptions from one unified ledger.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            aria-label="Select business tenant"
            value={activeTenantId}
            onChange={(e) => handleTenantChange(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-xs font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {TENANT_OPTIONS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.vertical})
              </option>
            ))}
          </select>

          <Button variant="outline" size="sm" onClick={() => void fetchInventoryState(activeTenantId)}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Refresh
          </Button>

          <Button variant="outline" size="sm" asChild>
            <Link href={`/s/${activeTenant.slug}`} target="_blank">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Open Storefront
            </Link>
          </Button>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700">
                <Plus className="mr-1.5 h-4 w-4" />
                Add Universal Offering
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Universal Catalogue Offering</DialogTitle>
                <DialogDescription>
                  Add a physical product, turf/appointment slot resource, digital course with time-window access, or recurring subscription.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateItem} className="space-y-3 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1">
                    <Label htmlFor="new-item-name">Item Name</Label>
                    <Input
                      id="new-item-name"
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Organic A2 Milk (2L), MacBook Pro M4, React Bootcamp (90 Days)"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="new-sub-entity">Sub-Entity (Branch / Division)</Label>
                    <Input
                      id="new-sub-entity"
                      value={newSubEntity}
                      onChange={(e) => setNewSubEntity(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="new-category">Category</Label>
                    <Input
                      id="new-category"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="new-item-type">Item Type</Label>
                    <select
                      id="new-item-type"
                      value={newItemType}
                      onChange={(e) => {
                        const t = e.target.value as CatalogueItemType;
                        setNewItemType(t);
                        if (t === 'physical_product') {
                          setNewFulfilmentType('physical_delivery');
                        } else if (t === 'digital_content') {
                          setNewFulfilmentType('digital_instant_access');
                        } else if (t === 'subscription_plan') {
                          setNewFulfilmentType('recurring_entitlement');
                        } else if (t === 'capacity_session') {
                          setNewFulfilmentType('session_seat');
                        } else {
                          setNewFulfilmentType('time_slot_reservation');
                        }
                      }}
                      className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs"
                    >
                      <option value="physical_product">Physical Product (Stock + Delivery)</option>
                      <option value="bookable_resource">Time-Slot Property / Turf</option>
                      <option value="service_appointment">Specialist Appointment Slot</option>
                      <option value="digital_content">Digital Course / Content (Time-Window)</option>
                      <option value="capacity_session">Capacity Class / Session</option>
                      <option value="subscription_plan">Recurring Subscription</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="new-price">Price (INR ₹)</Label>
                    <Input
                      id="new-price"
                      type="number"
                      min="0"
                      value={newPriceRupees}
                      onChange={(e) => setNewPriceRupees(e.target.value)}
                    />
                  </div>
                  {newItemType === 'physical_product' && (
                    <div className="space-y-1">
                      <Label htmlFor="new-stock">Initial Stock On Hand</Label>
                      <Input
                        id="new-stock"
                        type="number"
                        min="0"
                        value={newStock}
                        onChange={(e) => setNewStock(e.target.value)}
                      />
                    </div>
                  )}
                  {(newItemType === 'digital_content' || newItemType === 'subscription_plan') && (
                    <div className="space-y-1">
                      <Label htmlFor="new-duration">Permission Window (Days)</Label>
                      <Input
                        id="new-duration"
                        type="number"
                        min="1"
                        value={newDurationDays}
                        onChange={(e) => setNewDurationDays(e.target.value)}
                      />
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label htmlFor="new-flag1">flag_1 (Custom Tag 1)</Label>
                    <Input
                      id="new-flag1"
                      value={newFlag1}
                      onChange={(e) => setNewFlag1(e.target.value)}
                      placeholder="e.g. perishable_daily or exclusive_resource"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="new-flag2">flag_2 (Custom Tag 2)</Label>
                    <Input
                      id="new-flag2"
                      value={newFlag2}
                      onChange={(e) => setNewFlag2(e.target.value)}
                      placeholder="e.g. cold_chain_delivery or 90_day_permission"
                    />
                  </div>
                </div>
                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-emerald-600 text-white hover:bg-emerald-700">
                    Create Offering
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs">
              <span>Universal Catalogue Items</span>
              <Layers className="h-4 w-4 text-emerald-600" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold">{catalogueItems.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Across physical products, slots, courses &amp; passes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs">
              <span>Available Physical &amp; Session Stock</span>
              <Package className="h-4 w-4 text-amber-600" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold">{totalAvailableUnits} units</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Real-time stock minus active checkout reservations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs">
              <span>Active Customer Entitlements</span>
              <KeyRound className="h-4 w-4 text-sky-600" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold">{activeEntitlementsCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Time-window course &amp; turf permissions currently valid
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs">
              <span>Pending Physical Dispatches</span>
              <Truck className="h-4 w-4 text-violet-600" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold">{pendingFulfilmentsCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {subscriptions.length} active recurring subscription(s)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="sm"
            variant={activeTab === 'master' ? 'default' : 'outline'}
            onClick={() => setActiveTab('master')}
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            Master Data Table ({masterTable.length})
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'catalogue' ? 'default' : 'outline'}
            onClick={() => setActiveTab('catalogue')}
          >
            <Package className="mr-1.5 h-3.5 w-3.5" />
            Catalogue &amp; Stock Control ({catalogueItems.length})
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'fulfilments' ? 'default' : 'outline'}
            onClick={() => setActiveTab('fulfilments')}
          >
            <Truck className="mr-1.5 h-3.5 w-3.5" />
            Physical Fulfilments ({fulfilments.length})
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'entitlements' ? 'default' : 'outline'}
            onClick={() => setActiveTab('entitlements')}
          >
            <KeyRound className="mr-1.5 h-3.5 w-3.5" />
            Customer Rights &amp; Subscriptions ({entitlements.length})
          </Button>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-56">
            <Search className="pointer-events-none absolute top-2.5 left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search item, flag_1, category..."
              className="h-8 pl-8 text-xs"
            />
          </div>
          <select
            aria-label="Filter by item type"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2.5 text-xs"
          >
            <option value="all">All Types</option>
            <option value="physical_product">Physical Products</option>
            <option value="bookable_resource">Turf / Resources</option>
            <option value="service_appointment">Appointments</option>
            <option value="digital_content">Digital Courses</option>
            <option value="capacity_session">Capacity Classes</option>
            <option value="subscription_plan">Subscriptions</option>
          </select>
          <select
            aria-label="Filter by status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2.5 text-xs"
          >
            <option value="all">All Statuses</option>
            <option value="available">available</option>
            <option value="active">active</option>
            <option value="sold">sold</option>
            <option value="dormant">dormant</option>
            <option value="unavailable">unavailable</option>
            <option value="ready_to_upgrade">ready_to_upgrade</option>
            <option value="expired">expired</option>
          </select>
        </div>
      </div>

      {/* TAB 1: MASTER DATA TABLE (v_universal_commerce_master) */}
      {activeTab === 'master' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Unified Master Data Table Projection (`v_universal_commerce_master`)
            </CardTitle>
            <CardDescription className="text-xs">
              Displays `entity`, `sub_entity`, `domain`, `category`, `flag_1`, `flag_2`, `item_name`, `permission_timeslot_start`, `permission_timeslot_end`, and lifecycle `status` (`dormant`, `unavailable`, `available`, `sold`, `ready_to_upgrade`, `active`, `expired`).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Loading Master Data Table...
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-muted/60 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2.5">entity</th>
                      <th className="px-3 py-2.5">sub_entity</th>
                      <th className="px-3 py-2.5">domain</th>
                      <th className="px-3 py-2.5">category</th>
                      <th className="px-3 py-2.5">flag_1</th>
                      <th className="px-3 py-2.5">flag_2</th>
                      <th className="px-3 py-2.5">item_name</th>
                      <th className="px-3 py-2.5">permission_timeslot_start</th>
                      <th className="px-3 py-2.5">permission_timeslot_end</th>
                      <th className="px-3 py-2.5">status</th>
                      <th className="px-3 py-2.5 text-right">Stock / Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredMasterRows.map((row) => (
                      <tr key={row.rowId} className="hover:bg-muted/30">
                        <td className="px-3 py-2.5 font-semibold">{row.entity}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{row.sub_entity}</td>
                        <td className="px-3 py-2.5 font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                          {row.domain}
                        </td>
                        <td className="px-3 py-2.5">{row.category}</td>
                        <td className="px-3 py-2.5">
                          {row.flag_1 ? (
                            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                              {row.flag_1}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {row.flag_2 ? (
                            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                              {row.flag_2}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-3 py-2.5 font-bold">{row.item_name}</td>
                        <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground">
                          {row.permission_timeslot_start ?? 'Immediate Ownership'}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground">
                          {row.permission_timeslot_end ?? 'Permanent'}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              row.status === 'available' || row.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : row.status === 'sold'
                                  ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                                  : row.status === 'ready_to_upgrade'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold">
                          <div>{formatInr(row.price_minor)}</div>
                          {row.stock_available !== null && (
                            <div className="text-[10px] text-muted-foreground">
                              {row.stock_available} {row.unit_label} avail
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 2: CATALOGUE & STOCK CONTROL */}
      {activeTab === 'catalogue' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {catalogueItems.map((item) => (
            <Card key={item.id} className="border-border">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        {item.itemType}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {item.subEntityName}
                      </Badge>
                      <Badge
                        className={
                          item.derivedStatus === 'available'
                            ? 'bg-emerald-600 text-white'
                            : item.derivedStatus === 'ready_to_upgrade'
                              ? 'bg-amber-600 text-white'
                              : 'bg-slate-600 text-white'
                        }
                      >
                        {item.derivedStatus}
                      </Badge>
                    </div>
                    <CardTitle className="mt-1.5 text-base">{item.name}</CardTitle>
                    <CardDescription className="text-xs">{item.shortDescription}</CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-extrabold">{formatInr(item.priceMinor)}</div>
                    <div className="text-[10px] text-muted-foreground">per {item.unitLabel}</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  {item.flag1 && (
                    <span className="rounded bg-muted px-2 py-0.5 font-mono">
                      flag_1: {item.flag1}
                    </span>
                  )}
                  {item.flag2 && (
                    <span className="rounded bg-muted px-2 py-0.5 font-mono">
                      flag_2: {item.flag2}
                    </span>
                  )}
                  {item.stockAvailable !== null && (
                    <span className="rounded bg-amber-500/10 px-2 py-0.5 font-semibold text-amber-700 dark:text-amber-300">
                      Available Stock: {item.stockAvailable} {item.unitLabel}(s)
                    </span>
                  )}
                  {item.accessDurationDays && (
                    <span className="rounded bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-700 dark:text-sky-300">
                      Access Window: {item.accessDurationDays} days
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-medium text-muted-foreground">Lifecycle:</span>
                    {(['active', 'dormant', 'unavailable', 'ready_to_upgrade'] as const).map(
                      (statusOption) => (
                        <Button
                          key={statusOption}
                          size="sm"
                          variant={item.status === statusOption ? 'default' : 'outline'}
                          className="h-7 px-2 text-[10px]"
                          onClick={() => void handleStatusChange(item.id, statusOption)}
                        >
                          {statusOption}
                        </Button>
                      ),
                    )}
                  </div>

                  {item.itemType === 'physical_product' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 border-emerald-500/40 text-xs text-emerald-700 dark:text-emerald-300"
                      onClick={() => void handleRestock(item.id, 10)}
                    >
                      <ArrowUpCircle className="mr-1 h-3.5 w-3.5" />
                      +10 Stock
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* TAB 3: PHYSICAL FULFILMENTS */}
      {activeTab === 'fulfilments' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Physical Delivery &amp; Pickup Fulfilments</CardTitle>
            <CardDescription className="text-xs">
              Track and dispatch physical inventory orders (`local_delivery`, `courier_shipment`, `store_pickup`). Mixed orders automatically transition from `partially_fulfilled` to `fulfilled` when delivered.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {fulfilments.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No physical fulfilment records for this tenant yet. Purchase Milk or a Laptop on the storefront to generate one.
              </div>
            ) : (
              <div className="space-y-2.5">
                {fulfilments.map((f) => (
                  <div
                    key={f.id}
                    className="flex flex-col justify-between gap-3 rounded-lg border border-border p-3.5 sm:flex-row sm:items-center"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {f.id}
                        </Badge>
                        <Badge
                          className={
                            f.status === 'delivered' || f.status === 'picked_up'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-amber-600 text-white'
                          }
                        >
                          {f.status}
                        </Badge>
                        <span className="text-xs font-semibold">
                          {f.quantity} × {f.itemName}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-foreground">
                        Customer: <strong>{f.customerName}</strong> ({f.customerPhone}) • Mode:{' '}
                        <strong>{f.method}</strong> • Address: {f.recipientAddress}
                      </p>
                      {f.trackingNumber && (
                        <p className="text-[11px] font-mono text-muted-foreground">
                          Tracking: {f.trackingNumber}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {f.status !== 'delivered' && f.status !== 'picked_up' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => void handleUpdateFulfilment(f.id, 'out_for_delivery')}
                          >
                            Out for Delivery
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                            onClick={() => void handleUpdateFulfilment(f.id, 'delivered')}
                          >
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                            Mark Delivered
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 4: ENTITLEMENTS & SUBSCRIPTIONS */}
      {activeTab === 'entitlements' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="h-4 w-4 text-sky-600" />
                Issued Customer Entitlements (`permission_timeslot_start` → `permission_timeslot_end`)
              </CardTitle>
              <CardDescription className="text-xs">
                Every course unlock, turf slot booking, class seat, and subscription grants an auditable right with automatic time-window expiration.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {entitlements.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No entitlements issued yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {entitlements.map((ent) => (
                    <div
                      key={ent.id}
                      className="flex flex-col justify-between gap-2 rounded-lg border border-border p-3.5 sm:flex-row sm:items-center"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm">{ent.itemName}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {ent.entitlementType}
                          </Badge>
                          <Badge
                            className={
                              ent.status === 'active'
                                ? 'bg-emerald-600 text-white'
                                : ent.status === 'ready_to_upgrade'
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-rose-600 text-white'
                            }
                          >
                            {ent.status}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Customer: <strong>{ent.customerName}</strong> ({ent.customerPhone}) • ID:{' '}
                          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                            {ent.id}
                          </code>
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                          Window: {new Date(ent.permissionTimeslotStartIso).toLocaleString('en-IN')}{' '}
                          →{' '}
                          {ent.permissionTimeslotEndIso
                            ? new Date(ent.permissionTimeslotEndIso).toLocaleString('en-IN')
                            : 'Permanent'}
                        </p>
                      </div>
                      <div className="text-right text-xs">
                        <div>
                          Max Quota: <strong>{ent.maxUsageCount ?? 'Unlimited'}</strong>
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Consumed: {ent.consumedUsageCount}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Repeat className="h-4 w-4 text-violet-600" />
                Recurring Customer Subscriptions
              </CardTitle>
              <CardDescription className="text-xs">
                Subscriptions automatically extend entitlement windows on renewal and honour access until `currentPeriodEndIso` when cancelled.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {subscriptions.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No recurring subscriptions active for this tenant.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {subscriptions.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex flex-col justify-between gap-2 rounded-lg border border-border p-3.5 sm:flex-row sm:items-center"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{sub.planName}</span>
                          <Badge variant="outline">{sub.status}</Badge>
                          {sub.cancelAtPeriodEnd && (
                            <Badge variant="destructive" className="text-[10px]">
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              Cancels at period end
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Subscriber: {sub.customerName} ({sub.customerPhone})
                        </p>
                        <p className="font-mono text-[11px] text-muted-foreground">
                          Paid Period:{' '}
                          {new Date(sub.currentPeriodStartIso).toLocaleDateString('en-IN')} →{' '}
                          {new Date(sub.currentPeriodEndIso).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function UniversalInventoryDashboardPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-8 text-center text-sm text-muted-foreground">
          Loading Universal Commerce &amp; Entitlement Workspace...
        </div>
      }
    >
      <UniversalInventoryWorkspace />
    </React.Suspense>
  );
}
