'use client';

import * as React from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MOCK_BOOKINGS, type MockBooking } from '@/lib/mock-data/mock-bookings';
import { MOCK_RESOURCES } from '@/lib/mock-data/mock-resources';
import { useToast } from '@/components/ui/toast';

const TIME_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
];

export default function DashboardBookingsPage() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = React.useState('2026-11-05');
  const [selectedCourtId, setSelectedCourtId] = React.useState<string>('all');
  const [viewMode, setViewMode] = React.useState<'day' | 'list'>('day');
  const [bookings, setBookings] = React.useState<MockBooking[]>(MOCK_BOOKINGS);
  const [activeBooking, setActiveBooking] = React.useState<MockBooking | null>(null);

  // Filtered resources
  const visibleResources = React.useMemo(() => {
    if (selectedCourtId === 'all') return MOCK_RESOURCES;
    return MOCK_RESOURCES.filter((r) => r.id === selectedCourtId);
  }, [selectedCourtId]);

  // Date shifting
  const handleDateShift = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setSelectedDate(selectedDate === '2026-11-06' ? '2026-11-05' : '2026-11-04');
    } else {
      setSelectedDate(selectedDate === '2026-11-04' ? '2026-11-05' : '2026-11-06');
    }
  };

  // Cancel booking action
  const handleCancelBooking = (bookingId: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' } : b))
    );
    setActiveBooking(null);
    toast({
      title: 'Booking Cancelled',
      description: 'The court slot has been freed and marked cancelled.',
      variant: 'destructive',
    });
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Court Timeline & Slot Matrix</h2>
            <Badge variant="outline" className="font-mono text-xs">Model A: Exclusive Resource</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time court availability, active checkout locks, and reservation schedule.
          </p>
        </div>

        {/* Date Selector & View Switcher */}
        <div className="flex items-center gap-2">
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

          <Select value={selectedCourtId} onValueChange={setSelectedCourtId}>
            <SelectTrigger className="h-9 w-44 text-xs">
              <SelectValue placeholder="All Courts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Arenas & Courts</SelectItem>
              {MOCK_RESOURCES.map((r) => (
                <SelectItem key={r.id} value={r.id} className="text-xs">
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex rounded-lg border border-border p-1 bg-card">
            <Button
              size="sm"
              variant={viewMode === 'day' ? 'default' : 'ghost'}
              className="h-7 text-xs px-2.5"
              onClick={() => setViewMode('day')}
            >
              Day Grid
            </Button>
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

      {/* Legend & Availability Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card/50 text-xs">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-muted-foreground">Legend:</span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-emerald-500/20 border border-emerald-500" />
            <span>Confirmed Booking</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-amber-500/20 border border-amber-500 animate-pulse" />
            <span>Active Hold (8 min lock)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-muted/60 border border-border border-dashed" />
            <span>Open & Available</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-rose-500/10 border border-rose-500/30 line-through text-rose-500" />
            <span>Cancelled</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-muted-foreground font-mono">
          <ShieldAlert className="h-3.5 w-3.5 text-primary" />
          <span>Double-booking prevention: Active via Postgres GiST Exclusion</span>
        </div>
      </div>

      {/* Day Timeline Matrix View */}
      {viewMode === 'day' && (
        <Card className="overflow-hidden">
          <CardHeader className="py-3.5 border-b border-border bg-muted/20">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Arena Court Grid ({selectedDate})</CardTitle>
              <span className="text-xs text-muted-foreground font-mono">Hourly Granularity</span>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-border bg-muted/10 text-muted-foreground">
                  <th className="p-3 text-left w-56 font-medium border-r border-border">Court / Arena</th>
                  {TIME_SLOTS.map((slot) => (
                    <th key={slot} className="p-2 text-center font-mono font-medium border-r border-border last:border-r-0">
                      {slot}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleResources.map((res) => {
                  const resBookings = bookings.filter(
                    (b) => b.resourceOrServiceName === res.name && b.date === selectedDate
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
                          const end = parseInt(b.endTime.split(':')[0] ?? '0', 10);
                          return slotHour >= start && slotHour < end;
                        });

                        if (!matched) {
                          return (
                            <td
                              key={slot}
                              className="p-1 border-r border-border last:border-r-0 text-center"
                            >
                              <div className="h-12 rounded border border-dashed border-border/80 flex items-center justify-center text-[10px] text-muted-foreground/60 hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all">
                                Open
                              </div>
                            </td>
                          );
                        }

                        let bgStyle = 'bg-muted/40 border-border text-muted-foreground';
                        let label = matched.customerName.split(' ')[0] ?? 'Booked';

                        if (matched.status === 'confirmed' || matched.status === 'completed') {
                          bgStyle = 'bg-emerald-500/15 border-emerald-500/50 text-emerald-700 dark:text-emerald-300 font-semibold';
                        } else if (matched.status === 'temporarily_held') {
                          bgStyle = 'bg-amber-500/15 border-amber-500/50 text-amber-700 dark:text-amber-300 font-medium animate-pulse';
                          label = 'Held (8m)';
                        } else if (matched.status === 'cancelled') {
                          bgStyle = 'bg-rose-500/10 border-rose-500/30 text-rose-500 line-through';
                          label = 'Cancelled';
                        }

                        return (
                          <td
                            key={slot}
                            className="p-1 border-r border-border last:border-r-0"
                          >
                            <div
                              onClick={() => setActiveBooking(matched)}
                              className={`h-12 p-1 rounded border text-[11px] flex flex-col justify-center items-center cursor-pointer transition-all shadow-xs ${bgStyle}`}
                              title={`${matched.customerName} (${matched.startTime} - ${matched.endTime}) - ${matched.bookingNumber}`}
                            >
                              <span className="truncate max-w-[50px]">{label}</span>
                              <span className="text-[9px] font-mono opacity-80 mt-0.5">{matched.startTime}</span>
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
      {viewMode === 'list' && (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {bookings
                .filter((b) => b.date === selectedDate)
                .map((bk) => (
                  <div key={bk.id} className="p-4 flex items-center justify-between hover:bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs font-mono">
                        {bk.startTime}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground text-sm">{bk.customerName}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span>{bk.resourceOrServiceName}</span>
                          <span>•</span>
                          <span className="font-mono">{bk.startTime} – {bk.endTime}</span>
                          <span>•</span>
                          <span>{bk.customerPhone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-semibold text-foreground font-mono">
                          ₹{(bk.amountMinor / 100).toLocaleString('en-IN')}
                        </div>
                        <span className="text-[10px] text-muted-foreground uppercase">{bk.paymentMethod}</span>
                      </div>
                      <Badge variant={bk.status === 'confirmed' ? 'default' : 'secondary'} className="text-xs">
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
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Booking Sheet Modal */}
      {activeBooking && (
        <Dialog open={!!activeBooking} onOpenChange={(open) => !open && setActiveBooking(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-mono text-xs">
                  {activeBooking.bookingNumber}
                </Badge>
                <Badge variant={activeBooking.status === 'confirmed' ? 'default' : 'secondary'}>
                  {activeBooking.status}
                </Badge>
              </div>
              <DialogTitle className="text-lg mt-2">{activeBooking.customerName}</DialogTitle>
              <DialogDescription>
                Customer Phone: {activeBooking.customerPhone}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3 border-y border-border text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Resource / Ground:</span>
                <span className="font-semibold text-foreground">{activeBooking.resourceOrServiceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date & Slot:</span>
                <span className="font-mono font-semibold text-foreground">
                  {activeBooking.date} ({activeBooking.startTime} – {activeBooking.endTime})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Fee:</span>
                <span className="font-mono font-semibold text-foreground">
                  ₹{(activeBooking.amountMinor / 100).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Reconciliation:</span>
                <span className="font-semibold uppercase text-emerald-600">
                  {activeBooking.paymentMethod} ({activeBooking.paymentStatus})
                </span>
              </div>
              {activeBooking.notes && (
                <div className="p-2.5 rounded bg-muted/40 text-muted-foreground">
                  <span className="font-medium text-foreground block mb-0.5">Booking Notes:</span>
                  {activeBooking.notes}
                </div>
              )}
            </div>

            <DialogFooter className="flex justify-between sm:justify-between w-full">
              {activeBooking.status !== 'cancelled' && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleCancelBooking(activeBooking.id)}
                >
                  Cancel Booking & Free Slot
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setActiveBooking(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
