'use client';

import * as React from 'react';
import {
  User,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  QrCode,
  CreditCard,
  MapPin,
  AlertTriangle,
  Users,
  Stethoscope,
  RefreshCw,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import type { BookingModel } from '@/types/domain';
import { useToast } from '@/components/ui/toast';

export interface PublicCatalogPayload {
  resources: Array<{
    id: string;
    name: string;
    type: string;
    slotDurationMinutes: number;
    basePriceMinor: number;
    peakPriceMinor: number;
    description: string;
    operatingHoursLabel: string;
  }>;
  services: Array<{
    id: string;
    name: string;
    description: string;
    durationMinutes: number;
    bufferAfterMinutes: number;
    priceMinor: number;
  }>;
  staffMembers: Array<{
    id: string;
    displayName: string;
    specialty: string;
    serviceIds: string[];
    workingStartHour: number;
    workingEndHour: number;
  }>;
  sessions: Array<{
    id: string;
    name: string;
    instructorName: string;
    description: string;
    dateLocal: string;
    startTime: string;
    endTime: string;
    maxCapacity: number;
    bookedCount: number;
    heldCount: number;
    remainingCapacity: number;
    priceMinor: number;
  }>;
}

interface LiveSlotItem {
  startsAtIso: string;
  endsAtIso: string;
  priceMinor: number;
  currency: string;
  resourceId?: string;
  staffMemberId?: string;
  sessionId?: string;
  remainingCapacity?: number;
}

interface ActiveCheckoutSession {
  bookingId: string;
  bookingNumber: string;
  holdToken: string;
  expiresAtIso: string;
  totalMinor: number;
  paymentId: string;
  providerOrderId: string;
  simulatedPaymentId: string;
  simulatedSignature: string;
}

interface ConfirmedVoucher {
  bookingId: string;
  bookingNumber: string;
  itemName: string;
  secondaryLabel?: string;
  date: string;
  timeRange: string;
  customerName: string;
  customerPhone: string;
  amountMinor: number;
  paymentMethod: string;
  confirmedAt: string;
}

interface CustomerBookingJourneyProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  siteKey: string;
  businessName: string;
  bookingModel: BookingModel;
  brandAccentHex?: string;
  catalog: PublicCatalogPayload;
  preselectedItemId?: string;
  onBookingCompleted?: () => void;
}

type BookingStep = 'offering' | 'slot' | 'contact' | 'checkout' | 'confirmed';

const AVAILABLE_DATES = [
  { label: 'Today', date: '2026-11-05', dayName: 'Thu' },
  { label: 'Tomorrow', date: '2026-11-06', dayName: 'Fri' },
  { label: 'Sat', date: '2026-11-07', dayName: 'Sat' },
  { label: 'Sun', date: '2026-11-08', dayName: 'Sun' },
  { label: 'Mon', date: '2026-11-09', dayName: 'Mon' },
];

