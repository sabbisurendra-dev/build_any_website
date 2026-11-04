'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Calendar,
  DollarSign,
  Trophy,
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
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MOCK_BOOKINGS, type MockBooking } from '@/lib/mock-data/mock-bookings';
import { MOCK_RESOURCES } from '@/lib/mock-data/mock-resources';
import { useToast } from '@/components/ui/toast';

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: React.ComponentType<{ className?: string }> }
> = {
  confirmed: { label: 'Confirmed', variant: 'default', icon: CheckCircle2 },
  temporarily_held: { label: 'Temporarily Held', variant: 'secondary', icon: Clock4 },
  completed: { label: 'Completed', variant: 'outline', icon: Check },
  cancelled: { label: 'Cancelled', variant: 'destructive', icon: XCircle },
};

export default function DashboardOverviewPage() {
  const { toast } = useToast();
  const [bookings, setBookings] = React.useState<MockBooking[]>(MOCK_BOOKINGS);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [selectedBooking, setSelectedBooking] = React.useState<MockBooking | null>(null);

  // Walk-in modal state
  const [walkInOpen, setWalkInOpen] = React.useState(false);
  const [walkInResource, setWalkInResource] = React.useState(MOCK_RESOURCES[0]?.id ?? '');
  const [walkInCustomerName, setWalkInCustomerName] = React.useState('');
  const [walkInPhone, setWalkInPhone] = React.useState('');
  const [walkInStartTime, setWalkInStartTime] = React.useState('20:00');
  const [walkInDuration, setWalkInDuration] = React.useState('60');
  const [walkInPaymentMethod, setWalkInPaymentMethod] = React.useState<'upi' | 'cash' | 'card'>('upi');

  // Filter bookings
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

  // Aggregate metrics
  const metrics = React.useMemo(() => {
    const today = '2026-11-05';
    const todays = bookings.filter((b) => b.date === today);
    const confirmedTodays = todays.filter((b) => b.status === 'confirmed' || b.status === 'completed');
    const revenueMinor = confirmedTodays.reduce((acc, curr) => acc + curr.amountMinor, 0);
    const activeHolds = todays.filter((b) => b.status === 'temporarily_held').length;

    return {
      todayCount: confirmedTodays.length,
      revenueInr: (revenueMinor / 100).toLocaleString('en-IN'),
      activeHolds,
      utilizationRate: 88,
    };
  }, [bookings]);

  // Submit walk-in booking
  const handleCreateWalkIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInCustomerName || !walkInPhone) {
      toast({
        title: 'Missing customer details',
        description: 'Please enter customer name and phone number.',
        variant: 'destructive',
      });
      return;
    }

    const resource = MOCK_RESOURCES.find((r) => r.id === walkInResource) ?? MOCK_RESOURCES[0]!;
    const startHour = parseInt(walkInStartTime.split(':')[0] ?? '20', 10);
    const endHour = startHour + Math.floor(parseInt(walkInDuration, 10) / 60);
    const endTimeStr = `${endHour.toString().padStart(2, '0')}:00`;

    const newBooking: MockBooking = {
      id: `bk-${Date.now().toString(36)}`,
      bookingNumber: `BK-20261105-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      tenantId: 't-kickoff-01',
      bookingModel: 'exclusive_resource',
      customerName: walkInCustomerName,
      customerPhone: walkInPhone,
      resourceOrServiceName: resource.name,
      date: '2026-11-05',
      startTime: walkInStartTime,
      endTime: endTimeStr,
      status: 'confirmed',
      paymentStatus: 'paid',
      paymentMethod: walkInPaymentMethod,
      amountMinor: resource.peakPriceMinor,
      courtOrRoom: resource.type === 'box_cricket' ? 'Box Arena' : 'Ground 1',
      notes: `Walk-in booking entered by manager. Paid via ${walkInPaymentMethod.toUpperCase()}.`,
      createdAt: new Date().toISOString(),
    };

    setBookings((prev) => [newBooking, ...prev]);
    setWalkInOpen(false);
    setWalkInCustomerName('');
    setWalkInPhone('');

    toast({
      title: 'Walk-in Booking Confirmed!',
      description: `Slot reserved for ${newBooking.customerName} (${newBooking.startTime} - ${newBooking.endTime}). Reference: ${newBooking.bookingNumber}`,
    });
  };

  // Check-in customer
  const handleCheckIn = (bookingId: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: 'completed' } : b))
    );
    if (selectedBooking && selectedBooking.id === bookingId) {
      setSelectedBooking((prev) => (prev ? { ...prev, status: 'completed' } : null));
    }
    toast({
      title: 'Customer Checked In',
      description: 'Player status updated to Completed.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Venue Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Kickoff Football Turf & Arena</h2>
            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
              Live & Open
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Indiranagar Flagship Arena • Dual 5v5 & 7v7 synthetic courts • Operational Hours: 06:00 AM – 01:00 AM
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Walk-in Modal */}
          <Dialog open={walkInOpen} onOpenChange={setWalkInOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                <span>New Walk-in Booking</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <form onSubmit={handleCreateWalkIn}>
                <DialogHeader>
                  <DialogTitle>Create Walk-in Booking</DialogTitle>
                  <DialogDescription>
                    Instantly book and lock a court slot for counter/phone customers with zero double-booking risk.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="court">Select Court / Arena</Label>
                    <Select value={walkInResource} onValueChange={setWalkInResource}>
                      <SelectTrigger id="court">
                        <SelectValue placeholder="Select court" />
                      </SelectTrigger>
                      <SelectContent>
                        {MOCK_RESOURCES.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name} (₹{(r.peakPriceMinor / 100).toLocaleString('en-IN')}/hr)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="time">Start Time (Today)</Label>
                      <Select value={walkInStartTime} onValueChange={setWalkInStartTime}>
                        <SelectTrigger id="time">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="18:00">06:00 PM</SelectItem>
                          <SelectItem value="19:00">07:00 PM</SelectItem>
                          <SelectItem value="20:00">08:00 PM</SelectItem>
                          <SelectItem value="21:00">09:00 PM</SelectItem>
                          <SelectItem value="22:00">10:00 PM</SelectItem>
                          <SelectItem value="23:00">11:00 PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="duration">Duration</Label>
                      <Select value={walkInDuration} onValueChange={setWalkInDuration}>
                        <SelectTrigger id="duration">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="60">60 Minutes</SelectItem>
                          <SelectItem value="90">90 Minutes</SelectItem>
                          <SelectItem value="120">120 Minutes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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
                    <Label htmlFor="cphone">Phone Number (SMS Confirmation)</Label>
                    <Input
                      id="cphone"
                      placeholder="+91 98765 43210"
                      value={walkInPhone}
                      onChange={(e) => setWalkInPhone(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Payment Method</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        type="button"
                        variant={walkInPaymentMethod === 'upi' ? 'default' : 'outline'}
                        className="h-10 text-xs gap-1.5"
                        onClick={() => setWalkInPaymentMethod('upi')}
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        <span>UPI QR</span>
                      </Button>
                      <Button
                        type="button"
                        variant={walkInPaymentMethod === 'cash' ? 'default' : 'outline'}
                        className="h-10 text-xs gap-1.5"
                        onClick={() => setWalkInPaymentMethod('cash')}
                      >
                        <Banknote className="h-3.5 w-3.5" />
                        <span>Cash</span>
                      </Button>
                      <Button
                        type="button"
                        variant={walkInPaymentMethod === 'card' ? 'default' : 'outline'}
                        className="h-10 text-xs gap-1.5"
                        onClick={() => setWalkInPaymentMethod('card')}
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        <span>Card/POS</span>
                      </Button>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setWalkInOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Confirm & Reserve Slot
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Button variant="outline" asChild>
            <Link href="/dashboard/bookings" className="gap-2">
              <Calendar className="h-4 w-4" />
              <span>Full Calendar</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Today&apos;s Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{metrics.todayCount} Slots</div>
            <p className="text-xs text-muted-foreground mt-1">Confirmed & Checked-in</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Today&apos;s Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">₹{metrics.revenueInr}</div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">UPI & Cash reconciled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Peak Slot Utilisation</CardTitle>
            <Trophy className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{metrics.utilizationRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">Evening floodlit slots (6–11 PM)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Active Checkout Holds</CardTitle>
            <Clock className="h-4 w-4 text-sky-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{metrics.activeHolds}</div>
            <p className="text-xs text-muted-foreground mt-1">Protected by 8-min redis lease</p>
          </CardContent>
        </Card>
      </div>

      {/* Live Court Occupancy Visualizer */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Today&apos;s Arena Court Timeline</CardTitle>
              <CardDescription>Real-time slot schedule across all 3 grounds for Thursday, 5 Nov 2026</CardDescription>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span>Confirmed</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                <span>8-Min Hold</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                <span>Available</span>
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {MOCK_RESOURCES.map((res) => {
              const resBookings = bookings.filter((b) => b.resourceOrServiceName === res.name && b.date === '2026-11-05');
              return (
                <div key={res.id} className="p-3.5 rounded-lg border border-border bg-card/60">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{res.name}</span>
                      <Badge variant="outline" className="text-[10px]">{res.operatingHours}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
                      ₹{(res.peakPriceMinor / 100).toLocaleString('en-IN')}/hr peak
                    </span>
                  </div>

                  {/* Horizontal visual time track (17:00 to 24:00) */}
                  <div className="grid grid-cols-7 gap-1.5 text-center">
                    {[17, 18, 19, 20, 21, 22, 23].map((hour) => {
                      const hourStr = `${hour.toString().padStart(2, '0')}:00`;
                      const matchedBooking = resBookings.find((b) => {
                        const start = parseInt(b.startTime.split(':')[0] ?? '0', 10);
                        const end = parseInt(b.endTime.split(':')[0] ?? '0', 10);
                        return hour >= start && hour < end && b.status !== 'cancelled';
                      });

                      let slotBg = 'bg-muted/40 hover:bg-muted text-muted-foreground border-dashed border-border';
                      let statusText = 'Available';

                      if (matchedBooking) {
                        if (matchedBooking.status === 'confirmed' || matchedBooking.status === 'completed') {
                          slotBg = 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-medium';
                          statusText = matchedBooking.customerName.split(' ')[0] ?? 'Booked';
                        } else if (matchedBooking.status === 'temporarily_held') {
                          slotBg = 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300 font-medium';
                          statusText = 'Held (8m)';
                        }
                      }

                      return (
                        <div
                          key={hour}
                          onClick={() => matchedBooking && setSelectedBooking(matchedBooking)}
                          className={`p-2 rounded border text-xs cursor-pointer transition-all ${slotBg}`}
                        >
                          <div className="text-[11px] font-mono opacity-80">{hourStr}</div>
                          <div className="text-[11px] truncate mt-0.5">{statusText}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Bookings Directory Table with Search & Status Filter */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold">Today&apos;s & Upcoming Bookings</CardTitle>
              <CardDescription>Real-time slot reservations, customer contacts, and payment reconciliations</CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-56">
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
                  <th className="pb-2.5 font-medium">Resource / Court</th>
                  <th className="pb-2.5 font-medium">Date & Time</th>
                  <th className="pb-2.5 font-medium">Payment</th>
                  <th className="pb-2.5 font-medium">Status</th>
                  <th className="pb-2.5 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredBookings.map((bk) => {
                  const cfg = STATUS_CONFIG[bk.status] ?? STATUS_CONFIG.confirmed!;
                  const Icon = cfg.icon;

                  return (
                    <tr key={bk.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3">
                        <div className="font-medium text-foreground">{bk.customerName}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-mono">
                          <span>{bk.bookingNumber}</span>
                          <span>•</span>
                          <span>{bk.customerPhone}</span>
                        </div>
                      </td>

                      <td className="py-3">
                        <div className="font-medium text-foreground">{bk.resourceOrServiceName}</div>
                        <div className="text-[11px] text-muted-foreground">{bk.courtOrRoom ?? 'General'}</div>
                      </td>

                      <td className="py-3">
                        <div className="font-medium text-foreground">{bk.date}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {bk.startTime} – {bk.endTime}
                        </div>
                      </td>

                      <td className="py-3">
                        <div className="font-medium text-foreground">
                          ₹{(bk.amountMinor / 100).toLocaleString('en-IN')}
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] uppercase font-mono mt-0.5 ${
                            bk.paymentStatus === 'paid'
                              ? 'text-emerald-600 border-emerald-500/20 bg-emerald-500/10'
                              : 'text-amber-600 border-amber-500/20 bg-amber-500/10'
                          }`}
                        >
                          {bk.paymentMethod} • {bk.paymentStatus}
                        </Badge>
                      </td>

                      <td className="py-3">
                        <Badge variant={cfg.variant} className="gap-1 text-[11px]">
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
                              onClick={() => handleCheckIn(bk.id)}
                            >
                              <Check className="h-3 w-3 text-emerald-600" />
                              <span>Check In</span>
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => setSelectedBooking(bk)}
                          >
                            Details
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <Dialog open={!!selectedBooking} onOpenChange={(open) => !open && setSelectedBooking(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-mono text-xs">
                  {selectedBooking.bookingNumber}
                </Badge>
                <Badge variant={STATUS_CONFIG[selectedBooking.status]?.variant ?? 'default'}>
                  {STATUS_CONFIG[selectedBooking.status]?.label ?? selectedBooking.status}
                </Badge>
              </div>
              <DialogTitle className="text-lg mt-2">{selectedBooking.customerName}</DialogTitle>
              <DialogDescription>
                Customer Contact: {selectedBooking.customerPhone} {selectedBooking.customerEmail ? `• ${selectedBooking.customerEmail}` : ''}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3 border-y border-border text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Resource / Court:</span>
                <span className="font-medium text-foreground">{selectedBooking.resourceOrServiceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date & Slot:</span>
                <span className="font-medium text-foreground font-mono">
                  {selectedBooking.date} ({selectedBooking.startTime} – {selectedBooking.endTime})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Fee:</span>
                <span className="font-medium text-foreground font-mono">
                  ₹{(selectedBooking.amountMinor / 100).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Reconciliation:</span>
                <span className="font-medium uppercase text-emerald-600">
                  {selectedBooking.paymentMethod} • {selectedBooking.paymentStatus}
                </span>
              </div>
              {selectedBooking.notes && (
                <div className="p-2.5 rounded bg-muted/40 text-muted-foreground">
                  <span className="font-medium text-foreground block mb-0.5">Booking Notes:</span>
                  {selectedBooking.notes}
                </div>
              )}
            </div>

            <DialogFooter className="flex gap-2">
              {selectedBooking.status === 'confirmed' && (
                <Button
                  className="gap-1.5"
                  onClick={() => {
                    handleCheckIn(selectedBooking.id);
                  }}
                >
                  <Check className="h-4 w-4" />
                  <span>Mark Player Checked-in</span>
                </Button>
              )}
              <Button variant="outline" onClick={() => setSelectedBooking(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
