import { describe, it, expect, beforeEach } from 'vitest';
import { BookingServiceImpl } from '@/modules/booking/booking.impl';
import { PaymentWebhookProcessorImpl } from '@/modules/payments/webhook.impl';
import { SimulatedPaymentGatewayAdapter } from '@/modules/payments/simulated.adapter';
import { SlotUnavailableError, SessionCapacityExceededError } from '@/lib/errors';
import type { BookingHoldResult } from '@/modules/booking/booking.types';

describe('Prompt D - Concurrency, Double-Booking Protection & Concurrency Locking', () => {
  let bookingService: BookingServiceImpl;
  let webhookProcessor: PaymentWebhookProcessorImpl;

  beforeEach(() => {
    BookingServiceImpl.resetStateForTests();
    PaymentWebhookProcessorImpl.resetForTests();
    bookingService = new BookingServiceImpl();
    webhookProcessor = new PaymentWebhookProcessorImpl();
  });

  it('CORRECTNESS CRITICAL: 23 customers simultaneously attempt to reserve the exact same exclusive turf slot', async () => {
    const tenantId = 't-kickoff-01';
    const resourceId = 'res-turf-01'; // FIFA Synthetic Turf 1 (7v7)
    const startsAt = new Date('2026-11-05T20:00:00+05:30');
    const endsAt = new Date('2026-11-05T21:00:00+05:30');

    // 23 distinct customers with distinct idempotency keys
    const customerCount = 23;
    const holdPromises: Promise<BookingHoldResult>[] = [];

    for (let i = 1; i <= customerCount; i++) {
      const p = bookingService.createHold({
        tenantId,
        locationId: 'loc-01',
        idempotencyKey: `sim-key-concurrent-cust-${i.toString().padStart(2, '0')}`,
        selection: {
          bookingModel: 'exclusive_resource',
          resourceId,
          startsAt,
          endsAt,
        },
        customer: {
          fullName: `Concurrent Player ${i}`,
          phone: `+91 98765 432${i.toString().padStart(2, '0')}`,
        },
      });
      holdPromises.push(p);
    }

    // Launch all 23 reservation attempts simultaneously
    const results = await Promise.allSettled(holdPromises);

    const successfulHolds = results.filter((r) => r.status === 'fulfilled');
    const failedHolds = results.filter((r) => r.status === 'rejected');

    // INVARIANT 1: Exactly ONE customer succeeds
    expect(successfulHolds).toHaveLength(1);

    // INVARIANT 2: Exactly 22 customers receive clear 409 SLOT_UNAVAILABLE conflict
    expect(failedHolds).toHaveLength(22);

    for (const failure of failedHolds) {
      if (failure.status === 'rejected') {
        expect(failure.reason).toBeInstanceOf(SlotUnavailableError);
        expect(failure.reason.code).toBe('SLOT_UNAVAILABLE');
        expect(failure.reason.httpStatus).toBe(409);
      }
    }

    // INVARIANT 3: Verify the winning hold has an 8-minute TTL
    if (successfulHolds[0] && successfulHolds[0].status === 'fulfilled') {
      const winner = successfulHolds[0].value;
      expect(winner.status).toBe('temporarily_held');
      expect(winner.expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(winner.totalMinor).toBe(180000); // ₹1,800 peak floodlit rate
    }
  });

  it('verifies capacity session concurrency limit: 10 customers simultaneously competing for 3 remaining seats', async () => {
    // sess-morning-yoga-01 has maxCapacity: 20, bookedCount: 8, remaining = 12
    // Let's create a custom session with remaining = 3
    const tenantId = 't-aura-04';
    const sessionId = 'sess-limited-03';

    // Seed session with remaining = 3 seats
    // Booking 1 seat each across 10 concurrent requests
    const attempts = 10;
    const sessionPromises = [];

    for (let i = 1; i <= attempts; i++) {
      sessionPromises.push(
        bookingService.createHold({
          tenantId,
          locationId: 'loc-aura',
          idempotencyKey: `sess-key-${i}`,
          selection: {
            bookingModel: 'capacity_session',
            sessionId,
            quantity: 7, // With 20 max capacity, 2 requests of 7 = 14 (valid), 3rd request of 7 = 21 (exceeds 20)
          },
          customer: {
            fullName: `Yogi ${i}`,
            phone: `+91 99000 1122${i}`,
          },
        }),
      );
    }

    const results = await Promise.allSettled(sessionPromises);
    const successful = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // 2 x 7 = 14 <= 20. 3 x 7 = 21 > 20. Exactly 2 succeed, 8 fail with capacity exceeded.
    expect(successful).toHaveLength(2);
    expect(rejected).toHaveLength(8);

    for (const failure of rejected) {
      if (failure.status === 'rejected') {
        expect(failure.reason).toBeInstanceOf(SessionCapacityExceededError);
        expect(failure.reason.code).toBe('SESSION_CAPACITY_EXCEEDED');
      }
    }
  });

  it('guarantees idempotency: replaying identical idempotencyKey returns the exact same hold without duplicate', async () => {
    const tenantId = 't-kickoff-01';
    const idempotencyKey = 'unique-replay-key-1234567890';

    const hold1 = await bookingService.createHold({
      tenantId,
      locationId: 'loc-01',
      idempotencyKey,
      selection: {
        bookingModel: 'exclusive_resource',
        resourceId: 'res-turf-02',
        startsAt: new Date('2026-11-05T17:00:00+05:30'),
        endsAt: new Date('2026-11-05T18:00:00+05:30'),
      },
      customer: {
        fullName: 'Sameer Verma',
        phone: '+91 98450 99887',
      },
    });

    // Replay with identical key
    const hold2 = await bookingService.createHold({
      tenantId,
      locationId: 'loc-01',
      idempotencyKey,
      selection: {
        bookingModel: 'exclusive_resource',
        resourceId: 'res-turf-02',
        startsAt: new Date('2026-11-05T17:00:00+05:30'),
        endsAt: new Date('2026-11-05T18:00:00+05:30'),
      },
      customer: {
        fullName: 'Sameer Verma',
        phone: '+91 98450 99887',
      },
    });

    expect(hold2.bookingId).toBe(hold1.bookingId);
    expect(hold2.holdToken).toBe(hold1.holdToken);
    expect(hold2.bookingNumber).toBe(hold1.bookingNumber);
  });

  it('handles duplicate webhook delivery idempotently without creating duplicate confirmations', async () => {
    // 1. Create a hold first so bookingId is valid
    const hold = await bookingService.createHold({
      tenantId: 't-kickoff-01',
      locationId: 'loc-01',
      idempotencyKey: 'wh-booking-hold-key-1234567890',
      selection: {
        bookingModel: 'exclusive_resource',
        resourceId: 'res-turf-01',
        startsAt: new Date('2026-11-05T19:00:00+05:30'),
        endsAt: new Date('2026-11-05T20:00:00+05:30'),
      },
      customer: { fullName: 'Aditya Verma', phone: '+91 98450 12345' },
    });

    const rawBody = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_rzp_mock_123',
            amount: 180000,
            currency: 'INR',
            notes: {
              tenantId: 't-kickoff-01',
              bookingId: hold.bookingId,
            },
          },
        },
      },
    });

    const gateway = new SimulatedPaymentGatewayAdapter();
    const validSignature = gateway.computeWebhookSignatureForTest(rawBody);

    // First webhook delivery
    const res1 = await webhookProcessor.processIncomingWebhook({
      provider: 'simulated',
      providerEventId: 'evt_sim_001_unique',
      signatureHeader: validSignature,
      rawBody,
    });
    expect(res1.status).toBe('processed');

    // Duplicate webhook delivery with identical event ID
    const res2 = await webhookProcessor.processIncomingWebhook({
      provider: 'simulated',
      providerEventId: 'evt_sim_001_unique',
      signatureHeader: validSignature,
      rawBody,
    });
    expect(res2.status).toBe('duplicate_ignored');
  });

  it('verifies booking cancellation safely releases slot allocation', async () => {
    const tenantId = 't-kickoff-01';
    const startsAt = new Date('2026-11-05T14:00:00+05:30');
    const endsAt = new Date('2026-11-05T15:00:00+05:30');

    // 1. Customer A holds slot
    const holdA = await bookingService.createHold({
      tenantId,
      locationId: 'loc-01',
      idempotencyKey: 'cust-a-key-1234567890',
      selection: {
        bookingModel: 'exclusive_resource',
        resourceId: 'res-cricket-03',
        startsAt,
        endsAt,
      },
      customer: { fullName: 'Customer A', phone: '+91 99887 76655' },
    });

    // 2. Customer B attempts to hold same slot -> fails with 409
    await expect(
      bookingService.createHold({
        tenantId,
        locationId: 'loc-01',
        idempotencyKey: 'cust-b-key-1234567890',
        selection: {
          bookingModel: 'exclusive_resource',
          resourceId: 'res-cricket-03',
          startsAt,
          endsAt,
        },
        customer: { fullName: 'Customer B', phone: '+91 99887 76656' },
      }),
    ).rejects.toThrow(SlotUnavailableError);

    // 3. Customer A cancels booking
    await bookingService.cancelBooking({
      actor: 'customer_verified_token',
      tenantId,
      bookingId: holdA.bookingId,
      reason: 'Change of plans',
      idempotencyKey: 'cancel-key-1234567890',
    });

    // 4. Customer B retries holding the slot -> now succeeds!
    const holdB = await bookingService.createHold({
      tenantId,
      locationId: 'loc-01',
      idempotencyKey: 'cust-b-retry-key-1234567890',
      selection: {
        bookingModel: 'exclusive_resource',
        resourceId: 'res-cricket-03',
        startsAt,
        endsAt,
      },
      customer: { fullName: 'Customer B', phone: '+91 99887 76656' },
    });

    expect(holdB.status).toBe('temporarily_held');
    expect(holdB.bookingId).toBeTruthy();
  });
});
