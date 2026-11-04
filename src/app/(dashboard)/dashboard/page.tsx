'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Calendar,
  DollarSign,
  Plus,
  Clock,
  Search,
  CheckCircle2,
  Clock4,
  XCircle,
  Check,
  CreditCard,
  Banknote,
  QrCode,
  Building2,
  Bell,
  CalendarClock,
  Trash2,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

interface DashboardBookingItem {
  bookingId: string;
  bookingNumber: string;
  tenantId: string;
  bookingModel: 'exclusive_resource' | 'staff_appointment' | 'capacity_session';
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  totalMinor: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  notes?: string;
  resourceOrServiceName: string;
  staffName?: string;
  courtOrRoom?: string;
  dateLocal: string;
  startTime: string;
  endTime: string;
  resourceId?: string;
  serviceId?: string;
  staffMemberId?: string;
  sessionId?: string;
  quantity: number;
}

interface DashboardNotificationItem {
  notificationId: string;
  channel: string;
  templateKey: string;
  recipient: string;
  status: string;
  createdAtIso: string;
}

interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  vertical: string;
}

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    variant: 'default' | 'secondary' | 'outline' | 'destructive';
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  confirmed: { label: 'Confirmed', variant: 'default', icon: CheckCircle2 },
  temporarily_held: { label: 'Temporarily Held', variant: 'secondary', icon: Clock4 },
  completed: { label: 'Completed', variant: 'outline', icon: Check },
  cancelled: { label: 'Cancelled', variant: 'destructive', icon: XCircle },
  expired: { label: 'Expired', variant: 'outline', icon: Clock4 },
};

