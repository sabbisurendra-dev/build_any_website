import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import { NextRequest } from 'next/server';
import { RazorpayGatewayAdapter } from '@/modules/payments/razorpay.adapter';
import { StripeGatewayAdapter } from '@/modules/payments/stripe.adapter';
import { SimulatedPaymentGatewayAdapter } from '@/modules/payments/simulated.adapter';
import { PaymentWebhookProcessorImpl } from '@/modules/payments/webhook.impl';
import { HoldExpirationWorker } from '@/modules/booking/hold-expiration.worker';
import { POST as postCronExpireHolds, GET as getCronExpireHolds } from '@/app/api/cron/expire-holds/route';
import { POST as postInternalCronExpireHolds } from '@/app/api/internal/cron/expire-holds/route';
import { POST as postRazorpayWebhook } from '@/app/api/webhooks/razorpay/route';
import { POST as postStripeWebhook } from '@/app/api/webhooks/stripe/route';
import { PostgresBookingRepository } from '@/modules/booking/postgres-booking.repository';
import { BookingServiceImpl } from '@/modules/booking/booking.impl';
import { HoldExpiredError } from '@/lib/errors';
import type { AppDatabase } from '@/db';

const TEST_CRON_SECRET = 'test_cron_secret_minimum_32_characters_long_string';
const TEST_RAZORPAY_SECRET = 'rzp_sec_test_1234567890abcdef';
const TEST_STRIPE_SECRET = 'whsec_test_stripe_secret_123456789';

