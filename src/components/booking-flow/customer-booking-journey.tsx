'use client';

import * as React from 'react';
import {
  Clock,
  User,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  QrCode,
  CreditCard,
  Banknote,
  MapPin,
  Share2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { MOCK_RESOURCES, type MockResource } from '@/lib/mock-data/mock-resources';
import { useToast } from '@/components/ui/toast';

interface CustomerBookingJourneyProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  siteKey: string;
  businessName: string;
}

type BookingStep = 'resource' | 'slot' | 'contact' | 'checkout' | 'confirmed';

interface ConfirmedVoucher {
  bookingNumber: string;
  resourceName: string;
  date: string;
  startTime: string;
  endTime: string;
  customerName: string;
  customerPhone: string;
  amountMinor: number;
  paymentMethod: string;
  lockToken: string;
  confirmedAt: string;
}

const AVAILABLE_DATES = [
  { label: 'Today', date: '2026-11-05', dayName: 'Thu' },
  { label: 'Tomorrow', date: '2026-11-06', dayName: 'Fri' },
  { label: 'Saturday', date: '2026-11-07', dayName: 'Sat' },
  { label: 'Sunday', date: '2026-11-08', dayName: 'Sun' },
  { label: 'Monday', date: '2026-11-09', dayName: 'Mon' },
];

const AVAILABLE_TIMES = [
  { time: '06:00', label: '6:00 AM', isPeak: false, priceMinor: 120000 },
  { time: '07:00', label: '7:00 AM', isPeak: false, priceMinor: 120000 },
  { time: '08:00', label: '8:00 AM', isPeak: false, priceMinor: 120000 },
  { time: '16:00', label: '4:00 PM', isPeak: false, priceMinor: 120000 },
  { time: '17:00', label: '5:00 PM', isPeak: false, priceMinor: 120000 },
  { time: '18:00', label: '6:00 PM', isPeak: true, priceMinor: 180000 },
  { time: '19:00', label: '7:00 PM', isPeak: true, priceMinor: 180000 },
  { time: '20:00', label: '8:00 PM', isPeak: true, priceMinor: 180000 },
  { time: '21:00', label: '9:00 PM', isPeak: true, priceMinor: 180000 },
  { time: '22:00', label: '10:00 PM', isPeak: true, priceMinor: 180000 },
];

