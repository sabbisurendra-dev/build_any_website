import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { AppError } from '@/lib/errors';
import { requireIdempotencyKey } from '@/lib/idempotency';
import { assertRateLimit } from '@/lib/rate-limit';
import { extractClientIp } from '@/modules/auth/resolve-actor';
import { resolvePublicRequestTenantId } from '@/modules/tenancy/tenant-resolver';
import { BookingServiceImpl } from '@/modules/booking/booking.impl';

const checkoutBodySchema = z.object({
  tenantId: z.string().min(1),
  bookingId: z.string().min(1),
  holdToken: z.string().min(1),
});

const bookingService = new BookingServiceImpl();

/**
 * Public Checkout Payment Initiation (`POST /api/public/v1/checkout`).
 * Verifies hold validity and returns payment gateway order reference.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await assertRateLimit(extractClientIp(request), 'public:payment_checkout');
    const idempotencyKey = requireIdempotencyKey(request.headers.get('idempotency-key'));
    const json: unknown = await request.json();
    const parsed = checkoutBodySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid checkout parameters.',
            issues: parsed.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    const tenantId = resolvePublicRequestTenantId(request, parsed.data.tenantId);

    const result = await bookingService.initiateCheckoutPayment({
      tenantId,
      bookingId: parsed.data.bookingId,
      holdToken: parsed.data.holdToken,
      idempotencyKey,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.httpStatus },
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to initiate checkout.' } },
      { status: 500 },
    );
  }
}
