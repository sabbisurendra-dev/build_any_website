import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { AppError } from '@/lib/errors';
import { requireIdempotencyKey } from '@/lib/idempotency';

const createHoldBodySchema = z.object({
  tenantId: z.string().uuid(),
  locationId: z.string().uuid(),
  customer: z.object({
    fullName: z.string().min(2).max(160),
    phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
    email: z.string().email().optional(),
    notes: z.string().max(500).optional(),
  }),
  selection: z.discriminatedUnion('bookingModel', [
    z.object({
      bookingModel: z.literal('exclusive_resource'),
      resourceId: z.string().uuid(),
      serviceId: z.string().uuid().optional(),
      startsAtIso: z.string().datetime(),
      endsAtIso: z.string().datetime(),
    }),
    z.object({
      bookingModel: z.literal('staff_appointment'),
      serviceId: z.string().uuid(),
      staffMemberId: z.string().uuid(),
      startsAtIso: z.string().datetime(),
      endsAtIso: z.string().datetime(),
    }),
    z.object({
      bookingModel: z.literal('capacity_session'),
      sessionId: z.string().uuid(),
      quantity: z.number().int().min(1).max(10).default(1),
    }),
  ]),
});

/**
 * Concurrency-Safe Temporary Slot Hold Endpoint (`POST /api/public/v1/holds`).
 * Requires `Idempotency-Key` header and delegates to `BookingServicePort.createHold`.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const _idempotencyKey = requireIdempotencyKey(request.headers.get('idempotency-key'));
    const json: unknown = await request.json();
    const parsed = createHoldBodySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid booking hold payload.',
            issues: parsed.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Transactional hold service wiring scheduled for Booking Engine phase.',
        },
      },
      { status: 501 },
    );
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: err.httpStatus },
      );
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error.' } },
      { status: 500 },
    );
  }
}