export function CustomerBookingJourney({
  isOpen,
  onOpenChange,
  siteKey,
  businessName,
}: CustomerBookingJourneyProps) {
  const { toast } = useToast();
  const [step, setStep] = React.useState<BookingStep>('resource');

  // Step 1: Resource
  const [selectedResource, setSelectedResource] = React.useState<MockResource>(MOCK_RESOURCES[0]!);

  // Step 2: Date & Slot
  const [selectedDate, setSelectedDate] = React.useState<string>(AVAILABLE_DATES[0]!.date);
  const [selectedSlotTime, setSelectedSlotTime] = React.useState<string>('19:00');

  // Step 3: Contact Details
  const [customerName, setCustomerName] = React.useState('');
  const [customerPhone, setCustomerPhone] = React.useState('');
  const [customerEmail, setCustomerEmail] = React.useState('');
  const [playerNotes, setPlayerNotes] = React.useState('');

  // Step 4: Hold & Payment
  const [holdTimerSeconds, setHoldTimerSeconds] = React.useState<number>(480); // 8 minutes TTL
  const [lockToken, setLockToken] = React.useState<string>('');
  const [paymentMethod, setPaymentMethod] = React.useState<'upi' | 'card' | 'venue'>('upi');
  const [isProcessingPayment, setIsProcessingPayment] = React.useState(false);

  // Step 5: Voucher
  const [voucher, setVoucher] = React.useState<ConfirmedVoucher | null>(null);

  // Active slot price calculation
  const currentSlotConfig = AVAILABLE_TIMES.find((s) => s.time === selectedSlotTime) ?? AVAILABLE_TIMES[0]!;
  const currentPriceMinor = currentSlotConfig.isPeak ? selectedResource.peakPriceMinor : selectedResource.basePriceMinor;

  // 8-minute countdown timer when on checkout step
  React.useEffect(() => {
    if (step !== 'checkout') return;

    if (!lockToken) {
      setLockToken(`lk-${Math.random().toString(36).substring(2, 9)}`);
    }

    const interval = setInterval(() => {
      setHoldTimerSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          toast({
            title: 'Slot Hold Expired',
            description: 'The 8-minute reservation window expired. Please reselect your slot.',
            variant: 'destructive',
          });
          setStep('slot');
          return 480;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [step, lockToken, toast]);

  // Format seconds to mm:ss
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Step navigation validations
  const handleProceedToContact = () => {
    setStep('contact');
  };

  const handleCreateHold = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please provide customer name and phone number for SMS booking voucher.',
        variant: 'destructive',
      });
      return;
    }

    // Move to checkout and start 8-minute hold
    setHoldTimerSeconds(480);
    setLockToken(`lock-${Date.now().toString(36)}`);
    setStep('checkout');

    toast({
      title: 'Slot Temporarily Reserved',
      description: 'Your slot is held for 8:00 minutes while you complete payment.',
    });
  };

  // Simulate payment completion
  const handleCompleteBooking = () => {
    setIsProcessingPayment(true);

    setTimeout(() => {
      setIsProcessingPayment(false);

      const startH = parseInt(selectedSlotTime.split(':')[0] ?? '19', 10);
      const endH = startH + 1;
      const endTimeStr = `${endH.toString().padStart(2, '0')}:00`;

      const prefix = siteKey.slice(0, 4).toUpperCase();
      const newVoucher: ConfirmedVoucher = {
        bookingNumber: `BK-${prefix}-${selectedDate.replace(/-/g, '')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        resourceName: selectedResource.name,
        date: selectedDate,
        startTime: selectedSlotTime,
        endTime: endTimeStr,
        customerName,
        customerPhone,
        amountMinor: currentPriceMinor,
        paymentMethod: paymentMethod.toUpperCase(),
        lockToken,
        confirmedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      };

      setVoucher(newVoucher);
      setStep('confirmed');

      toast({
        title: 'Booking Confirmed!',
        description: `Booking #${newVoucher.bookingNumber} is verified. SMS & WhatsApp voucher sent.`,
      });
    }, 1200);
  };

  // Reset when closing
  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep('resource');
      setVoucher(null);
      setHoldTimerSeconds(480);
    }, 300);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden sm:rounded-2xl">
        {/* Header Bar with Progress Indicator */}
        <div className="bg-muted/40 p-5 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary font-mono">
                  {businessName}
                </span>
                <span className="text-muted-foreground">•</span>
                <Badge variant="outline" className="text-[10px]">Instant Booking</Badge>
              </div>
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground mt-1">
                {step === 'resource' && 'Step 1: Choose Your Court / Arena'}
                {step === 'slot' && 'Step 2: Choose Date & Time Slot'}
                {step === 'contact' && 'Step 3: Enter Player & Contact Details'}
                {step === 'checkout' && 'Step 4: Review & Complete Payment'}
                {step === 'confirmed' && 'Booking Voucher Confirmed! 🎉'}
              </DialogTitle>
            </div>

            {step === 'checkout' && (
              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase font-semibold text-amber-600 dark:text-amber-400">
                  Hold Expires In
                </span>
                <div className="font-mono text-base font-bold text-amber-600 dark:text-amber-400 animate-pulse">
                  {formatTimer(holdTimerSeconds)}
                </div>
              </div>
            )}
          </div>

          {/* Stepper Dots */}
          <div className="flex items-center gap-1.5 mt-4">
            {(['resource', 'slot', 'contact', 'checkout', 'confirmed'] as BookingStep[]).map((st, idx) => {
              const activeIdx = ['resource', 'slot', 'contact', 'checkout', 'confirmed'].indexOf(step);
              const isPast = idx < activeIdx;
              const isCurrent = idx === activeIdx;

              return (
                <div
                  key={st}
                  className={`h-1.5 flex-1 rounded-full transition-all ${
                    isCurrent
                      ? 'bg-primary'
                      : isPast
                      ? 'bg-primary/50'
                      : 'bg-border'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* STEP 1: RESOURCE SELECTION */}
          {step === 'resource' && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Select your preferred turf size or cricket cage. All facilities include stadium lighting and high-grip turf.
              </p>

              <div className="grid gap-3">
                {MOCK_RESOURCES.map((res) => {
                  const isSelected = selectedResource.id === res.id;
                  return (
                    <div
                      key={res.id}
                      onClick={() => setSelectedResource(res)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-xs'
                          : 'border-border hover:border-border/80 bg-card'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-foreground text-sm">{res.name}</h4>
                            <Badge variant="outline" className="text-[10px]">{res.type.replace('_', ' ')}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {res.description}
                          </p>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <div className="text-sm font-bold text-foreground font-mono">
                            ₹{(res.basePriceMinor / 100).toLocaleString('en-IN')}
                            <span className="text-xs font-normal text-muted-foreground">/hr</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground block mt-0.5">
                            Peak: ₹{(res.peakPriceMinor / 100).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/60 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{res.operatingHours}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Guaranteed Exclusive Slot</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 flex justify-end">
                <Button onClick={() => setStep('slot')} className="gap-2">
                  <span>Continue to Select Date & Slot</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: DATE & TIME SLOT SELECTION */}
          {step === 'slot' && (
            <div className="space-y-5">
              {/* Selected resource banner */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border text-xs">
                <div>
                  <span className="text-muted-foreground">Court: </span>
                  <span className="font-semibold text-foreground">{selectedResource.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-primary"
                  onClick={() => setStep('resource')}
                >
                  Change Court
                </Button>
              </div>

              {/* Date Pills */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Select Date</Label>
                <div className="grid grid-cols-5 gap-2">
                  {AVAILABLE_DATES.map((d) => {
                    const isSelected = selectedDate === d.date;
                    return (
                      <button
                        key={d.date}
                        type="button"
                        onClick={() => setSelectedDate(d.date)}
                        className={`p-2.5 rounded-lg border text-center transition-all ${
                          isSelected
                            ? 'border-primary bg-primary text-primary-foreground font-semibold shadow-xs'
                            : 'border-border bg-card hover:border-border/80 text-foreground'
                        }`}
                      >
                        <div className="text-[10px] opacity-80 uppercase">{d.dayName}</div>
                        <div className="text-sm font-bold font-mono my-0.5">{d.date.split('-')[2]}</div>
                        <div className="text-[9px] opacity-90">{d.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots Matrix */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Select 1-Hour Time Slot</Label>
                  <span className="text-[11px] text-muted-foreground">
                    Evening slots (6 PM+) include floodlight fee
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {AVAILABLE_TIMES.map((slot) => {
                    const isSelected = selectedSlotTime === slot.time;
                    const slotPrice = slot.isPeak ? selectedResource.peakPriceMinor : selectedResource.basePriceMinor;

                    return (
                      <button
                        key={slot.time}
                        type="button"
                        onClick={() => setSelectedSlotTime(slot.time)}
                        className={`p-2.5 rounded-lg border text-left transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/10 ring-2 ring-primary text-foreground'
                            : 'border-border bg-card hover:bg-muted/40 text-foreground'
                        }`}
                      >
                        <div className="text-xs font-bold font-mono">{slot.label}</div>
                        <div className="text-[11px] font-mono mt-1 text-muted-foreground">
                          ₹{(slotPrice / 100).toLocaleString('en-IN')}
                        </div>
                        {slot.isPeak && (
                          <Badge variant="outline" className="text-[9px] mt-1 px-1 py-0 h-4 bg-amber-500/10 text-amber-600 border-amber-500/20">
                            Peak Floodlit
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Navigation */}
              <div className="pt-3 flex items-center justify-between border-t border-border">
                <Button variant="ghost" onClick={() => setStep('resource')} className="gap-1 text-xs">
                  <ChevronLeft className="h-4 w-4" />
                  <span>Back</span>
                </Button>
                <Button onClick={handleProceedToContact} className="gap-2">
                  <span>Enter Player Details</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: CONTACT INFORMATION */}
          {step === 'contact' && (
            <form onSubmit={handleCreateHold} className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="fullname">Full Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="fullname"
                      placeholder="e.g. Rohan Verma"
                      className="pl-9"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone Number (WhatsApp & SMS) *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        placeholder="+91 98765 43210"
                        className="pl-9 font-mono"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email Address (Optional)</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="rohan@example.com"
                        className="pl-9"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notes">Special Requirements / Player Notes</Label>
                  <Input
                    id="notes"
                    placeholder="e.g. Require 2 footballs and 10 bibs (yellow/blue)"
                    value={playerNotes}
                    onChange={(e) => setPlayerNotes(e.target.value)}
                  />
                </div>
              </div>

              {/* Slot Summary Pill */}
              <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs flex items-center justify-between">
                <div>
                  <span className="font-medium text-foreground">{selectedResource.name}</span>
                  <div className="text-muted-foreground font-mono mt-0.5">
                    {selectedDate} at {selectedSlotTime} (1 Hour)
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-foreground font-mono">
                    ₹{(currentPriceMinor / 100).toLocaleString('en-IN')}
                  </span>
                  <span className="block text-[10px] text-muted-foreground">Incl. GST</span>
                </div>
              </div>

              {/* Navigation */}
              <div className="pt-3 flex items-center justify-between border-t border-border">
                <Button type="button" variant="ghost" onClick={() => setStep('slot')} className="gap-1 text-xs">
                  <ChevronLeft className="h-4 w-4" />
                  <span>Back</span>
                </Button>
                <Button type="submit" className="gap-2">
                  <span>Lock Slot & Review</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </form>
          )}

          {/* STEP 4: TEMPORARY HOLD & CHECKOUT */}
          {step === 'checkout' && (
            <div className="space-y-5">
              {/* Active Hold Alert */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 animate-spin" />
                  <div>
                    <span className="font-bold text-amber-700 dark:text-amber-300 block">
                      Slot Reserved for {formatTimer(holdTimerSeconds)} Minutes
                    </span>
                    <span className="text-amber-600 dark:text-amber-400 text-[11px]">
                      Protected from double bookings. Token: <code className="font-mono">{lockToken}</code>
                    </span>
                  </div>
                </div>
              </div>

              {/* Order Breakdown */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Turf / Facility:</span>
                  <span className="font-medium text-foreground">{selectedResource.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-medium text-foreground font-mono">{selectedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time Slot:</span>
                  <span className="font-medium text-foreground font-mono">{selectedSlotTime} – 1 Hour</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Player Contact:</span>
                  <span className="font-medium text-foreground">{customerName} ({customerPhone})</span>
                </div>
                <div className="pt-2 border-t border-border flex justify-between text-sm font-bold">
                  <span>Total Payable:</span>
                  <span className="font-mono text-primary">₹{(currentPriceMinor / 100).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Select Indian Payment Method</Label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('upi')}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      paymentMethod === 'upi'
                        ? 'border-primary bg-primary/10 text-foreground ring-2 ring-primary'
                        : 'border-border bg-card hover:bg-muted/30 text-muted-foreground'
                    }`}
                  >
                    <QrCode className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <div className="text-xs font-bold text-foreground">UPI Instant</div>
                    <div className="text-[10px] text-muted-foreground">GPay / PhonePe / Paytm</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      paymentMethod === 'card'
                        ? 'border-primary bg-primary/10 text-foreground ring-2 ring-primary'
                        : 'border-border bg-card hover:bg-muted/30 text-muted-foreground'
                    }`}
                  >
                    <CreditCard className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <div className="text-xs font-bold text-foreground">Debit / Credit</div>
                    <div className="text-[10px] text-muted-foreground">Visa, RuPay, MC</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('venue')}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      paymentMethod === 'venue'
                        ? 'border-primary bg-primary/10 text-foreground ring-2 ring-primary'
                        : 'border-border bg-card hover:bg-muted/30 text-muted-foreground'
                    }`}
                  >
                    <Banknote className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <div className="text-xs font-bold text-foreground">Pay at Venue</div>
                    <div className="text-[10px] text-muted-foreground">Cash / Counter QR</div>
                  </button>
                </div>
              </div>

              {/* Payment Action */}
              <div className="pt-2 flex items-center justify-between border-t border-border">
                <Button variant="ghost" onClick={() => setStep('contact')} className="gap-1 text-xs">
                  <ChevronLeft className="h-4 w-4" />
                  <span>Back</span>
                </Button>
                <Button
                  onClick={handleCompleteBooking}
                  disabled={isProcessingPayment}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>
                    {isProcessingPayment
                      ? 'Confirming with Payment Gateway...'
                      : `Pay ₹${(currentPriceMinor / 100).toLocaleString('en-IN')} & Confirm`}
                  </span>
                </Button>
              </div>
            </div>
          )}

          {/* STEP 5: CONFIRMATION VOUCHER */}
          {step === 'confirmed' && voucher && (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 mb-2">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-foreground">Court Slot Successfully Confirmed!</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  A WhatsApp confirmation voucher has been sent to <span className="font-mono font-medium text-foreground">{voucher.customerPhone}</span>.
                </p>
              </div>

              {/* Digital Pass Card */}
              <div className="max-w-md mx-auto p-5 rounded-2xl border border-border bg-card shadow-sm text-left space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Pass Reference</span>
                    <div className="font-mono text-base font-extrabold text-foreground">{voucher.bookingNumber}</div>
                  </div>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                    Confirmed
                  </Badge>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Turf:</span>
                    <span className="font-semibold text-foreground">{voucher.resourceName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span className="font-mono font-semibold text-foreground">{voucher.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time Slot:</span>
                    <span className="font-mono font-semibold text-foreground">
                      {voucher.startTime} – {voucher.endTime}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Player Name:</span>
                    <span className="font-semibold text-foreground">{voucher.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment:</span>
                    <span className="font-semibold uppercase text-emerald-600">
                      ₹{(voucher.amountMinor / 100).toLocaleString('en-IN')} ({voucher.paymentMethod})
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span>Indiranagar Arena, Bengaluru</span>
                  </span>
                  <span className="font-mono text-[10px]">Confirmed at {voucher.confirmedAt}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => {
                    toast({
                      title: 'Digital Pass Saved',
                      description: 'Booking pass copied to clipboard for easy sharing.',
                    });
                  }}
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>Share Pass</span>
                </Button>

                <Button
                  size="sm"
                  onClick={handleClose}
                  className="text-xs"
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