function makeIdemKey(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

function DashboardOverviewWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTenantParam = searchParams.get('tenant') ?? 't-kickoff-01';

  const { toast } = useToast();
  const [tenantId, setTenantId] = React.useState<string>(activeTenantParam);
  const [tenantName, setTenantName] = React.useState<string>('Kickoff Football Arena');
  const [tenantLocation, setTenantLocation] = React.useState<string>('Indiranagar, Bengaluru');
  const [tenantsList, setTenantsList] = React.useState<TenantSummary[]>([]);

  const [bookings, setBookings] = React.useState<DashboardBookingItem[]>([]);
  const [notifications, setNotifications] = React.useState<DashboardNotificationItem[]>(
    [],
  );
  const [resources, setResources] = React.useState<
    Array<{ id: string; name: string; peakPriceMinor: number; isActive: boolean }>
  >([]);

  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [selectedBooking, setSelectedBooking] =
    React.useState<DashboardBookingItem | null>(null);

  // Reschedule state inside booking details modal
  const [rescheduleDate, setRescheduleDate] = React.useState('2026-11-06');
  const [rescheduleTime, setRescheduleTime] = React.useState('16:00');
  const [isMutating, setIsMutating] = React.useState(false);

  // Walk-in modal state
  const [walkInOpen, setWalkInOpen] = React.useState(false);
  const [walkInResource, setWalkInResource] = React.useState('');
  const [walkInCustomerName, setWalkInCustomerName] = React.useState('');
  const [walkInPhone, setWalkInPhone] = React.useState('');
  const [walkInStartTime, setWalkInStartTime] = React.useState('21:00');
  const [walkInPaymentMethod, setWalkInPaymentMethod] = React.useState<
    'upi' | 'cash' | 'card'
  >('upi');

  React.useEffect(() => {
    if (activeTenantParam && activeTenantParam !== tenantId) {
      setTenantId(activeTenantParam);
    }
  }, [activeTenantParam, tenantId]);

  const loadDashboardData = React.useCallback(
    async (targetTenant = tenantId) => {
      try {
        const res = await fetch(
          `/api/dashboard/bookings?tenantId=${encodeURIComponent(targetTenant)}`,
          { cache: 'no-store' },
        );
        if (!res.ok) return;
        const data = await res.json();
        setTenantName(data.tenant?.name ?? 'Business Workspace');
        setTenantLocation(
          data.tenant?.location
            ? `${data.tenant.location.name} • ${data.tenant.location.city}`
            : '',
        );
        setTenantsList(data.tenants ?? []);
        setBookings(data.bookings ?? []);
        setNotifications(data.notifications ?? []);
        const activeRes = (data.catalog?.resources ?? []).filter(
          (r: { isActive: boolean }) => r.isActive,
        );
        setResources(activeRes);
        if (activeRes[0] && !walkInResource) {
          setWalkInResource(activeRes[0].id);
        }
      } catch {
        // Keep current snapshot on transient error
      }
    },
    [tenantId, walkInResource],
  );

  React.useEffect(() => {
    void loadDashboardData(tenantId);
  }, [tenantId, loadDashboardData]);

  const handleSwitchTenant = (nextTenant: string) => {
    setTenantId(nextTenant);
    router.replace(`/dashboard?tenant=${encodeURIComponent(nextTenant)}`);
  };

  const filteredBookings = React.useMemo(() => {
    return bookings.filter((b) => {
      const matchesSearch =
        b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.bookingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.customerPhone.includes(searchQuery);
      const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [bookings, searchQuery, statusFilter]);

  const metrics = React.useMemo(() => {
    const confirmed = bookings.filter(
      (b) => b.status === 'confirmed' || b.status === 'completed',
    );
    const revenueMinor = confirmed.reduce((acc, curr) => acc + curr.totalMinor, 0);
    const activeHolds = bookings.filter((b) => b.status === 'temporarily_held').length;

    return {
      confirmedCount: confirmed.length,
      revenueInr: (revenueMinor / 100).toLocaleString('en-IN'),
      activeHolds,
      notificationsCount: notifications.length,
    };
  }, [bookings, notifications.length]);

  const handleCreateWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInCustomerName.trim() || !walkInPhone.trim() || !walkInResource) return;

    setIsMutating(true);
    try {
      const startH = parseInt(walkInStartTime.split(':')[0] ?? '21', 10);
      const endH = startH + 1;
      const startsAtIso = `2026-11-05T${walkInStartTime}:00.000+05:30`;
      const endsAtIso =
        endH >= 24
          ? `2026-11-06T00:00:00.000+05:30`
          : `2026-11-05T${String(endH).padStart(2, '0')}:00:00.000+05:30`;

      const res = await fetch('/api/dashboard/bookings', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': makeIdemKey('walkin'),
        },
        body: JSON.stringify({
          tenantId,
          customer: {
            fullName: walkInCustomerName.trim(),
            phone: walkInPhone.trim(),
          },
          paymentStatus: 'paid',
          paymentMethod: walkInPaymentMethod,
          selection: {
            bookingModel: 'exclusive_resource',
            resourceId: walkInResource,
            startsAtIso,
            endsAtIso,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: 'Slot Conflict',
          description: data?.error?.message ?? 'Unable to create walk-in booking.',
          variant: 'destructive',
        });
        return;
      }

      setWalkInOpen(false);
      setWalkInCustomerName('');
      setWalkInPhone('');
      await loadDashboardData();
      toast({
        title: 'Walk-in Booking Confirmed!',
        description: `Reference ${data.booking?.bookingNumber} created and notification queued.`,
        variant: 'success',
      });
    } finally {
      setIsMutating(false);
    }
  };

  const handleStatusMutation = async (
    bookingId: string,
    status: 'completed' | 'cancelled',
  ) => {
    setIsMutating(true);
    try {
      const res = await fetch(`/api/dashboard/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': makeIdemKey('status'),
        },
        body: JSON.stringify({
          tenantId,
          status,
          reason:
            status === 'cancelled'
              ? 'Cancelled by business owner from dashboard'
              : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: 'Update Failed',
          description: data?.error?.message ?? 'Failed to update booking.',
          variant: 'destructive',
        });
        return;
      }

      await loadDashboardData();
      setSelectedBooking(null);
      toast({
        title: status === 'cancelled' ? 'Booking Cancelled & Slot Freed' : 'Checked In',
        description:
          status === 'cancelled'
            ? 'Slot returned to public availability and cancellation notification queued.'
            : 'Customer marked as Checked-in / Completed.',
        variant: status === 'cancelled' ? 'destructive' : 'success',
      });
    } finally {
      setIsMutating(false);
    }
  };

  const handleReschedule = async (bk: DashboardBookingItem) => {
    setIsMutating(true);
    try {
      const startH = parseInt(rescheduleTime.split(':')[0] ?? '16', 10);
      const startM = parseInt(rescheduleTime.split(':')[1] ?? '0', 10);
      const startsAtIso = `${rescheduleDate}T${String(startH).padStart(
        2,
        '0',
      )}:${String(startM).padStart(2, '0')}:00.000+05:30`;

      // Preserve duration (60m for resource, 30m/45m/60m for service)
      const startDate = new Date(startsAtIso);
      const durationMs =
        bk.bookingModel === 'staff_appointment' ? 30 * 60_000 : 60 * 60_000;
      const endDate = new Date(startDate.getTime() + durationMs);

      const newSelection =
        bk.bookingModel === 'staff_appointment' && bk.serviceId && bk.staffMemberId
          ? {
              bookingModel: 'staff_appointment' as const,
              serviceId: bk.serviceId,
              staffMemberId: bk.staffMemberId,
              startsAtIso: startDate.toISOString(),
              endsAtIso: endDate.toISOString(),
            }
          : bk.bookingModel === 'capacity_session' && bk.sessionId
          ? {
              bookingModel: 'capacity_session' as const,
              sessionId: bk.sessionId,
              quantity: bk.quantity || 1,
            }
          : {
              bookingModel: 'exclusive_resource' as const,
              resourceId: bk.resourceId ?? resources[0]?.id ?? 'res-turf-01',
              startsAtIso: startDate.toISOString(),
              endsAtIso: endDate.toISOString(),
            };

      const res = await fetch(`/api/dashboard/bookings/${bk.bookingId}/reschedule`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': makeIdemKey('resched'),
        },
        body: JSON.stringify({
          tenantId,
          reason: `Moved by operator to ${rescheduleDate} ${rescheduleTime}`,
          newSelection,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: 'Reschedule Conflict',
          description:
            data?.error?.message ??
            'Target slot is unavailable. Original booking was preserved.',
          variant: 'destructive',
        });
        return;
      }

      await loadDashboardData();
      setSelectedBooking(null);
      toast({
        title: 'Booking Rescheduled Atomically',
        description: `Moved to ${rescheduleDate} at ${rescheduleTime}. Old slot released and customer notified.`,
        variant: 'success',
      });
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Active Business Workspace Switcher + Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-border">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active Business:
            </span>
            <Select value={tenantId} onValueChange={handleSwitchTenant}>
              <SelectTrigger
                data-testid="dashboard-tenant-switcher"
                className="h-8 w-64 text-xs font-semibold"
              >
                <SelectValue placeholder="Select business" />
              </SelectTrigger>
              <SelectContent>
                {tenantsList.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="text-xs">
                    {t.name} ({t.slug})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <h2
            data-testid="dashboard-business-heading"
            className="text-2xl font-bold tracking-tight text-foreground"
          >
            {tenantName}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">{tenantLocation}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {resources.length > 0 && (
            <Dialog open={walkInOpen} onOpenChange={setWalkInOpen}>
              <DialogTrigger asChild>
                <Button data-testid="new-walkin-btn" className="gap-2">
                  <Plus className="h-4 w-4" />
                  <span>New Walk-in Booking</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <form onSubmit={handleCreateWalkIn}>
                  <DialogHeader>
                    <DialogTitle>Create Walk-in Booking</DialogTitle>
                    <DialogDescription>
                      Instantly book and lock a slot for counter/phone customers.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    <div className="space-y-1.5">
                      <Label>Select Court / Resource</Label>
                      <Select value={walkInResource} onValueChange={setWalkInResource}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select court" />
                        </SelectTrigger>
                        <SelectContent>
                          {resources.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Start Time (2026-11-05)</Label>
                      <Select value={walkInStartTime} onValueChange={setWalkInStartTime}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15:00">03:00 PM</SelectItem>
                          <SelectItem value="16:00">04:00 PM</SelectItem>
                          <SelectItem value="21:00">09:00 PM</SelectItem>
                          <SelectItem value="22:00">10:00 PM</SelectItem>
                          <SelectItem value="23:00">11:00 PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="cname">Customer Name</Label>
                      <Input
                        id="cname"
                        placeholder="e.g. Rahul Sharma"
                        value={walkInCustomerName}
                        onChange={(e) => setWalkInCustomerName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="cphone">Phone Number</Label>
                      <Input
                        id="cphone"
                        placeholder="+91 98765 43210"
                        value={walkInPhone}
                        onChange={(e) => setWalkInPhone(e.target.value)}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        type="button"
                        variant={walkInPaymentMethod === 'upi' ? 'default' : 'outline'}
                        className="h-9 text-xs gap-1"
                        onClick={() => setWalkInPaymentMethod('upi')}
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        <span>UPI</span>
                      </Button>
                      <Button
                        type="button"
                        variant={walkInPaymentMethod === 'cash' ? 'default' : 'outline'}
                        className="h-9 text-xs gap-1"
                        onClick={() => setWalkInPaymentMethod('cash')}
                      >
                        <Banknote className="h-3.5 w-3.5" />
                        <span>Cash</span>
                      </Button>
                      <Button
                        type="button"
                        variant={walkInPaymentMethod === 'card' ? 'default' : 'outline'}
                        className="h-9 text-xs gap-1"
                        onClick={() => setWalkInPaymentMethod('card')}
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        <span>Card</span>
                      </Button>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setWalkInOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isMutating}>
                      Confirm & Reserve
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}

          <Button variant="outline" asChild>
            <Link
              href={`/dashboard/bookings?tenant=${encodeURIComponent(tenantId)}`}
              className="gap-2"
            >
              <Calendar className="h-4 w-4" />
              <span>Calendar Matrix</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Confirmed Bookings
            </CardTitle>
            <Calendar className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div
              data-testid="kpi-confirmed-count"
              className="text-2xl font-bold text-foreground"
            >
              {metrics.confirmedCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Confirmed & Completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Gross Booking Value
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">₹{metrics.revenueInr}</div>
            <p className="text-xs text-emerald-600 mt-1">Reconciled server ledger</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Active Checkout Holds
            </CardTitle>
            <Clock className="h-4 w-4 text-sky-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{metrics.activeHolds}</div>
            <p className="text-xs text-muted-foreground mt-1">8-minute TTL lock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Notifications Queued
            </CardTitle>
            <Bell className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div
              data-testid="kpi-notifications-count"
              className="text-2xl font-bold text-foreground"
            >
              {metrics.notificationsCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">WhatsApp & Email Outbox</p>
          </CardContent>
        </Card>
      </div>

      {/* Live Bookings Directory Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold">
                Live Bookings & Appointments
              </CardTitle>
              <CardDescription>
                Manage customer check-ins, cancellations, and atomic rescheduling
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search name, phone, ref..."
                  className="pl-8 h-8 text-xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="temporarily_held">Held</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-left">
                  <th className="pb-2.5 font-medium">Ref & Customer</th>
                  <th className="pb-2.5 font-medium">Offering / Assigned</th>
                  <th className="pb-2.5 font-medium">Date & Time</th>
                  <th className="pb-2.5 font-medium">Payment</th>
                  <th className="pb-2.5 font-medium">Status</th>
                  <th className="pb-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-muted-foreground text-xs"
                    >
                      No bookings found for this filter.
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((bk) => {
                    const cfg = STATUS_CONFIG[bk.status] ?? STATUS_CONFIG.confirmed!;
                    const Icon = cfg.icon;

                    return (
                      <tr
                        key={bk.bookingId}
                        data-testid={`dashboard-booking-row-${bk.bookingNumber}`}
                        className="hover:bg-muted/40 transition-colors"
                      >
                        <td className="py-3 pr-2">
                          <div className="font-medium text-foreground">
                            {bk.customerName}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {bk.bookingNumber} • {bk.customerPhone}
                          </div>
                        </td>

                        <td className="py-3 pr-2">
                          <div className="font-medium text-foreground">
                            {bk.resourceOrServiceName}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {bk.staffName ?? bk.courtOrRoom ?? bk.bookingModel}
                          </div>
                        </td>

                        <td className="py-3 pr-2">
                          <div className="font-medium text-foreground font-mono">
                            {bk.dateLocal}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {bk.startTime} – {bk.endTime}
                          </div>
                        </td>

                        <td className="py-3 pr-2">
                          <div className="font-medium text-foreground font-mono">
                            ₹{(bk.totalMinor / 100).toLocaleString('en-IN')}
                          </div>
                          <span className="text-[10px] uppercase font-mono text-muted-foreground">
                            {bk.paymentMethod} • {bk.paymentStatus}
                          </span>
                        </td>

                        <td className="py-3 pr-2">
                          <Badge
                            data-testid={`booking-status-${bk.bookingNumber}`}
                            variant={cfg.variant}
                            className="gap-1 text-[11px]"
                          >
                            <Icon className="h-3 w-3" />
                            <span>{cfg.label}</span>
                          </Badge>
                        </td>

                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {bk.status === 'confirmed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1"
                                onClick={() =>
                                  void handleStatusMutation(bk.bookingId, 'completed')
                                }
                              >
                                <Check className="h-3 w-3 text-emerald-600" />
                                <span className="hidden sm:inline">Check In</span>
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              data-testid={`manage-booking-btn-${bk.bookingNumber}`}
                              className="h-7 text-xs"
                              onClick={() => setSelectedBooking(bk)}
                            >
                              Manage
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Notification Outbox Log */}
      {notifications.length > 0 && (
        <Card data-testid="dashboard-notification-outbox">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <span>Transactional Notification Outbox ({notifications.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs">
              {notifications.slice(0, 6).map((n) => (
                <div
                  key={n.notificationId}
                  data-testid={`outbox-item-${n.templateKey}`}
                  className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg border border-border bg-muted/20"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-mono uppercase">
                      {n.channel}
                    </Badge>
                    <span className="font-mono font-semibold text-foreground">
                      {n.templateKey}
                    </span>
                    <span className="text-muted-foreground">→ {n.recipient}</span>
                  </div>
                  <Badge variant="success" className="text-[10px]">
                    {n.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manage / Reschedule / Cancel Booking Modal */}
      {selectedBooking && (
        <Dialog
          open={!!selectedBooking}
          onOpenChange={(open) => !open && setSelectedBooking(null)}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-mono text-xs">
                  {selectedBooking.bookingNumber}
                </Badge>
                <Badge
                  variant={STATUS_CONFIG[selectedBooking.status]?.variant ?? 'default'}
                >
                  {STATUS_CONFIG[selectedBooking.status]?.label ?? selectedBooking.status}
                </Badge>
              </div>
              <DialogTitle className="text-lg mt-2">
                {selectedBooking.customerName}
              </DialogTitle>
              <DialogDescription>
                Phone: {selectedBooking.customerPhone}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3 border-y border-border text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Offering:</span>
                <span className="font-semibold text-foreground">
                  {selectedBooking.resourceOrServiceName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Schedule:</span>
                <span className="font-mono font-semibold text-foreground">
                  {selectedBooking.dateLocal} ({selectedBooking.startTime} –{' '}
                  {selectedBooking.endTime})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-mono font-semibold text-foreground">
                  ₹{(selectedBooking.totalMinor / 100).toLocaleString('en-IN')} (
                  {selectedBooking.paymentStatus})
                </span>
              </div>

              {/* Atomic Reschedule Section */}
              {selectedBooking.status !== 'cancelled' &&
                selectedBooking.bookingModel !== 'capacity_session' && (
                  <div className="pt-3 border-t border-border space-y-2">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <CalendarClock className="h-3.5 w-3.5 text-primary" />
                      <span>Reschedule Appointment / Slot</span>
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={rescheduleDate} onValueChange={setRescheduleDate}>
                        <SelectTrigger
                          data-testid="reschedule-date-select"
                          className="h-8 text-xs"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2026-11-05">2026-11-05</SelectItem>
                          <SelectItem value="2026-11-06">2026-11-06</SelectItem>
                          <SelectItem value="2026-11-07">2026-11-07</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={rescheduleTime} onValueChange={setRescheduleTime}>
                        <SelectTrigger
                          data-testid="reschedule-time-select"
                          className="h-8 text-xs"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="11:00">11:00 AM</SelectItem>
                          <SelectItem value="15:00">03:00 PM</SelectItem>
                          <SelectItem value="16:00">04:00 PM</SelectItem>
                          <SelectItem value="17:00">05:00 PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={isMutating}
                      data-testid="confirm-reschedule-btn"
                      onClick={() => void handleReschedule(selectedBooking)}
                      className="w-full text-xs font-semibold gap-1.5"
                    >
                      <CalendarClock className="h-3.5 w-3.5" />
                      <span>Move to {rescheduleDate} at {rescheduleTime}</span>
                    </Button>
                  </div>
                )}
            </div>

            <DialogFooter className="flex flex-wrap justify-between gap-2">
              {selectedBooking.status !== 'cancelled' && (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isMutating}
                  data-testid="cancel-booking-btn"
                  onClick={() =>
                    void handleStatusMutation(selectedBooking.bookingId, 'cancelled')
                  }
                  className="gap-1.5 text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Cancel & Free Slot</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedBooking(null)}
                className="text-xs ml-auto"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default function DashboardOverviewPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-8 text-sm text-muted-foreground">
          Loading business operations dashboard...
        </div>
      }
    >
      <DashboardOverviewWorkspace />
    </React.Suspense>
  );
}