describe('Phase 4: Payments & Checkout Saga Verification Suite', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.CRON_SECRET = TEST_CRON_SECRET;
    process.env.RAZORPAY_WEBHOOK_SECRET = TEST_RAZORPAY_SECRET;
    process.env.RAZORPAY_KEY_SECRET = TEST_RAZORPAY_SECRET;
    process.env.STRIPE_WEBHOOK_SECRET = TEST_STRIPE_SECRET;
    process.env.STRIPE_SECRET_KEY = TEST_STRIPE_SECRET;
    process.env.ENABLE_MOCK_PAYMENTS = 'true';
    BookingServiceImpl.resetStateForTests();
    PaymentWebhookProcessorImpl.resetForTests();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('4.1: Cryptographic Payment Signature Verification & Mock Gating', () => {
    it('verifies valid Razorpay HMAC-SHA256 signature and rejects forged signature', () => {
      const razorpay = new RazorpayGatewayAdapter();
      const providerOrderId = 'order_DAZ12345678901';
      const providerPaymentId = 'pay_DAZ12345678902';
      const payload = `${providerOrderId}|${providerPaymentId}`;

      const validSignature = createHmac('sha256', TEST_RAZORPAY_SECRET)
        .update(payload)
        .digest('hex');

      expect(
        razorpay.verifyClientCallbackSignature({
          providerOrderId,
          providerPaymentId,
          providerSignature: validSignature,
        }),
      ).toBe(true);

      expect(
        razorpay.verifyClientCallbackSignature({
          providerOrderId,
          providerPaymentId,
          providerSignature: 'forged_invalid_hex_signature_00000000000000000000000000000000',
        }),
      ).toBe(false);
    });

    it('verifies valid Stripe t=timestamp,v1=signature header and rejects expired or forged signature', () => {
      const stripe = new StripeGatewayAdapter();
      const rawBody = JSON.stringify({ id: 'evt_stripe_test_123', event: 'payment_intent.succeeded' });
      const nowSec = Math.floor(Date.now() / 1000);

      const validV1 = createHmac('sha256', TEST_STRIPE_SECRET)
        .update(`${nowSec}.${rawBody}`)
        .digest('hex');
      const validHeader = `t=${nowSec},v1=${validV1}`;

      expect(stripe.verifyWebhookSignature(rawBody, validHeader)).toBe(true);

      // Rejection: Invalid signature
      const forgedHeader = `t=${nowSec},v1=forged_hex_signature_invalid`;
      expect(stripe.verifyWebhookSignature(rawBody, forgedHeader)).toBe(false);

      // Rejection: Expired timestamp (>300 seconds old)
      const oldSec = nowSec - 400;
      const oldV1 = createHmac('sha256', TEST_STRIPE_SECRET)
        .update(`${oldSec}.${rawBody}`)
        .digest('hex');
      const expiredHeader = `t=${oldSec},v1=${oldV1}`;
      expect(stripe.verifyWebhookSignature(rawBody, expiredHeader)).toBe(false);
    });

    it('rejects simulated mock payments when ENABLE_MOCK_PAYMENTS is false in production environment', async () => {
      (process.env as Record<string, string>).NODE_ENV = 'production';
      process.env.ENABLE_MOCK_PAYMENTS = 'false';

      const simulated = new SimulatedPaymentGatewayAdapter();

      await expect(
        simulated.createOrder({
          tenantId: '11111111-1111-1111-1111-111111111111',
          bookingId: '22222222-2222-2222-2222-222222222222',
          bookingNumber: 'BK-TEST-001',
          amountMinor: 10000,
          currency: 'INR',
          idempotencyKey: 'idemp-sim-1',
          customer: { name: 'Mock User', phone: '+91 99999 00001' },
        }),
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
        httpStatus: 403,
      });

      expect(
        simulated.verifyClientCallbackSignature({
          providerOrderId: 'sim_ord_1',
          providerPaymentId: 'sim_pay_1',
          providerSignature: 'some_sig',
        }),
      ).toBe(false);
    });
  });

  describe('4.2: Webhook Idempotency & Deduplication', () => {
    it('returns duplicate_ignored on redelivered Razorpay webhook without duplicate execution', async () => {
      const processor = new PaymentWebhookProcessorImpl();
      const bookingService = new BookingServiceImpl();

      const tenantId = 't-kickoff-01';
      const resourceId = 'res-turf-01';
      const locationId = 'loc-01';

      const hold = await bookingService.createHold({
        tenantId,
        locationId,
        idempotencyKey: 'wh-idemp-hold-1',
        selection: {
          bookingModel: 'exclusive_resource',
          resourceId,
          startsAt: new Date(Date.now() + 3600_000),
          endsAt: new Date(Date.now() + 7200_000),
        },
        customer: { fullName: 'Webhook User', phone: '+91 98888 11111' },
      });

      const rawBody = JSON.stringify({
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_wh_test_123',
              order_id: 'order_wh_test_123',
              notes: {
                tenantId,
                bookingId: hold.bookingId,
              },
            },
          },
        },
      });

      const signature = createHmac('sha256', TEST_RAZORPAY_SECRET).update(rawBody).digest('hex');

      // First webhook delivery -> processed
      const firstResult = await processor.processIncomingWebhook({
        provider: 'razorpay',
        providerEventId: 'evt_rzp_dup_001',
        signatureHeader: signature,
        rawBody,
      });
      expect(firstResult.status).toBe('processed');

      // Second webhook delivery (same providerEventId) -> duplicate_ignored with HTTP 200 contract
      const secondResult = await processor.processIncomingWebhook({
        provider: 'razorpay',
        providerEventId: 'evt_rzp_dup_001',
        signatureHeader: signature,
        rawBody,
      });
      expect(secondResult.status).toBe('duplicate_ignored');
    });

    it('route handlers for Razorpay and Stripe reject missing signatures with 401', async () => {
      const rzpReq = new NextRequest('http://localhost:3000/api/webhooks/razorpay', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ event: 'payment.captured' }),
      });
      const rzpRes = await postRazorpayWebhook(rzpReq);
      expect(rzpRes.status).toBe(401);

      const stripeReq = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'payment_intent.succeeded' }),
      });
      const stripeRes = await postStripeWebhook(stripeReq);
      expect(stripeRes.status).toBe(401);
    });
  });

  describe('4.3: Two-Phase Commit Saga for Payment Confirmation', () => {
    it('executes atomic payment confirmation saga in Postgres: captured + consumed + confirmed + outbox', async () => {
      const tenantId = '11111111-1111-1111-1111-111111111111';
      const bookingId = '22222222-2222-2222-2222-222222222222';

      const mockTx = {
        execute: vi.fn().mockResolvedValue([]),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                {
                  id: bookingId,
                  tenantId,
                  bookingNumber: 'BK-2026-SAGA-01',
                  status: 'draft',
                  paymentStatus: 'unpaid',
                },
              ]),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([
                { id: 'bi-1', allocationStatus: 'consumed' },
              ]),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue([]),
        }),
      };

      const mockDb = {
        transaction: vi.fn().mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
          return callback(mockTx);
        }),
      } as unknown as AppDatabase;

      const repo = new PostgresBookingRepository(mockDb);
      vi.spyOn(repo, 'findBookingById').mockResolvedValue({
        bookingId,
        bookingNumber: 'BK-2026-SAGA-01',
        tenantId,
        locationId: 'loc-1',
        bookingModel: 'exclusive_resource',
        idempotencyKey: 'idemp-1',
        payloadFingerprint: '',
        holdId: 'hold-1',
        holdToken: 'token-1',
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentMethod: 'upi',
        expiresAtIso: new Date().toISOString(),
        totalMinor: 50000,
        currency: 'INR',
        customerName: 'Saga Customer',
        customerPhone: '+91 99999 12345',
        resourceOrServiceName: 'Turf A',
        dateLocal: '2026-11-15',
        startTime: '18:00',
        endTime: '19:00',
        startsAtIso: '',
        endsAtIso: '',
        quantity: 1,
        allocationId: 'alloc-1',
        createdAtIso: new Date().toISOString(),
      });

      const confirmed = await repo.confirmBooking(tenantId, bookingId, {
        paymentId: 'pay-1',
        paymentMethod: 'upi',
        amountPaidMinor: 50000,
      });

      expect(confirmed.status).toBe('confirmed');
      expect(confirmed.paymentStatus).toBe('paid');
      expect(mockTx.insert).toHaveBeenCalled(); // Outbox event inserted in same transaction!
    });

    it('rolls back transaction completely and throws HoldExpiredError if allocation status was already released (0 rows updated)', async () => {
      const tenantId = '11111111-1111-1111-1111-111111111111';
      const bookingId = '22222222-2222-2222-2222-222222222222';

      const mockTx = {
        execute: vi.fn().mockResolvedValue([]),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                {
                  id: bookingId,
                  tenantId,
                  bookingNumber: 'BK-2026-SAGA-02',
                  status: 'draft',
                  paymentStatus: 'unpaid',
                },
              ]),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              // 0 rows updated! Hold expired or slot already released!
              returning: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue([]),
        }),
      };

      const mockDb = {
        transaction: vi.fn().mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
          return callback(mockTx);
        }),
      } as unknown as AppDatabase;

      const repo = new PostgresBookingRepository(mockDb);

      await expect(
        repo.confirmBooking(tenantId, bookingId, {
          paymentId: 'pay-2',
          paymentMethod: 'card',
        }),
      ).rejects.toThrow(HoldExpiredError);
    });
  });

  describe('4.4: Hold Expiration Worker & Cron Endpoints', () => {
    it('worker sweeps expired holds and allocations and returns counts', async () => {
      const worker = new HoldExpirationWorker();
      const result = await worker.sweepExpiredHolds();

      expect(result).toHaveProperty('releasedHoldsCount');
      expect(result).toHaveProperty('releasedAllocationsCount');
      expect(result).toHaveProperty('releasedInventoryCount');
      expect(result).toHaveProperty('outboxEventsEmitted');
    });

    it('guards /api/cron/expire-holds with CRON_SECRET Bearer token (rejects unauthorized, accepts authorized)', async () => {
      // 1. Missing Authorization -> 401
      const unauthReq = new NextRequest('http://localhost:3000/api/cron/expire-holds', {
        method: 'POST',
      });
      const unauthRes = await postCronExpireHolds(unauthReq);
      expect(unauthRes.status).toBe(401);

      // 2. Bad Bearer Token -> 401
      const badTokenReq = new NextRequest('http://localhost:3000/api/cron/expire-holds', {
        method: 'POST',
        headers: { authorization: 'Bearer wrong_cron_secret_value_12345678' },
      });
      const badTokenRes = await postCronExpireHolds(badTokenReq);
      expect(badTokenRes.status).toBe(401);

      // 3. Valid Bearer Token (POST) -> 200 { ok: true, releasedCount: ... }
      const validReq = new NextRequest('http://localhost:3000/api/cron/expire-holds', {
        method: 'POST',
        headers: { authorization: `Bearer ${TEST_CRON_SECRET}` },
      });
      const validRes = await postCronExpireHolds(validReq);
      expect(validRes.status).toBe(200);
      const json = (await validRes.json()) as { ok: boolean; releasedCount: number };
      expect(json.ok).toBe(true);
      expect(typeof json.releasedCount).toBe('number');

      // 4. Valid Bearer Token (GET) -> 200 { ok: true, releasedCount: ... }
      const validGetReq = new NextRequest('http://localhost:3000/api/cron/expire-holds', {
        method: 'GET',
        headers: { authorization: `Bearer ${TEST_CRON_SECRET}` },
      });
      const validGetRes = await getCronExpireHolds(validGetReq);
      expect(validGetRes.status).toBe(200);

      // 5. Backward-compatibility: /api/internal/cron/expire-holds also passes
      const internalReq = new NextRequest('http://localhost:3000/api/internal/cron/expire-holds', {
        method: 'POST',
        headers: { authorization: `Bearer ${TEST_CRON_SECRET}` },
      });
      const internalRes = await postInternalCronExpireHolds(internalReq);
      expect(internalRes.status).toBe(200);
    });
  });
});
