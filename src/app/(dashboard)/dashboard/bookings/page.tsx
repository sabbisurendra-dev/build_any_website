'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Building2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';

const TIME_SLOTS = [
  '06:00',
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
  '22:00',
  '23:00',
];

interface LiveBookingRow {
  bookingId: string;
  bookingNumber: string;
  bookingModel: string;
  customerName: string;
  customerPhone: string;
  resourceOrServiceName: string;
  resourceId?: string;
  staffName?: string;
  dateLocal: string;
  startTime: string;
  endTime: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  totalMinor: number;
  notes?: string;
}

function DashboardBookingsWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryTenant = searchParams.get('tenant') ?? 't-kickoff-01';

  const { toast } = useToast();
  const [tenantId, setTenantId] = React.useState(queryTenant);
  const [tenants, setTenants] = React.useState<
    Array<{ id: string; name: string; slug: string }>
  >([]);
  const [selectedDate, setSelectedDate] = React.useState('2026-11-05');
  const [selectedCourtId, setSelectedCourtId] = React.useState<string>('all');
  const [viewMode, setViewMode] = React.useState<'day' | 'list'>('list');
  const [bookings, setBookings] = React.useState<LiveBookingRow[]>([]);
  const [resources, setResources] = React.useState<
    Array<{ id: string; name: string; peakPriceMinor: number; isActive: boolean }>
  >([]);
  const [activeBooking, setActiveBooking] = React.useState<LiveBookingRow | null>(null);

  const loadBookings = React.useCallback(
    async (targetTenant = tenantId) => {
      try {
        const res = await fetch(
          `/api/dashboard/bookings?tenantId=${encodeURIComponent(targetTenant)}`,
          { cache: 'no-store' },
        );
        if (!res.ok) return;
        const data = await res.json();
        setTenants(data.tenants ?? []);
        setBookings(data.bookings ?? []);
        const activeRes = (data.catalog?.resources ?? []).filter(
          (r: { isActive: boolean }) => r.isActive,
        );
        setResources(activeRes);
        if (activeRes.length > 0 && targetTenant === 't-kickoff-01') {
          setViewMode('day');
        }
      } catch {
        // Keep current list on transient error
      }
    },
    [tenantId],
  );

  React.useEffect(() => {
    void loadBookings(tenantId);
  }, [tenantId, loadBookings]);

  const visibleResources = React.useMemo(() => {
    if (selectedCourtId === 'all') return resources;
    return resources.filter((r) => r.id === selectedCourtId);
  }, [resources, selectedCourtId]);

  const handleDateShift = (direction: 'prev' | 'next') => {
    const dates = ['2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07'];
    const idx = dates.indexOf(selectedDate);
    if (direction === 'prev' && idx > 0) setSelectedDate(dates[idx - 1]!);
    if (direction === 'next' && idx < dates.length - 1) setSelectedDate(dates[idx + 1]!);
  };

  const handleCancelBooking = async (bookingId: string) => {
    const res = await fetch(`/api/dashboard/bookings/${bookingId}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': `cal-cancel-${Date.now().toString(36)}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,
      },
      body: JSON.stringify({
        tenantId,
        status: 'cancelled',
        reason: 'Cancelled from Calendar Matrix',
      }),
    });
    if (res.ok) {
      await loadBookings();
      setActiveBooking(null);
      toast({
        title: 'Booking Cancelled',
        description: 'Slot freed and cancellation notification queued.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Building2 className="h-4 w-4 text-primary" />
            <Select
              value={tenantId}
              onValueChange={(val) => {
                setTenantId(val);
                setSelectedCourtId('all');
                router.replace(`/dashboard/bookings?tenant=${encodeURIComponent(val)}`);
              }}
            >
              <SelectTrigger className="h-8 w-60 text-xs font-semibold">
                <SelectValue placeholder="Select business" />
              </SelectTrigger>
              <SelectContent>
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="text-xs">
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Schedule Timeline & Slot Matrix
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-border bg-card p-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleDateShift('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-3 text-xs font-semibold font-mono flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{selectedDate}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleDateShift('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {resources.length > 0 && (
            <Select value={selectedCourtId} onValueChange={setSelectedCourtId}>
              <SelectTrigger className="h-9 w-44 text-xs">
                <SelectValue placeholder="All Courts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Arenas & Courts</SelectItem>
                {resources.map((r) => (
                  <SelectItem key={r.id} value={r.id} className="text-xs">
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex rounded-lg border border-border p-1 bg-card">
            {resources.length > 0 && (
              <Button
                size="sm"
                variant={viewMode === 'day' ? 'default' : 'ghost'}
                className="h-7 text-xs px-2.5"
                onClick={() => setViewMode('day')}
              >
                Day Grid
              </Button>
            )}
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              className="h-7 text-xs px-2.5"
              onClick={() => setViewMode('list')}
            >
              Slot List
            </Button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card/50 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-semibold text-muted-foreground">Legend:</span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-emerald-500/20 border border-emerald-500" />
            <span>Confirmed</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-amber-500/20 border border-amber-500" />
            <span>Active Hold</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-muted/60 border border-border border-dashed" />
            <span>Available</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-muted-foreground font-mono">
          <ShieldAlert className="h-3.5 w-3.5 text-primary" />
          <span>Server Exclusion Locking Active</span>
        </div>
      </div>

      {/* Day Timeline Matrix View */}
      {viewMode === 'day' && visibleResources.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="py-3.5 border-b border-border bg-muted/20">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                Arena Court Grid ({selectedDate})
              </CardTitle>
              <span className="text-xs text-muted-foreground font-mono">
                Hourly Granularity
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-border bg-muted/10 text-muted-foreground">
                  <th className="p-3 text-left w-56 font-medium border-r border-border">
                    Court / Arena
                  </th>
                  {TIME_SLOTS.map((slot) => (
                    <th
                      key={slot}
                      className="p-2 text-center font-mono font-medium border-r border-border last:border-r-0"
                    >
                      {slot}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleResources.map((res) => {
                  const resBookings = bookings.filter(
                    (b) =>
                      (b.resourceId === res.id ||
                        b.resourceOrServiceName === res.name) &&
                      b.dateLocal === selectedDate &&
                      b.status !== 'cancelled',
                  );

                  return (
                    <tr key={res.id} className="hover:bg-muted/10">
                      <td className="p-3 border-r border-border font-medium bg-card/60">
                        <div className="text-foreground">{res.name}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          ₹{(res.peakPriceMinor / 100).toLocaleString('en-IN')}/hr peak
                        </div>
                      </td>

                      {TIME_SLOTS.map((slot) => {
                        const slotHour = parseInt(slot.split(':')[0] ?? '0', 10);
                        const matched = resBookings.find((b) => {
                          const start = parseInt(b.startTime.split(':')[0] ?? '0', 10);
                          const endRaw = parseInt(b.endTime.split(':')[0] ?? '0', 10);
                          const end = endRaw === 0 ? 24 : endRaw;
                          return slotHour >= start && slotHour < end;
                        });

                        if (!matched) {
                          return (
                            <td
                              key={slot}
                              className="p-1 border-r border-border last:border-r-0 text-center"
                            >
                              <div className="h-12 rounded border border-dashed border-border/80 flex items-center justify-center text-[10px] text-muted-foreground/60">
                                Open
                              </div>
                            </td>
                          );
                        }

                        const bgStyle =
                          matched.status === 'temporarily_held'
                            ? 'bg-amber-500/15 border-amber-500/50 text-amber-700 dark:text-amber-300 font-medium'
                            : 'bg-emerald-500/15 border-emerald-500/50 text-emerald-700 dark:text-emerald-300 font-semibold';

                        return (
                          <td
                            key={slot}
                            className="p-1 border-r border-border last:border-r-0"
                          >
                            <div
                              onClick={() => setActiveBooking(matched)}
                              className={`h-12 p-1 rounded border text-[11px] flex flex-col justify-center items-center cursor-pointer transition-all shadow-xs ${bgStyle}`}
                            >
                              <span className="truncate max-w-[54px]">
                                {matched.customerName.split(' ')[0]}
                              </span>
                              <span className="text-[9px] font-mono opacity-80 mt-0.5">
                                {matched.startTime}
                              </span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* List View */}
      {(viewMode === 'list' || visibleResources.length === 0) && (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {bookings.filter((b) => b.dateLocal === selectedDate).length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No bookings scheduled on {selectedDate}.
                </div>
              ) : (
                bookings
                  .filter((b) => b.dateLocal === selectedDate)
                  .map((bk) => (
                    <div
                      key={bk.bookingId}
                      className="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs font-mono">
                          {bk.startTime}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground text-sm">
                            {bk.customerName}
                          </div>
                          <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2 mt-0.5">
                            <span>{bk.resourceOrServiceName}</span>
                            {bk.staffName && <span>• {bk.staffName}</span>}
                            <span>•</span>
                            <span className="font-mono">
                              {bk.startTime} – {bk.endTime}
                            </span>
                            <span>•</span>
                            <span className="font-mono">{bk.bookingNumber}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-sm font-semibold text-foreground font-mono">
                            ₹{(bk.totalMinor / 100).toLocaleString('en-IN')}
                          </div>
                          <span className="text-[10px] text-muted-foreground uppercase">
                            {bk.paymentMethod}
                          </span>
                        </div>
                        <Badge
                          variant={
                            bk.status === 'confirmed'
                              ? 'default'
                              : bk.status === 'cancelled'
                              ? 'destructive'
                              : 'secondary'
                          }
                          className="text-xs"
                        >
                          {bk.status}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-8"
                          onClick={() => setActiveBooking(bk)}
                        >
                          Details
                        </Button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Booking Modal */}
      {activeBooking && (
        <Dialog
          open={!!activeBooking}
          onOpenChange={(open) => !open && setActiveBooking(null)}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-mono text-xs">
                  {activeBooking.bookingNumber}
                </Badge>
                <Badge
                  variant={
                    activeBooking.status === 'confirmed' ? 'default' : 'secondary'
                  }
                >
                  {activeBooking.status}
                </Badge>
              </div>
              <DialogTitle className="text-lg mt-2">
                {activeBooking.customerName}
              </DialogTitle>
              <DialogDescription>
                Customer Phone: {activeBooking.customerPhone}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3 border-y border-border text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Offering:</span>
                <span className="font-semibold text-foreground">
                  {activeBooking.resourceOrServiceName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date & Slot:</span>
                <span className="font-mono font-semibold text-foreground">
                  {activeBooking.dateLocal} ({activeBooking.startTime} –{' '}
                  {activeBooking.endTime})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Fee:</span>
                <span className="font-mono font-semibold text-foreground">
                  ₹{(activeBooking.totalMinor / 100).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <DialogFooter className="flex justify-between w-full">
              {activeBooking.status !== 'cancelled' && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => void handleCancelBooking(activeBooking.bookingId)}
                >
                  Cancel Booking & Free Slot
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveBooking(null)}
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

export default function DashboardBookingsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-8 text-sm text-muted-foreground">
          Loading schedule timeline...
        </div>
      }
    >
      <DashboardBookingsWorkspace />
    </React.Suspense>
  );
}
