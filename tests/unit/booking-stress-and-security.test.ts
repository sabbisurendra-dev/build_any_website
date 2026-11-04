import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { BookingServiceImpl } from '@/modules/booking/booking.impl';
import { AvailabilityServiceImpl } from '@/modules/booking/availability.impl';
import { PaymentWebhookProcessorImpl } from '@/modules/payments/webhook.impl';
import { SimulatedPaymentGatewayAdapter } from '@/modules/payments/simulated.adapter';
import { RuntimeStateRepository } from '@/modules/persistence/runtime-store';
import { SlidingWindowRateLimiter } from '@/lib/rate-limit';
import {
  AppError,
  HoldExpiredError,
  SessionCapacityExceededError,
  SlotUnavailableError,
} from '@/lib/errors';
import { GET as getPlatformTenants, POST as postPlatformTenants } from '@/app/api/platform/tenants/route';
import { POST as postBuilderPublish } from '@/app/api/platform/builder/publish/route';
import { GET as getDashboardBookings } from '@/app/api/dashboard/bookings/route';
import { PATCH as patchDashboardBooking } from '@/app/api/dashboard/bookings/[bookingId]/route';
import { POST as postVerifyPayment } from '@/app/api/public/v1/payments/verify/route';

describe('Package 3 - Comprehensive Booking Stress, Payment Reconciliation & Security QA', () => {
  let bookingService: BookingServiceImpl;
  let availabilityService: AvailabilityServiceImpl;
  let webhookProcessor: PaymentWebhookProcessorImpl;
  let gateway: SimulatedPaymentGatewayAdapter;

  beforeEach(() => {
    BookingServiceImpl.resetStateForTests();
    PaymentWebhookProcessorImpl.resetForTests();
    SlidingWindowRateLimiter.resetForTests();
    bookingService = new BookingServiceImpl();
    availabilityService = new AvailabilityServiceImpl();
    webhookProcessor = new PaymentWebhookProcessorImpl();
    gateway = new SimulatedPaymentGatewayAdapter();
  });

  describe('Model A — Exclusive Resource Booking Edge Cases', () => {
    it('rejects partial interval overlap while allowing exact adjacent back-to-back slots', async () => {
      const tenantId = 't-kickoff-01';
      const resourceId = 'res-turf-01';

      // Hold 18:00 - 19:30 IST on 2026-11-12
      await bookingService.createHold({
        tenantId,
        locationId: 'loc-01',
        idempotencyKey: 'mod-a-base-1800-1930',
        selection: {
          bookingModel: 'exclusive_resource',
          resourceId,
          startsAt: new Date('2026-11-12T18:00:00+05:30'),
          endsAt: new Date('2026-11-12T19:30:00+05:30'),
        },
        customer: { fullName: 'Rohan Kulkarni', phone: '+91 98450 10001' },
      });

      // Partial overlap: 19:00 - 20:00 IST must be rejected with 409 SLOT_UNAVAILABLE
      await expect(
        bookingService.createHold({
          tenantId,
          locationId: 'loc-01',
          idempotencyKey: 'mod-a-partial-overlap-1900',
          selection: {
            bookingModel: 'exclusive_resource',
            resourceId,
            startsAt: new Date('2026-11-12T19:00:00+05:30'),
            endsAt: new Date('2026-11-12T20:00:00+05:30'),
          },
          customer: { fullName: 'Overlap Attempt', phone: '+91 98450 10002' },
        }),
      ).rejects.toThrow(SlotUnavailableError);

      // Adjacent non-overlapping slots: 19:30 - 20:30 and 20:30 - 21:30 must BOTH succeed
      const adjacent1 = await bookingService.createHold({
        tenantId,
        locationId: 'loc-01',
        idempotencyKey: 'mod-a-adjacent-1930-2030',
        selection: {
          bookingModel: 'exclusive_resource',
          resourceId,
          startsAt: new Date('2026-11-12T19:30:00+05:30'),
          endsAt: new Date('2026-11-12T20:30:00+05:30'),
        },
        customer: { fullName: 'Adjacent Player 1', phone: '+91 98450 10003' },
      });

      const adjacent2 = await bookingService.createHold({
        tenantId,
        locationId: 'loc-01',
        idempotencyKey: 'mod-a-adjacent-2030-2130',
        selection: {
          bookingModel: 'exclusive_resource',
          resourceId,
          startsAt: new Date('2026-11-12T20:30:00+05:30'),
          endsAt: new Date('2026-11-12T21:30:00+05:30'),
        },
        customer: { fullName: 'Adjacent Player 2', phone: '+91 98450 10004' },
      });

      expect(adjacent1.status).toBe('temporarily_held');
      expect(adjacent2.status).toBe('temporarily_held');
    });

    it('rejects mutated payload with reused idempotency key with 409 IDEMPOTENCY_CONFLICT', async () => {
      const sharedKey = 'idem-mutated-payload-check-001';
      await bookingService.createHold({
        tenantId: 't-kickoff-01',
        locationId: 'loc-01',
        idempotencyKey: sharedKey,
        selection: {
          bookingModel: 'exclusive_resource',
          resourceId: 'res-turf-01',
          startsAt: new Date('2026-11-14T16:00:00+05:30'),
          endsAt: new Date('2026-11-14T17:00:00+05:30'),
        },
        customer: { fullName: 'Nikhil Shetty', phone: '+91 98450 20001' },
      });

      await expect(
        bookingService.createHold({
          tenantId: 't-kickoff-01',
          locationId: 'loc-01',
          idempotencyKey: sharedKey,
          selection: {
            bookingModel: 'exclusive_resource',
            resourceId: 'res-turf-02', // Different resource under same idempotency key!
            startsAt: new Date('2026-11-14T16:00:00+05:30'),
            endsAt: new Date('2026-11-14T17:00:00+05:30'),
          },
          customer: { fullName: 'Nikhil Shetty', phone: '+91 98450 20001' },
        }),
      ).rejects.toMatchObject({
        code: 'IDEMPOTENCY_CONFLICT',
        httpStatus: 409,
      });
    });

    it('expires abandoned holds cleanly, blocks stale checkout, and frees the slot for the next customer', async () => {
      const startsAt = new Date('2026-11-15T20:00:00+05:30');
      const endsAt = new Date('2026-11-15T21:00:00+05:30');

      const holdA = await bookingService.createHold({
        tenantId: 't-kickoff-01',
        locationId: 'loc-01',
        idempotencyKey: 'hold-expiry-cust-a-001',
        selection: {
          bookingModel: 'exclusive_resource',
          resourceId: 'res-turf-01',
          startsAt,
          endsAt,
        },
        customer: { fullName: 'Slow Checkout Customer', phone: '+91 98450 30001' },
      });

      // Fast-forward hold expiration in runtime store
      const state = RuntimeStateRepository.getState();
      const bookingA = state.bookings.find((b) => b.bookingId === holdA.bookingId)!;
      const allocA = state.allocations.find((a) => a.id === bookingA.allocationId)!;
      const pastIso = new Date(Date.now() - 60_000).toISOString();
      bookingA.expiresAtIso = pastIso;
      allocA.expiresAtMs = Date.now() - 60_000;

      // Stale checkout attempt must fail with HoldExpiredError
      await expect(
        bookingService.initiateCheckoutPayment({
          tenantId: 't-kickoff-01',
          bookingId: holdA.bookingId,
          holdToken: holdA.holdToken,
          idempotencyKey: 'pay-stale-001',
        }),
      ).rejects.toThrow(HoldExpiredError);

      // Customer B can now immediately reserve the freed slot
      const holdB = await bookingService.createHold({
        tenantId: 't-kickoff-01',
        locationId: 'loc-01',
        idempotencyKey: 'hold-expiry-cust-b-002',
        selection: {
          bookingModel: 'exclusive_resource',
          resourceId: 'res-turf-01',
          startsAt,
          endsAt,
        },
        customer: { fullName: 'Fresh Customer B', phone: '+91 98450 30002' },
      });
      expect(holdB.status).toBe('temporarily_held');
    });

    it('rejects inactive resources and cross-tenant foreign resources', async () => {
      // Inactive maintenance pitch
      await expect(
        bookingService.createHold({
          tenantId: 't-kickoff-01',
          locationId: 'loc-01',
          idempotencyKey: 'inactive-pitch-attempt-001',
          selection: {
            bookingModel: 'exclusive_resource',
            resourceId: 'res-turf-inactive-04',
            startsAt: new Date('2026-11-16T18:00:00+05:30'),
            endsAt: new Date('2026-11-16T19:00:00+05:30'),
          },
          customer: { fullName: 'Test Player', phone: '+91 98450 40001' },
        }),
      ).rejects.toThrow(AppError);

      // Foreign tenant resource (res-apex-court-01 belongs to t-apex-02, not t-kickoff-01)
      await expect(
        bookingService.createHold({
          tenantId: 't-kickoff-01',
          locationId: 'loc-01',
          idempotencyKey: 'foreign-resource-attempt-001',
          selection: {
            bookingModel: 'exclusive_resource',
            resourceId: 'res-apex-court-01',
            startsAt: new Date('2026-11-16T18:00:00+05:30'),
            endsAt: new Date('2026-11-16T19:00:00+05:30'),
          },
          customer: { fullName: 'Test Player', phone: '+91 98450 40002' },
        }),
      ).rejects.toMatchObject({ httpStatus: 404 });
    });
  });

  describe('Model B — Staff & Service Appointment Edge Cases', () => {
    it('blocks same-staff conflicts and 15-min sterilization buffers while allowing simultaneous different-staff bookings', async () => {
      const tenantId = 't-smilecraft-03';

      // 1. Book Dr. Ananya Iyer (st-doctor-01) 10:00 - 10:30 IST (srv-dental-consult has 15m post-buffer -> occupied until 10:45!)
      const doc1Hold = await bookingService.createHold({
        tenantId,
        locationId: 'loc-smilecraft',
        idempotencyKey: 'clinic-doc1-1000',
        selection: {
          bookingModel: 'staff_appointment',
          serviceId: 'srv-dental-consult',
          staffMemberId: 'st-doctor-01',
          startsAt: new Date('2026-11-10T10:00:00+05:30'),
          endsAt: new Date('2026-11-10T10:30:00+05:30'),
        },
        customer: { fullName: 'Patient One', phone: '+91 98111 10001' },
      });
      expect(doc1Hold.totalMinor).toBe(80000);

      // 2. Different doctor (st-doctor-02) at the EXACT SAME time 10:00 - 10:30 IST SUCCEEDS!
      const doc2Hold = await bookingService.createHold({
        tenantId,
        locationId: 'loc-smilecraft',
        idempotencyKey: 'clinic-doc2-1000-parallel',
        selection: {
          bookingModel: 'staff_appointment',
          serviceId: 'srv-dental-consult',
          staffMemberId: 'st-doctor-02',
          startsAt: new Date('2026-11-10T10:00:00+05:30'),
          endsAt: new Date('2026-11-10T10:30:00+05:30'),
        },
        customer: { fullName: 'Patient Two', phone: '+91 98111 10002' },
      });
      expect(doc2Hold.status).toBe('temporarily_held');

      // 3. Attempting 10:30 - 11:00 on Dr. Ananya Iyer FAILS because her 15-min chair sterilization buffer runs 10:30 - 10:45!
      await expect(
        bookingService.createHold({
          tenantId,
          locationId: 'loc-smilecraft',
          idempotencyKey: 'clinic-doc1-buffer-collision-1030',
          selection: {
            bookingModel: 'staff_appointment',
            serviceId: 'srv-dental-consult',
            staffMemberId: 'st-doctor-01',
            startsAt: new Date('2026-11-10T10:30:00+05:30'),
            endsAt: new Date('2026-11-10T11:00:00+05:30'),
          },
          customer: { fullName: 'Buffer Intruder', phone: '+91 98111 10003' },
        }),
      ).rejects.toThrow(SlotUnavailableError);

      // 4. Booking 10:45 - 11:45 (60-min Microscopic Root Canal) on Dr. Ananya Iyer SUCCEEDS right after buffer!
      const rootCanalHold = await bookingService.createHold({
        tenantId,
        locationId: 'loc-smilecraft',
        idempotencyKey: 'clinic-doc1-root-canal-1045',
        selection: {
          bookingModel: 'staff_appointment',
          serviceId: 'srv-root-canal',
          staffMemberId: 'st-doctor-01',
          startsAt: new Date('2026-11-10T10:45:00+05:30'),
          endsAt: new Date('2026-11-10T11:45:00+05:30'),
        },
        customer: { fullName: 'Root Canal Patient', phone: '+91 98111 10004' },
      });
      expect(rootCanalHold.totalMinor).toBe(450000);
    });

    it('enforces staff holiday exceptions and lunch break blocks across availability and hold creation', async () => {
      const tenantId = 't-smilecraft-03';

      // st-doctor-02 has a full-day holiday exception on 2026-11-08 (IDA National Dental Conference)
      const holidaySlots = await availabilityService.listAvailableSlots({
        tenantId,
        locationId: 'loc-smilecraft',
        bookingModel: 'staff_appointment',
        serviceId: 'srv-dental-consult',
        staffMemberId: 'st-doctor-02',
        dateLocal: '2026-11-08',
      });
      expect(holidaySlots).toHaveLength(0);

      await expect(
        bookingService.createHold({
          tenantId,
          locationId: 'loc-smilecraft',
          idempotencyKey: 'doc2-holiday-attempt',
          selection: {
            bookingModel: 'staff_appointment',
            serviceId: 'srv-dental-consult',
            staffMemberId: 'st-doctor-02',
            startsAt: new Date('2026-11-08T11:00:00+05:30'),
            endsAt: new Date('2026-11-08T11:30:00+05:30'),
          },
          customer: { fullName: 'Holiday Caller', phone: '+91 98111 20001' },
        }),
      ).rejects.toThrow(SlotUnavailableError);

      // Lunch break hour (13:00 - 14:00 IST) must also be rejected
      await expect(
        bookingService.createHold({
          tenantId,
          locationId: 'loc-smilecraft',
          idempotencyKey: 'doc1-lunch-break-attempt',
          selection: {
            bookingModel: 'staff_appointment',
            serviceId: 'srv-dental-consult',
            staffMemberId: 'st-doctor-01',
            startsAt: new Date('2026-11-10T13:00:00+05:30'),
            endsAt: new Date('2026-11-10T13:30:00+05:30'),
          },
          customer: { fullName: 'Lunch Caller', phone: '+91 98111 20002' },
        }),
      ).rejects.toThrow(SlotUnavailableError);
    });

    it('reschedules atomically: preserves original confirmed booking when target slot conflicts, and moves cleanly when free', async () => {
      const tenantId = 't-smilecraft-03';

      // Create & confirm Patient A at 15:00 - 15:30
      const holdA = await bookingService.createHold({
        tenantId,
        locationId: 'loc-smilecraft',
        idempotencyKey: 'resched-patient-a',
        selection: {
          bookingModel: 'staff_appointment',
          serviceId: 'srv-dental-consult',
          staffMemberId: 'st-doctor-01',
          startsAt: new Date('2026-11-11T15:00:00+05:30'),
          endsAt: new Date('2026-11-11T15:30:00+05:30'),
        },
        customer: { fullName: 'Patient A', phone: '+91 98111 30001' },
      });
      const checkoutA = await bookingService.initiateCheckoutPayment({
        tenantId,
        bookingId: holdA.bookingId,
        holdToken: holdA.holdToken,
        idempotencyKey: 'pay-patient-a',
      });
      await bookingService.confirmBookingFromVerifiedPayment({
        tenantId,
        bookingId: holdA.bookingId,
        paymentId: checkoutA.paymentId,
      });

      // Create Patient B occupying 16:00 - 16:30 on same doctor
      await bookingService.createHold({
        tenantId,
        locationId: 'loc-smilecraft',
        idempotencyKey: 'resched-patient-b-blocker',
        selection: {
          bookingModel: 'staff_appointment',
          serviceId: 'srv-dental-consult',
          staffMemberId: 'st-doctor-01',
          startsAt: new Date('2026-11-11T16:00:00+05:30'),
          endsAt: new Date('2026-11-11T16:30:00+05:30'),
        },
        customer: { fullName: 'Patient B', phone: '+91 98111 30002' },
      });

      // Attempt to reschedule Patient A into occupied 16:00 - 16:30 -> MUST FAIL and preserve Patient A's 15:00 confirmed booking!
      await expect(
        bookingService.rescheduleBooking('customer_verified_token', {
          tenantId,
          bookingId: holdA.bookingId,
          idempotencyKey: 'resched-conflict-attempt',
          reason: 'Try moving to 4 PM',
          newSelection: {
            bookingModel: 'staff_appointment',
            serviceId: 'srv-dental-consult',
            staffMemberId: 'st-doctor-01',
            startsAt: new Date('2026-11-11T16:00:00+05:30'),
            endsAt: new Date('2026-11-11T16:30:00+05:30'),
          },
        }),
      ).rejects.toThrow(SlotUnavailableError);

      const stateAfterFailedResched = RuntimeStateRepository.getState();
      const preservedA = stateAfterFailedResched.bookings.find((b) => b.bookingId === holdA.bookingId)!;
      expect(preservedA.status).toBe('confirmed');

      // Reschedule Patient A to free 17:00 - 17:30 -> SUCCEEDS, promotes new booking to confirmed, and frees 15:00!
      const reschedOk = await bookingService.rescheduleBooking('customer_verified_token', {
        tenantId,
        bookingId: holdA.bookingId,
        idempotencyKey: 'resched-valid-1700',
        reason: 'Move to 5 PM',
        newSelection: {
          bookingModel: 'staff_appointment',
          serviceId: 'srv-dental-consult',
          staffMemberId: 'st-doctor-01',
          startsAt: new Date('2026-11-11T17:00:00+05:30'),
          endsAt: new Date('2026-11-11T17:30:00+05:30'),
        },
      });

      const newBooking = RuntimeStateRepository.getState().bookings.find(
        (b) => b.bookingId === reschedOk.newBookingId,
      )!;
      expect(newBooking.status).toBe('confirmed');
      expect(newBooking.startTime).toBe('17:00');

      // Verify old 15:00 - 15:30 slot is now bookable by Patient C
      const holdC = await bookingService.createHold({
        tenantId,
        locationId: 'loc-smilecraft',
        idempotencyKey: 'patient-c-claims-freed-1500',
        selection: {
          bookingModel: 'staff_appointment',
          serviceId: 'srv-dental-consult',
          staffMemberId: 'st-doctor-01',
          startsAt: new Date('2026-11-11T15:00:00+05:30'),
          endsAt: new Date('2026-11-11T15:30:00+05:30'),
        },
        customer: { fullName: 'Patient C', phone: '+91 98111 30003' },
      });
      expect(holdC.status).toBe('temporarily_held');
    });
  });

  describe('Model C — Capacity-Based Session Stress & Exact Seat Accounting', () => {
    it('19/20 occupied class + 12 simultaneous requests for the final seat: exactly 1 succeeds and 20/20 rejects further bookings', async () => {
      const tenantId = 't-prana-05';
      const sessionId = 'sess-final-seat-04'; // Seeded at 19/20 booked!

      const attempts = Array.from({ length: 12 }, (_, idx) =>
        bookingService.createHold({
          tenantId,
          locationId: 'loc-prana',
          idempotencyKey: `final-seat-race-${idx + 1}`,
          selection: {
            bookingModel: 'capacity_session',
            sessionId,
            quantity: 1,
          },
          customer: {
            fullName: `Prana Member ${idx + 1}`,
            phone: `+91 97000 000${String(idx + 1).padStart(2, '0')}`,
          },
        }),
      );

      const settled = await Promise.allSettled(attempts);
      const winners = settled.filter((r) => r.status === 'fulfilled');
      const losers = settled.filter((r) => r.status === 'rejected');

      expect(winners).toHaveLength(1);
      expect(losers).toHaveLength(11);

      // Session is now 20/20 -> subsequent booking attempt immediately fails with SessionCapacityExceededError
      await expect(
        bookingService.createHold({
          tenantId,
          locationId: 'loc-prana',
          idempotencyKey: 'after-20-of-20-full',
          selection: {
            bookingModel: 'capacity_session',
            sessionId,
            quantity: 1,
          },
          customer: { fullName: 'Late Yogi', phone: '+91 97000 00999' },
        }),
      ).rejects.toThrow(SessionCapacityExceededError);
    });

    it('restores exact multi-seat quantity on both cancellation and hold expiry', async () => {
      const tenantId = 't-prana-05';
      const sessionId = 'sess-morning-yoga-01'; // 8/20 booked -> 12 remaining

      const hold4 = await bookingService.createHold({
        tenantId,
        locationId: 'loc-prana',
        idempotencyKey: 'multi-seat-hold-4',
        selection: { bookingModel: 'capacity_session', sessionId, quantity: 4 },
        customer: { fullName: 'Group of 4', phone: '+91 97111 00004' },
      });

      const hold3 = await bookingService.createHold({
        tenantId,
        locationId: 'loc-prana',
        idempotencyKey: 'multi-seat-hold-3',
        selection: { bookingModel: 'capacity_session', sessionId, quantity: 3 },
        customer: { fullName: 'Group of 3', phone: '+91 97111 00003' },
      });

      const getSession = () =>
        RuntimeStateRepository.getState().sessions.find((s) => s.id === sessionId)!;

      // 8 booked + 7 held = 15 occupied (5 remaining)
      expect(getSession().heldCount).toBe(7);

      // Cancel group of 4 -> heldCount drops to 3
      await bookingService.cancelBooking({
        actor: 'customer_verified_token',
        tenantId,
        bookingId: hold4.bookingId,
        reason: 'Group plans changed',
        idempotencyKey: 'cancel-group-4',
      });
      expect(getSession().heldCount).toBe(3);

      // Expire group of 3 -> heldCount drops to 0
      const state = RuntimeStateRepository.getState();
      const alloc3 = state.allocations.find(
        (a) => a.bookingId === hold3.bookingId,
      )!;
      alloc3.expiresAtMs = Date.now() - 5_000;
      BookingServiceImpl.sweepExpiredAllocationsNow();
      expect(getSession().heldCount).toBe(0);
    });
  });

  describe('Payment & Webhook Reconciliation Edge Cases', () => {
    it('handles payment decline keeping hold active, rejects forged signatures, and confirms on valid retry', async () => {
      const tenantId = 't-kickoff-01';
      const hold = await bookingService.createHold({
        tenantId,
        locationId: 'loc-01',
        idempotencyKey: 'pay-decline-retry-hold',
        selection: {
          bookingModel: 'exclusive_resource',
          resourceId: 'res-turf-02',
          startsAt: new Date('2026-11-18T19:00:00+05:30'),
          endsAt: new Date('2026-11-18T20:00:00+05:30'),
        },
        customer: { fullName: 'Retry Customer', phone: '+91 98450 77701' },
      });

      const checkout1 = await bookingService.initiateCheckoutPayment({
        tenantId,
        bookingId: hold.bookingId,
        holdToken: hold.holdToken,
        idempotencyKey: 'pay-attempt-1',
      });

      // 1. Simulate UPI payment decline via route handler -> returns 402 and keeps hold active!
      const declineReq = new NextRequest('http://localhost:3000/api/public/v1/payments/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          bookingId: hold.bookingId,
          providerOrderId: checkout1.providerOrderId,
          simulateFailure: true,
        }),
      });
      const declineRes = await postVerifyPayment(declineReq);
      expect(declineRes.status).toBe(402);
      const declineJson = (await declineRes.json()) as { holdStillActive: boolean };
      expect(declineJson.holdStillActive).toBe(true);

      // 2. Forged signature attempt -> rejected with 401 PAYMENT_SIGNATURE_INVALID
      await expect(
        bookingService.verifyAndConfirmClientPayment({
          tenantId,
          bookingId: hold.bookingId,
          providerOrderId: checkout1.providerOrderId,
          providerPaymentId: 'sim_pay_forged_999',
          providerSignature: 'forged_invalid_hmac_signature',
        }),
      ).rejects.toMatchObject({
        code: 'PAYMENT_SIGNATURE_INVALID',
        httpStatus: 401,
      });

      // 3. Retry checkout with fresh order & valid server HMAC signature -> CONFIRMED!
      const checkout2 = await bookingService.initiateCheckoutPayment({
        tenantId,
        bookingId: hold.bookingId,
        holdToken: hold.holdToken,
        idempotencyKey: 'pay-attempt-2',
      });
      const validPaymentId = 'sim_pay_retry_ok_002';
      const validSig = gateway.computeCallbackSignatureForTest(
        checkout2.providerOrderId,
        validPaymentId,
      );

      const confirmed = await bookingService.verifyAndConfirmClientPayment({
        tenantId,
        bookingId: hold.bookingId,
        providerOrderId: checkout2.providerOrderId,
        providerPaymentId: validPaymentId,
        providerSignature: validSig,
        paymentMethod: 'upi',
      });
      expect(confirmed.outcome).toBe('confirmed');
    });

    it('reconciles late webhook after hold expiry: confirms when slot is still free, and auto-refunds when slot was claimed by another customer', async () => {
      const tenantId = 't-kickoff-01';

      // CASE A: Late webhook arrives after hold expired, but nobody else booked the slot -> re-acquires & confirms!
      const holdFree = await bookingService.createHold({
        tenantId,
        locationId: 'loc-01',
        idempotencyKey: 'late-wh-free-slot',
        selection: {
          bookingModel: 'exclusive_resource',
          resourceId: 'res-turf-01',
          startsAt: new Date('2026-11-19T15:00:00+05:30'),
          endsAt: new Date('2026-11-19T16:00:00+05:30'),
        },
        customer: { fullName: 'Delayed Bank Customer', phone: '+91 98450 88801' },
      });

      // Expire holdFree
      const state = RuntimeStateRepository.getState();
      state.allocations.find((a) => a.bookingId === holdFree.bookingId)!.expiresAtMs =
        Date.now() - 10_000;
      state.bookings.find((b) => b.bookingId === holdFree.bookingId)!.expiresAtIso = new Date(
        Date.now() - 10_000,
      ).toISOString();
      BookingServiceImpl.sweepExpiredAllocationsNow();

      const rawFreeWh = JSON.stringify({
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_late_free_01',
              amount: 120000,
              currency: 'INR',
              notes: { tenantId, bookingId: holdFree.bookingId },
            },
          },
        },
      });
      const resFree = await webhookProcessor.processIncomingWebhook({
        provider: 'simulated',
        providerEventId: 'evt_late_free_01',
        signatureHeader: gateway.computeWebhookSignatureForTest(rawFreeWh),
        rawBody: rawFreeWh,
      });
      expect(resFree.status).toBe('processed');
      expect(
        RuntimeStateRepository.getState().bookings.find((b) => b.bookingId === holdFree.bookingId)!
          .status,
      ).toBe('confirmed');

      // CASE B: Late webhook arrives AFTER hold expired AND Customer B already claimed the slot -> auto-refund!
      const startsAtConflict = new Date('2026-11-19T20:00:00+05:30');
      const endsAtConflict = new Date('2026-11-19T21:00:00+05:30');

      const holdExpiredA = await bookingService.createHold({
        tenantId,
        locationId: 'loc-01',
        idempotencyKey: 'late-wh-conflict-cust-a',
        selection: {
          bookingModel: 'exclusive_resource',
          resourceId: 'res-turf-01',
          startsAt: startsAtConflict,
          endsAt: endsAtConflict,
        },
        customer: {
          fullName: 'Late Payer A',
          phone: '+91 98450 88802',
          email: 'latepayer@example.com',
        },
      });
      const checkoutA = await bookingService.initiateCheckoutPayment({
        tenantId,
        bookingId: holdExpiredA.bookingId,
        holdToken: holdExpiredA.holdToken,
        idempotencyKey: 'late-wh-order-a',
      });

      // Expire Customer A's hold
      state.allocations.find((a) => a.bookingId === holdExpiredA.bookingId)!.expiresAtMs =
        Date.now() - 15_000;
      state.bookings.find((b) => b.bookingId === holdExpiredA.bookingId)!.expiresAtIso = new Date(
        Date.now() - 15_000,
      ).toISOString();
      BookingServiceImpl.sweepExpiredAllocationsNow();

      // Customer B legitimately books the freed slot
      const holdWinnerB = await bookingService.createHold({
        tenantId,
        locationId: 'loc-01',
        idempotencyKey: 'late-wh-conflict-cust-b',
        selection: {
          bookingModel: 'exclusive_resource',
          resourceId: 'res-turf-01',
          startsAt: startsAtConflict,
          endsAt: endsAtConflict,
        },
        customer: { fullName: 'Legitimate Winner B', phone: '+91 98450 88803' },
      });

      // Now Customer A's delayed bank capture arrives -> SAVEPOINT detects conflict & initiates refund!
      const outcomeA = await bookingService.confirmBookingFromVerifiedPayment({
        tenantId,
        bookingId: holdExpiredA.bookingId,
        paymentId: checkoutA.paymentId,
      });
      expect(outcomeA.outcome).toBe('conflict_auto_refund_queued');

      const updatedBookingA = state.bookings.find((b) => b.bookingId === holdExpiredA.bookingId)!;
      const updatedPaymentA = state.payments.find((p) => p.paymentId === checkoutA.paymentId)!;
      const refundRecord = state.refunds.find((r) => r.bookingId === holdExpiredA.bookingId);
      const refundNotif = state.notifications.find(
        (n) => n.bookingId === holdExpiredA.bookingId && n.templateKey === 'payment.refund_initiated',
      );
      const untouchedB = state.bookings.find((b) => b.bookingId === holdWinnerB.bookingId)!;

      expect(updatedBookingA.status).toBe('refund_pending');
      expect(updatedPaymentA.status).toBe('captured_requires_refund');
      expect(refundRecord).toBeDefined();
      expect(refundNotif).toBeDefined();
      expect(untouchedB.status).toBe('temporarily_held');
    });
  });

  describe('Security, RBAC & Cross-Tenant Isolation (API Route Handlers)', () => {
    it('enforces 401 Unauthenticated and 403 Forbidden Role across Platform and Dashboard routes', async () => {
      // Unauthenticated -> 401 on GET /api/platform/tenants
      const unauthPlatformRes = await getPlatformTenants(
        new NextRequest('http://localhost:3000/api/platform/tenants', {
          headers: { 'x-actor-role': 'unauthenticated' },
        }),
      );
      expect(unauthPlatformRes.status).toBe(401);

      // End customer -> 403 on POST /api/platform/tenants
      const customerCreateTenantRes = await postPlatformTenants(
        new NextRequest('http://localhost:3000/api/platform/tenants', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-actor-role': 'end_customer',
          },
          body: JSON.stringify({
            name: 'Unauthorized Turf',
            slug: 'unauth-turf',
            vertical: 'sports_turf',
            primaryLocation: {
              name: 'Main',
              addressLine1: '123 Road',
              city: 'Bengaluru',
              state: 'KA',
              postalCode: '560001',
            },
          }),
        }),
      );
      expect(customerCreateTenantRes.status).toBe(403);

      // Business owner -> 403 on internal-only POST /api/platform/builder/publish
      const ownerPublishRes = await postBuilderPublish(
        new NextRequest('http://localhost:3000/api/platform/builder/publish', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-actor-role': 'business_owner',
            'x-actor-tenant-id': 't-kickoff-01',
          },
          body: JSON.stringify({
            tenantId: 't-kickoff-01',
            websiteId: 'web-kickoff-turf',
            releaseNotes: 'Attempted bypass',
          }),
        }),
      );
      expect(ownerPublishRes.status).toBe(403);
    });

    it('blocks Cross-Tenant IDOR when Business Owner of Tenant A attempts to read or cancel Tenant B bookings', async () => {
      // Create a booking in SmileCraft Dental Clinic (t-smilecraft-03)
      const clinicHold = await bookingService.createHold({
        tenantId: 't-smilecraft-03',
        locationId: 'loc-smilecraft',
        idempotencyKey: 'idor-target-clinic-booking',
        selection: {
          bookingModel: 'staff_appointment',
          serviceId: 'srv-dental-consult',
          staffMemberId: 'st-doctor-01',
          startsAt: new Date('2026-11-20T11:00:00+05:30'),
          endsAt: new Date('2026-11-20T11:30:00+05:30'),
        },
        customer: { fullName: 'Confidential Patient', phone: '+91 98222 11111' },
      });

      // Kickoff Turf owner (t-kickoff-01) tries to list SmileCraft (t-smilecraft-03) bookings -> 403 FORBIDDEN!
      const crossReadRes = await getDashboardBookings(
        new NextRequest('http://localhost:3000/api/dashboard/bookings?tenantId=t-smilecraft-03', {
          headers: {
            'x-actor-role': 'business_owner',
            'x-actor-tenant-id': 't-kickoff-01',
          },
        }),
      );
      expect(crossReadRes.status).toBe(403);

      // Kickoff Turf owner tries to cancel SmileCraft's booking -> 403 FORBIDDEN!
      const crossCancelRes = await patchDashboardBooking(
        new NextRequest(
          `http://localhost:3000/api/dashboard/bookings/${clinicHold.bookingId}`,
          {
            method: 'PATCH',
            headers: {
              'content-type': 'application/json',
              'idempotency-key': 'idor-cancel-attempt-001',
              'x-actor-role': 'business_owner',
              'x-actor-tenant-id': 't-kickoff-01',
            },
            body: JSON.stringify({
              tenantId: 't-smilecraft-03',
              status: 'cancelled',
              reason: 'Malicious cross-tenant cancel',
            }),
          },
        ),
        { params: Promise.resolve({ bookingId: clinicHold.bookingId }) },
      );
      expect(crossCancelRes.status).toBe(403);

      // Verify SmileCraft booking remains completely untouched
      const stillIntact = RuntimeStateRepository.getState().bookings.find(
        (b) => b.bookingId === clinicHold.bookingId,
      )!;
      expect(stillIntact.status).toBe('temporarily_held');
    });
  });
});
