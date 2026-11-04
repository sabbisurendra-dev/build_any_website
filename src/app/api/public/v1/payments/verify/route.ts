import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { AppError } from '@/lib/errors';
import { assertRateLimit } from '@/lib/rate-limit';
import { extractClientIp } from '@/modules/auth/resolve-actor';
import { BookingServiceImpl } from '@/modules/booking/booking.impl';

const verifyPaymentSchema = z.discriminatedUnion('simulateFailure', [
  z.object({
    simulateFailure: z.literal(true),
    tenantId: z.string().min(1),
    bookingId: z.string().min(1),
    providerOrderId: z.string().min(1),
    reason: z.string().max(250).optional(),
  }),
  z.object({
    simulateFailure: z.literal(false).optional(),
    tenantId: z.string().min(1),
    bookingId: z.string().min(1),
    paymentId: z.string().optional(),
    providerOrderId: z.string().min(1),
    providerPaymentId: z.string().min(1),
    providerSignature: z.string().min(16),
    paymentMethod: z.enum(['upi', 'card', 'cash', 'unknown']).optional(),
  }),
]);

const bookingService = new BookingServiceImpl();

/**
 * Public Payment Verification & Confirmation (`POST /api/public/v1/payments/verify`).
 *
 * Security Invariant:
 * - Requires cryptographic HMAC verification (`providerSignature`) against `providerOrderId|providerPaymentId`
 *   before transitioning any booking to `confirmed`.
 * - Supports explicit `simulateFailure: true` in test mode so payment decline & retry flows
 *   can be tested without releasing active holds prematurely.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await assertRateLimit(extractClientIp(request), 'public:payment_checkout');
    const json: unknown = await request.json();
    const parsed = verifyPaymentSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid payment verification payload.',
            issues: parsed.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    if (parsed.data.simulateFailure === true) {
      const failureState = await bookingService.recordPaymentFailure({
        tenantId: parsed.data.tenantId,
        bookingId: parsed.data.bookingId,
        providerOrderId: parsed.data.providerOrderId,
        reason: parsed.data.reason,
      });

      return NextResponse.json(
        {
          error: {
            code: 'PAYMENT_FAILED',
            message:
              'Payment authorization was declined by the bank/UPI app. Your slot hold is still reserved—please retry.',
          },
          ...failureState,
        },
        { status: 402 },
      );
    }

    const result = await bookingService.verifyAndConfirmClientPayment({
      tenantId: parsed.data.tenantId,
      bookingId: parsed.data.bookingId,
      paymentId: parsed.data.paymentId,
      providerOrderId: parsed.data.providerOrderId,
      providerPaymentId: parsed.data.providerPaymentId,
      providerSignature: parsed.data.providerSignature,
      paymentMethod: parsed.data.paymentMethod,
    });

    if (result.outcome === 'conflict_auto_refund_queued') {
      return NextResponse.json(
        {
          status: 'conflict_refunded',
          bookingNumber: result.bookingNumber,
          message:
            'Your hold expired during checkout and the slot was claimed by another customer. An automatic full refund has been initiated.',
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        status: 'confirmed',
        bookingId: parsed.data.bookingId,
        bookingNumber: result.bookingNumber,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.httpStatus },
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Payment verification failed.' } },
      { status: 500 },
    );
  }
}
