import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { AppError } from '@/lib/errors';
import { BookingServiceImpl } from '@/modules/booking/booking.impl';

const verifyPaymentSchema = z.object({
  tenantId: z.string().min(1),
  bookingId: z.string().min(1),
  paymentId: z.string().min(1),
  providerOrderId: z.string().min(1),
  providerSignature: z.string().optional(),
});

const bookingService = new BookingServiceImpl();

/**
 * Public Payment Verification & Confirmation (`POST /api/public/v1/payments/verify`).
 * Reconciles browser payment callbacks with server-side slot confirmation.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
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

    const { tenantId, bookingId, paymentId } = parsed.data;

    const result = await bookingService.confirmBookingFromVerifiedPayment({
      tenantId,
      bookingId,
      paymentId,
    });

    if (result.outcome === 'conflict_auto_refund_queued') {
      return NextResponse.json(
        {
          status: 'conflict_refunded',
          message:
            'Hold expired during checkout and slot was taken by another user. Automated refund has been queued.',
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        status: 'confirmed',
        bookingId,
        paymentId,
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