function formatSlotWallClockIst(iso: string): string {
  const d = new Date(iso);
  const ist = new Date(d.getTime() + 330 * 60_000);
  const hh = ist.getUTCHours();
  const mm = String(ist.getUTCMinutes()).padStart(2, '0');
  const period = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${mm} ${period}`;
}

function formatHm24Ist(iso: string): string {
  const d = new Date(iso);
  const ist = new Date(d.getTime() + 330 * 60_000);
  return `${String(ist.getUTCHours()).padStart(2, '0')}:${String(
    ist.getUTCMinutes(),
  ).padStart(2, '0')}`;
}

function makeIdempotencyKey(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export function CustomerBookingJourney({
  isOpen,
  onOpenChange,
  tenantId,
  businessName,
  bookingModel,
  brandAccentHex = '#16a34a',
  catalog,
  preselectedItemId,
  onBookingCompleted,
}: CustomerBookingJourneyProps) {
  const { toast } = useToast();
  const [step, setStep] = React.useState<BookingStep>('offering');

  // Offering selections across Model A / B / C
  const [selectedResourceId, setSelectedResourceId] = React.useState<string>(
    catalog.resources[0]?.id ?? '',
  );
  const [selectedServiceId, setSelectedServiceId] = React.useState<string>(
    catalog.services[0]?.id ?? '',
  );
  const [selectedStaffId, setSelectedStaffId] = React.useState<string>(
    catalog.staffMembers[0]?.id ?? '',
  );
  const [selectedSessionId, setSelectedSessionId] = React.useState<string>(
    catalog.sessions[0]?.id ?? '',
  );
  const [seatQuantity, setSeatQuantity] = React.useState<number>(1);

  // Date & live server slots
  const [selectedDate, setSelectedDate] = React.useState<string>(AVAILABLE_DATES[0]!.date);
  const [liveSlots, setLiveSlots] = React.useState<LiveSlotItem[]>([]);
  const [selectedSlot, setSelectedSlot] = React.useState<LiveSlotItem | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = React.useState(false);

  // Contact details
  const [customerName, setCustomerName] = React.useState('');
  const [customerPhone, setCustomerPhone] = React.useState('');
  const [customerEmail, setCustomerEmail] = React.useState('');
  const [playerNotes, setPlayerNotes] = React.useState('');

  // Server Hold & Checkout state
  const [checkoutSession, setCheckoutSession] =
    React.useState<ActiveCheckoutSession | null>(null);
  const [holdTimerSeconds, setHoldTimerSeconds] = React.useState<number>(480);
  const [paymentMethod, setPaymentMethod] = React.useState<'upi' | 'card'>('upi');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorBanner, setErrorBanner] = React.useState<string | null>(null);

  // Confirmed voucher
  const [voucher, setVoucher] = React.useState<ConfirmedVoucher | null>(null);

  // Sync defaults when modal opens or preselection changes
  React.useEffect(() => {
    if (!isOpen) return;
    setErrorBanner(null);

    if (bookingModel === 'exclusive_resource') {
      const target =
        catalog.resources.find((r) => r.id === preselectedItemId) ?? catalog.resources[0];
      if (target) setSelectedResourceId(target.id);
    } else if (bookingModel === 'staff_appointment') {
      const targetSrv =
        catalog.services.find((s) => s.id === preselectedItemId) ?? catalog.services[0];
      if (targetSrv) {
        setSelectedServiceId(targetSrv.id);
        const eligibleStaff = catalog.staffMembers.filter((st) =>
          st.serviceIds.includes(targetSrv.id),
        );
        if (eligibleStaff[0]) setSelectedStaffId(eligibleStaff[0].id);
      }
    } else if (bookingModel === 'capacity_session') {
      const targetSess =
        catalog.sessions.find((s) => s.id === preselectedItemId) ??
        catalog.sessions.find((s) => s.remainingCapacity > 0) ??
        catalog.sessions[0];
      if (targetSess) {
        setSelectedSessionId(targetSess.id);
        setSeatQuantity(1);
      }
    }
  }, [isOpen, preselectedItemId, bookingModel, catalog]);

  // Eligible staff for selected service in Model B
  const eligibleStaffForService = React.useMemo(() => {
    if (!selectedServiceId) return catalog.staffMembers;
    return catalog.staffMembers.filter((st) => st.serviceIds.includes(selectedServiceId));
  }, [catalog.staffMembers, selectedServiceId]);

  React.useEffect(() => {
    if (
      bookingModel === 'staff_appointment' &&
      eligibleStaffForService.length > 0 &&
      !eligibleStaffForService.some((st) => st.id === selectedStaffId)
    ) {
      setSelectedStaffId(eligibleStaffForService[0]!.id);
    }
  }, [bookingModel, eligibleStaffForService, selectedStaffId]);

  // Fetch real server-authoritative slots when on Step 2 ('slot')
  const fetchLiveAvailability = React.useCallback(async () => {
    if (bookingModel === 'capacity_session') return;
    setIsLoadingSlots(true);
    setErrorBanner(null);
    try {
      const params = new URLSearchParams({
        tenantId,
        locationId: 'loc-01',
        bookingModel,
        dateLocal: selectedDate,
      });
      if (bookingModel === 'exclusive_resource' && selectedResourceId) {
        params.set('resourceId', selectedResourceId);
      }
      if (bookingModel === 'staff_appointment') {
        if (selectedServiceId) params.set('serviceId', selectedServiceId);
        if (selectedStaffId) params.set('staffMemberId', selectedStaffId);
      }

      const res = await fetch(`/api/public/v1/availability?${params.toString()}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) {
        setLiveSlots([]);
        setSelectedSlot(null);
        setErrorBanner(data?.error?.message ?? 'Unable to load available time slots.');
        return;
      }

      const slots: LiveSlotItem[] = data.slots ?? [];
      setLiveSlots(slots);
      setSelectedSlot((prev) => {
        if (prev && slots.some((s) => s.startsAtIso === prev.startsAtIso)) {
          return slots.find((s) => s.startsAtIso === prev.startsAtIso) ?? slots[0] ?? null;
        }
        return slots[0] ?? null;
      });
    } catch {
      setErrorBanner('Network error while checking live availability.');
    } finally {
      setIsLoadingSlots(false);
    }
  }, [
    bookingModel,
    tenantId,
    selectedDate,
    selectedResourceId,
    selectedServiceId,
    selectedStaffId,
  ]);

  React.useEffect(() => {
    if (isOpen && step === 'slot') {
      void fetchLiveAvailability();
    }
  }, [isOpen, step, fetchLiveAvailability]);

  // Countdown timer synced to server expiresAtIso
  React.useEffect(() => {
    if (step !== 'checkout' || !checkoutSession) return;

    const tick = () => {
      const remainingSec = Math.max(
        0,
        Math.floor((new Date(checkoutSession.expiresAtIso).getTime() - Date.now()) / 1000),
      );
      setHoldTimerSeconds(remainingSec);
      if (remainingSec <= 0) {
        toast({
          title: 'Slot Hold Expired',
          description: 'Your 8-minute hold expired. Please reselect an available slot.',
          variant: 'destructive',
        });
        setCheckoutSession(null);
        setStep(bookingModel === 'capacity_session' ? 'offering' : 'slot');
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [step, checkoutSession, bookingModel, toast]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentResource = catalog.resources.find((r) => r.id === selectedResourceId);
  const currentService = catalog.services.find((s) => s.id === selectedServiceId);
  const currentStaff = catalog.staffMembers.find((st) => st.id === selectedStaffId);
  const currentSession = catalog.sessions.find((sess) => sess.id === selectedSessionId);

  const summaryItemName =
    bookingModel === 'exclusive_resource'
      ? currentResource?.name ?? 'Selected Court'
      : bookingModel === 'staff_appointment'
      ? currentService?.name ?? 'Selected Service'
      : currentSession?.name ?? 'Selected Class';

  const summarySecondary =
    bookingModel === 'staff_appointment'
      ? currentStaff?.displayName
      : bookingModel === 'capacity_session'
      ? `${seatQuantity} seat${seatQuantity > 1 ? 's' : ''} • Coach ${currentSession?.instructorName ?? ''}`
      : undefined;

  const estimatedTotalMinor =
    checkoutSession?.totalMinor ??
    (bookingModel === 'capacity_session'
      ? (currentSession?.priceMinor ?? 0) * seatQuantity
      : selectedSlot?.priceMinor ?? currentService?.priceMinor ?? currentResource?.basePriceMinor ?? 0);

  // Create real server hold + initiate checkout payment order
  const handleCreateHoldAndCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);

    if (!customerName.trim() || customerPhone.trim().length < 10) {
      setErrorBanner('Please enter your full name and a valid 10+ digit phone number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectionPayload =
        bookingModel === 'exclusive_resource'
          ? {
              bookingModel: 'exclusive_resource' as const,
              resourceId: selectedResourceId,
              startsAtIso: selectedSlot?.startsAtIso ?? '',
              endsAtIso: selectedSlot?.endsAtIso ?? '',
            }
          : bookingModel === 'staff_appointment'
          ? {
              bookingModel: 'staff_appointment' as const,
              serviceId: selectedServiceId,
              staffMemberId: selectedStaffId,
              startsAtIso: selectedSlot?.startsAtIso ?? '',
              endsAtIso: selectedSlot?.endsAtIso ?? '',
            }
          : {
              bookingModel: 'capacity_session' as const,
              sessionId: selectedSessionId,
              quantity: seatQuantity,
            };

      const holdRes = await fetch('/api/public/v1/holds', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': makeIdempotencyKey('hold'),
        },
        body: JSON.stringify({
          tenantId,
          locationId: 'loc-01',
          customer: {
            fullName: customerName.trim(),
            phone: customerPhone.trim(),
            email: customerEmail.trim() || undefined,
            notes: playerNotes.trim() || undefined,
          },
          selection: selectionPayload,
        }),
      });

      const holdData = await holdRes.json();
      if (!holdRes.ok) {
        const msg = holdData?.error?.message ?? 'Selected slot is no longer available.';
        setErrorBanner(msg);
        toast({
          title: 'Slot Unavailable',
          description: msg,
          variant: 'destructive',
        });
        if (bookingModel !== 'capacity_session') {
          void fetchLiveAvailability();
          setStep('slot');
        } else {
          onBookingCompleted?.();
        }
        return;
      }

      // Initiate server payment order
      const checkoutRes = await fetch('/api/public/v1/checkout', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': makeIdempotencyKey('chk'),
        },
        body: JSON.stringify({
          tenantId,
          bookingId: holdData.bookingId,
          holdToken: holdData.holdToken,
        }),
      });
      const checkoutData = await checkoutRes.json();
      if (!checkoutRes.ok) {
        setErrorBanner(checkoutData?.error?.message ?? 'Failed to initialize payment.');
        return;
      }

      setCheckoutSession({
        bookingId: holdData.bookingId,
        bookingNumber: holdData.bookingNumber,
        holdToken: holdData.holdToken,
        expiresAtIso: holdData.expiresAt,
        totalMinor: holdData.totalMinor,
        paymentId: checkoutData.paymentId,
        providerOrderId: checkoutData.providerOrderId,
        simulatedPaymentId:
          checkoutData.clientCheckoutPayload?.simulatedPaymentId ?? '',
        simulatedSignature:
          checkoutData.clientCheckoutPayload?.simulatedSignature ?? '',
      });
      setStep('checkout');

      toast({
        title: 'Slot Locked for 8 Minutes',
        description: `Reference ${holdData.bookingNumber} is exclusively reserved while you pay.`,
      });
    } catch {
      setErrorBanner('Network error while locking slot. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Complete HMAC-verified payment (or simulate decline for retry testing)
  const handleVerifyPayment = async (simulateFailure = false) => {
    if (!checkoutSession) return;
    setIsSubmitting(true);
    setErrorBanner(null);

    try {
      const payload = simulateFailure
        ? {
            simulateFailure: true,
            tenantId,
            bookingId: checkoutSession.bookingId,
            providerOrderId: checkoutSession.providerOrderId,
            reason: 'Customer simulated UPI bank timeout',
          }
        : {
            tenantId,
            bookingId: checkoutSession.bookingId,
            paymentId: checkoutSession.paymentId,
            providerOrderId: checkoutSession.providerOrderId,
            providerPaymentId: checkoutSession.simulatedPaymentId,
            providerSignature: checkoutSession.simulatedSignature,
            paymentMethod,
          };

      const res = await fetch('/api/public/v1/payments/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorBanner(data?.error?.message ?? data?.message ?? 'Payment failed.');
        toast({
          title: 'Payment Not Completed',
          description:
            data?.error?.message ?? 'Your hold is still active—you can retry payment.',
          variant: 'destructive',
        });
        return;
      }

      const timeRange =
        bookingModel === 'capacity_session' && currentSession
          ? `${currentSession.startTime} – ${currentSession.endTime}`
          : selectedSlot
          ? `${formatHm24Ist(selectedSlot.startsAtIso)} – ${formatHm24Ist(
              selectedSlot.endsAtIso,
            )}`
          : '';

      setVoucher({
        bookingId: checkoutSession.bookingId,
        bookingNumber: data.bookingNumber ?? checkoutSession.bookingNumber,
        itemName: summaryItemName,
        secondaryLabel: summarySecondary,
        date: selectedDate,
        timeRange,
        customerName,
        customerPhone,
        amountMinor: checkoutSession.totalMinor,
        paymentMethod: paymentMethod.toUpperCase(),
        confirmedAt: new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      });
      setStep('confirmed');
      onBookingCompleted?.();

      toast({
        title: 'Booking Confirmed!',
        description: `Booking #${checkoutSession.bookingNumber} confirmed and notification queued.`,
        variant: 'success',
      });
    } catch {
      setErrorBanner('Network error while verifying payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep('offering');
      setVoucher(null);
      setCheckoutSession(null);
      setErrorBanner(null);
    }, 250);
  };

  const stepsOrder: BookingStep[] =
    bookingModel === 'capacity_session'
      ? ['offering', 'contact', 'checkout', 'confirmed']
      : ['offering', 'slot', 'contact', 'checkout', 'confirmed'];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden sm:rounded-2xl">
        {/* Header Bar */}
        <div className="bg-muted/40 p-4 sm:p-5 border-b border-border">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  style={{ color: brandAccentHex }}
                  className="text-xs font-semibold uppercase tracking-wider font-mono"
                >
                  {businessName}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {bookingModel === 'exclusive_resource'
                    ? 'Exclusive Resource'
                    : bookingModel === 'staff_appointment'
                    ? 'Specialist Appointment'
                    : 'Group Class Batch'}
                </Badge>
              </div>
              <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground mt-1">
                {step === 'offering' &&
                  (bookingModel === 'exclusive_resource'
                    ? 'Step 1: Choose Court / Facility'
                    : bookingModel === 'staff_appointment'
                    ? 'Step 1: Select Service & Specialist'
                    : 'Step 1: Choose Class Batch & Seats')}
                {step === 'slot' && 'Step 2: Choose Date & Live Time Slot'}
                {step === 'contact' && 'Enter Contact Details'}
                {step === 'checkout' && 'Review 8-Min Hold & Complete Payment'}
                {step === 'confirmed' && 'Booking Confirmed!'}
              </DialogTitle>
            </div>

            {step === 'checkout' && (
              <div className="flex flex-col items-end shrink-0">
                <span className="text-[10px] uppercase font-semibold text-amber-600">
                  Hold Expires
                </span>
                <div
                  data-testid="checkout-hold-timer"
                  className="font-mono text-base font-bold text-amber-600"
                >
                  {formatTimer(holdTimerSeconds)}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 mt-3">
            {stepsOrder.map((st, idx) => {
              const activeIdx = stepsOrder.indexOf(step);
              return (
                <div
                  key={st}
                  style={
                    idx <= activeIdx ? { backgroundColor: brandAccentHex } : undefined
                  }
                  className={`h-1.5 flex-1 rounded-full transition-all ${
                    idx <= activeIdx ? '' : 'bg-border'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 max-h-[72dvh] overflow-y-auto space-y-4">
          {errorBanner && (
            <div
              role="alert"
              data-testid="booking-error-alert"
              className="p-3 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorBanner}</span>
            </div>
          )}

          {/* STEP 1A: EXCLUSIVE RESOURCE */}
          {step === 'offering' && bookingModel === 'exclusive_resource' && (
            <div className="space-y-4">
              <div className="grid gap-3">
                {catalog.resources.map((res) => {
                  const isSelected = selectedResourceId === res.id;
                  return (
                    <div
                      key={res.id}
                      data-testid={`modal-resource-option-${res.id}`}
                      onClick={() => setSelectedResourceId(res.id)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-card hover:border-border/80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-semibold text-foreground text-sm">
                            {res.name}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {res.description}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold text-foreground font-mono">
                            ₹{(res.basePriceMinor / 100).toLocaleString('en-IN')}/hr
                          </div>
                          <span className="text-[10px] text-muted-foreground block">
                            Peak: ₹{(res.peakPriceMinor / 100).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  data-testid="booking-continue-to-slots"
                  disabled={!selectedResourceId}
                  onClick={() => setStep('slot')}
                  className="gap-2"
                >
                  <span>Continue to Date & Time Slots</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 1B: SERVICE & STAFF APPOINTMENT */}
          {step === 'offering' && bookingModel === 'staff_appointment' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">1. Select Treatment / Service</Label>
                <div className="grid gap-2.5">
                  {catalog.services.map((srv) => {
                    const isSelected = selectedServiceId === srv.id;
                    return (
                      <div
                        key={srv.id}
                        data-testid={`modal-service-option-${srv.id}`}
                        onClick={() => setSelectedServiceId(srv.id)}
                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-card'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-sm text-foreground">
                            {srv.name}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {srv.durationMinutes} mins
                            {srv.bufferAfterMinutes > 0
                              ? ` (+${srv.bufferAfterMinutes}m prep buffer)`
                              : ''}
                          </div>
                        </div>
                        <div className="font-mono font-bold text-sm text-foreground shrink-0">
                          ₹{(srv.priceMinor / 100).toLocaleString('en-IN')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">
                  2. Choose Specialist / Practitioner
                </Label>
                <div className="grid gap-2.5">
                  {eligibleStaffForService.map((st) => {
                    const isSelected = selectedStaffId === st.id;
                    return (
                      <div
                        key={st.id}
                        data-testid={`modal-staff-option-${st.id}`}
                        onClick={() => setSelectedStaffId(st.id)}
                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-card'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Stethoscope className="h-4 w-4 text-primary shrink-0" />
                          <div>
                            <div className="font-semibold text-sm text-foreground">
                              {st.displayName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {st.specialty}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {st.workingStartHour}:00–{st.workingEndHour}:00
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  data-testid="booking-continue-to-slots"
                  disabled={!selectedServiceId || !selectedStaffId}
                  onClick={() => setStep('slot')}
                  className="gap-2"
                >
                  <span>Choose Appointment Slot</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 1C: CAPACITY GROUP SESSION */}
          {step === 'offering' && bookingModel === 'capacity_session' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">
                  Select Group Class Session
                </Label>
                <div className="grid gap-2.5">
                  {catalog.sessions.map((sess) => {
                    const isFull = sess.remainingCapacity <= 0;
                    const isSelected = selectedSessionId === sess.id;
                    return (
                      <div
                        key={sess.id}
                        data-testid={`modal-session-option-${sess.id}`}
                        onClick={() => {
                          if (!isFull) {
                            setSelectedSessionId(sess.id);
                            setSeatQuantity(1);
                          }
                        }}
                        className={`p-3.5 rounded-xl border-2 transition-all flex items-center justify-between gap-3 ${
                          isFull
                            ? 'border-border/50 bg-muted/30 opacity-60 cursor-not-allowed'
                            : isSelected
                            ? 'border-primary bg-primary/5 cursor-pointer'
                            : 'border-border bg-card cursor-pointer'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-foreground">
                              {sess.name}
                            </span>
                            <Badge
                              variant={isFull ? 'destructive' : 'outline'}
                              className="text-[10px] font-mono"
                            >
                              {isFull
                                ? 'FULL (0 left)'
                                : `${sess.remainingCapacity} / ${sess.maxCapacity} seats open`}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {sess.startTime} – {sess.endTime} • Instructor{' '}
                            {sess.instructorName}
                          </div>
                        </div>
                        <div className="font-mono font-bold text-sm text-foreground shrink-0">
                          ₹{(sess.priceMinor / 100).toLocaleString('en-IN')}/seat
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {currentSession && currentSession.remainingCapacity > 0 && (
                <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20 text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-primary" />
                    <span>Participant Seats to Reserve:</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={seatQuantity <= 1}
                      onClick={() => setSeatQuantity((q) => Math.max(1, q - 1))}
                      className="h-7 w-7 p-0"
                    >
                      -
                    </Button>
                    <span
                      data-testid="session-seat-quantity"
                      className="font-mono font-bold text-sm w-6 text-center"
                    >
                      {seatQuantity}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={seatQuantity >= Math.min(10, currentSession.remainingCapacity)}
                      onClick={() =>
                        setSeatQuantity((q) =>
                          Math.min(currentSession.remainingCapacity, q + 1),
                        )
                      }
                      className="h-7 w-7 p-0"
                    >
                      +
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  data-testid="booking-continue-to-contact"
                  disabled={!currentSession || currentSession.remainingCapacity < seatQuantity}
                  onClick={() => setStep('contact')}
                  className="gap-2"
                >
                  <span>Continue to Participant Details</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: LIVE SERVER DATE & TIME SLOTS (Model A & Model B) */}
          {step === 'slot' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border text-xs">
                <div>
                  <span className="font-semibold text-foreground">{summaryItemName}</span>
                  {summarySecondary && (
                    <span className="text-muted-foreground"> • {summarySecondary}</span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-primary"
                  onClick={() => setStep('offering')}
                >
                  Change
                </Button>
              </div>

              {/* Date selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Select Date</Label>
                <div className="grid grid-cols-5 gap-2">
                  {AVAILABLE_DATES.map((d) => {
                    const isSelected = selectedDate === d.date;
                    return (
                      <button
                        key={d.date}
                        type="button"
                        data-testid={`date-pill-${d.date}`}
                        onClick={() => setSelectedDate(d.date)}
                        className={`p-2 rounded-lg border text-center transition-all ${
                          isSelected
                            ? 'border-primary bg-primary text-primary-foreground font-semibold'
                            : 'border-border bg-card text-foreground'
                        }`}
                      >
                        <div className="text-[10px] opacity-80 uppercase">{d.dayName}</div>
                        <div className="text-sm font-bold font-mono">{d.date.split('-')[2]}</div>
                        <div className="text-[9px] opacity-90">{d.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Server Slots */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">
                    Available Slots ({liveSlots.length})
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void fetchLiveAvailability()}
                    className="h-6 px-2 text-[11px] gap-1"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Refresh</span>
                  </Button>
                </div>

                {isLoadingSlots ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    Checking real-time availability...
                  </div>
                ) : liveSlots.length === 0 ? (
                  <div
                    data-testid="no-slots-message"
                    className="p-6 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground"
                  >
                    No open slots available on {selectedDate} (practitioner off-duty or fully booked). Please pick another date.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {liveSlots.map((slot) => {
                      const hm = formatHm24Ist(slot.startsAtIso);
                      const isSelected = selectedSlot?.startsAtIso === slot.startsAtIso;
                      return (
                        <button
                          key={slot.startsAtIso}
                          type="button"
                          data-testid={`slot-option-${hm}`}
                          onClick={() => setSelectedSlot(slot)}
                          className={`p-2.5 rounded-lg border text-left transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/10 ring-2 ring-primary text-foreground'
                              : 'border-border bg-card hover:bg-muted/40 text-foreground'
                          }`}
                        >
                          <div className="text-xs font-bold font-mono">
                            {formatSlotWallClockIst(slot.startsAtIso)}
                          </div>
                          <div className="text-[11px] font-mono mt-0.5 text-muted-foreground">
                            ₹{(slot.priceMinor / 100).toLocaleString('en-IN')}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep('offering')}
                  className="gap-1 text-xs"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Back</span>
                </Button>
                <Button
                  data-testid="booking-continue-to-contact"
                  disabled={!selectedSlot}
                  onClick={() => setStep('contact')}
                  className="gap-2"
                >
                  <span>Continue</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: CONTACT DETAILS */}
          {step === 'contact' && (
            <form onSubmit={handleCreateHoldAndCheckout} className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="fullname">Full Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="fullname"
                      data-testid="booking-input-name"
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
                    <Label htmlFor="phone">Phone Number (WhatsApp) *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        data-testid="booking-input-phone"
                        placeholder="+91 98765 43210"
                        className="pl-9 font-mono"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email (Optional)</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        data-testid="booking-input-email"
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
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Input
                    id="notes"
                    placeholder="Any special requests..."
                    value={playerNotes}
                    onChange={(e) => setPlayerNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs flex items-center justify-between">
                <div>
                  <span className="font-medium text-foreground">{summaryItemName}</span>
                  <div className="text-muted-foreground font-mono mt-0.5">
                    {bookingModel === 'capacity_session'
                      ? `${currentSession?.startTime} – ${currentSession?.endTime} (${seatQuantity} seat)`
                      : `${selectedDate} at ${
                          selectedSlot ? formatHm24Ist(selectedSlot.startsAtIso) : ''
                        }`}
                  </div>
                </div>
                <div className="text-right font-bold font-mono text-foreground">
                  ₹{(estimatedTotalMinor / 100).toLocaleString('en-IN')}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    setStep(bookingModel === 'capacity_session' ? 'offering' : 'slot')
                  }
                  className="gap-1 text-xs"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Back</span>
                </Button>
                <Button
                  type="submit"
                  data-testid="booking-lock-slot-btn"
                  disabled={isSubmitting}
                  className="gap-2"
                >
                  <span>{isSubmitting ? 'Locking Slot...' : 'Lock Slot & Proceed to Pay'}</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </form>
          )}

          {/* STEP 4: CHECKOUT & SIMULATED TEST PAYMENT */}
          {step === 'checkout' && checkoutSession && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                <span className="font-bold text-amber-700 dark:text-amber-300 block">
                  Exclusive Hold Active ({formatTimer(holdTimerSeconds)})
                </span>
                <span className="text-amber-600 dark:text-amber-400 text-[11px] font-mono">
                  Ref: {checkoutSession.bookingNumber} • Order: {checkoutSession.providerOrderId}
                </span>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Selection:</span>
                  <span className="font-medium text-foreground">{summaryItemName}</span>
                </div>
                {summarySecondary && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Details:</span>
                    <span className="font-medium text-foreground">{summarySecondary}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="font-medium text-foreground">
                    {customerName} ({customerPhone})
                  </span>
                </div>
                <div className="pt-2 border-t border-border flex justify-between text-sm font-bold">
                  <span>Total Payable:</span>
                  <span className="font-mono text-primary">
                    ₹{(checkoutSession.totalMinor / 100).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi')}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    paymentMethod === 'upi'
                      ? 'border-primary bg-primary/10 ring-2 ring-primary'
                      : 'border-border bg-card'
                  }`}
                >
                  <QrCode className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <div className="text-xs font-bold text-foreground">UPI Instant</div>
                  <div className="text-[10px] text-muted-foreground">GPay / PhonePe</div>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    paymentMethod === 'card'
                      ? 'border-primary bg-primary/10 ring-2 ring-primary'
                      : 'border-border bg-card'
                  }`}
                >
                  <CreditCard className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <div className="text-xs font-bold text-foreground">Card</div>
                  <div className="text-[10px] text-muted-foreground">RuPay / Visa / MC</div>
                </button>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSubmitting}
                  data-testid="simulate-payment-failure-btn"
                  onClick={() => void handleVerifyPayment(true)}
                  className="text-xs text-rose-600 border-rose-500/30 hover:bg-rose-500/10"
                >
                  Test Decline
                </Button>

                <Button
                  type="button"
                  data-testid="booking-pay-confirm-btn"
                  onClick={() => void handleVerifyPayment(false)}
                  disabled={isSubmitting}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>
                    {isSubmitting
                      ? 'Verifying Signature...'
                      : `Pay ₹${(checkoutSession.totalMinor / 100).toLocaleString(
                          'en-IN',
                        )} & Confirm`}
                  </span>
                </Button>
              </div>
            </div>
          )}

          {/* STEP 5: CONFIRMED VOUCHER */}
          {step === 'confirmed' && voucher && (
            <div data-testid="booking-confirmed-voucher" className="space-y-5 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Reservation Confirmed!
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Confirmation queued for{' '}
                  <span className="font-mono font-medium text-foreground">
                    {voucher.customerPhone}
                  </span>
                </p>
              </div>

              <div className="max-w-md mx-auto p-5 rounded-2xl border border-border bg-card shadow-sm text-left space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">
                      Booking Reference
                    </span>
                    <div
                      data-testid="confirmed-booking-number"
                      className="font-mono text-base font-extrabold text-foreground"
                    >
                      {voucher.bookingNumber}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs"
                  >
                    Confirmed
                  </Badge>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Item:</span>
                    <span className="font-semibold text-foreground">{voucher.itemName}</span>
                  </div>
                  {voucher.secondaryLabel && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Assigned:</span>
                      <span className="font-semibold text-foreground">
                        {voucher.secondaryLabel}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Schedule:</span>
                    <span className="font-mono font-semibold text-foreground">
                      {voucher.date} ({voucher.timeRange})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer:</span>
                    <span className="font-semibold text-foreground">
                      {voucher.customerName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Paid:</span>
                    <span className="font-semibold text-emerald-600 font-mono">
                      ₹{(voucher.amountMinor / 100).toLocaleString('en-IN')} (
                      {voucher.paymentMethod})
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span>{businessName}</span>
                  </span>
                  <span className="font-mono text-[10px]">{voucher.confirmedAt}</span>
                </div>
              </div>

              <div className="flex justify-center pt-1">
                <Button
                  size="sm"
                  data-testid="booking-done-btn"
                  onClick={handleClose}
                  className="px-6 text-xs"
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
