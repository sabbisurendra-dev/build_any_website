import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { AppError } from '@/lib/errors';
import { requireIdempotencyKey } from '@/lib/idempotency';
import { BookingServiceImpl } from '@/modules/booking/booking.impl';

interface RouteContext {
  params: Promise<{ bookingId: string }>;
}

const cancelBodySchema = z.object({
  tenantId: z.string().min(1),
  reason: z.string().min(3).max(300),
});

const bookingService = new BookingServiceImpl();

/**
 * Public Booking Cancellation (`POST /api/public/v1/bookings/[bookingId]/cancel`).
 * Safely releases active resource or capacity allocations.
 */
export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { bookingId } = await context.params;
    const idempotencyKey = requireIdempotencyKey(request.headers.get('idempotency-key'));
    const json: unknown = await request.json();
    const parsed = cancelBodySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid cancellation request.',
            issues: parsed.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    await bookingService.cancelBooking({
      actor: 'customer_verified_token',
      tenantId: parsed.data.tenantId,
      bookingId,
      reason: parsed.data.reason,
      idempotencyKey,
    });

    return NextResponse.json({ ok: true, bookingId, status: 'cancelled' }, { status: 200 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.httpStatus },
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to cancel booking.' } },
      { status: 500 },
    );
  }
}
