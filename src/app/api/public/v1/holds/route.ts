import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { AppError } from '@/lib/errors';
import { requireIdempotencyKey } from '@/lib/idempotency';
import { assertRateLimit } from '@/lib/rate-limit';
import { extractClientIp } from '@/modules/auth/resolve-actor';
import { resolvePublicRequestTenantId } from '@/modules/tenancy/tenant-resolver';
import { BookingServiceImpl } from '@/modules/booking/booking.impl';

const createHoldBodySchema = z.object({
  tenantId: z.string().min(1),
  locationId: z.string().min(1),
  customer: z.object({
    fullName: z.string().trim().min(2).max(160),
    phone: z.string().trim().min(10).max(20),
    email: z.string().trim().email().optional().or(z.literal('')).transform((v) => v || undefined),
    notes: z.string().max(500).optional(),
  }),
  selection: z.discriminatedUnion('bookingModel', [
    z.object({
      bookingModel: z.literal('exclusive_resource'),
      resourceId: z.string().min(1),
      serviceId: z.string().optional(),
      startsAtIso: z.string().datetime({ offset: true }),
      endsAtIso: z.string().datetime({ offset: true }),
    }),
    z.object({
      bookingModel: z.literal('staff_appointment'),
      serviceId: z.string().min(1),
      staffMemberId: z.string().min(1),
      startsAtIso: z.string().datetime({ offset: true }),
      endsAtIso: z.string().datetime({ offset: true }),
    }),
    z.object({
      bookingModel: z.literal('capacity_session'),
      sessionId: z.string().min(1),
      quantity: z.number().int().min(1).max(20).default(1),
    }),
  ]),
});

const bookingService = new BookingServiceImpl();

/**
 * Concurrency-Safe Temporary Slot Hold Endpoint (`POST /api/public/v1/holds`).
 * Requires `Idempotency-Key` header and returns 8-minute locked hold.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await assertRateLimit(extractClientIp(request), 'public:hold_create');
    const idempotencyKey = requireIdempotencyKey(request.headers.get('idempotency-key'));
    const json: unknown = await request.json();
    const parsed = createHoldBodySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid hold creation request.',
            issues: parsed.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    const { tenantId: requestedTenantId, locationId, customer, selection } = parsed.data;
    const tenantId = resolvePublicRequestTenantId(request, requestedTenantId);

    const targetSelection =
      selection.bookingModel === 'exclusive_resource'
        ? {
            bookingModel: 'exclusive_resource' as const,
            resourceId: selection.resourceId,
            serviceId: selection.serviceId,
            startsAt: new Date(selection.startsAtIso),
            endsAt: new Date(selection.endsAtIso),
          }
        : selection.bookingModel === 'staff_appointment'
        ? {
            bookingModel: 'staff_appointment' as const,
            serviceId: selection.serviceId,
            staffMemberId: selection.staffMemberId,
            startsAt: new Date(selection.startsAtIso),
            endsAt: new Date(selection.endsAtIso),
          }
        : {
            bookingModel: 'capacity_session' as const,
            sessionId: selection.sessionId,
            quantity: selection.quantity,
          };

    const holdResult = await bookingService.createHold({
      tenantId,
      locationId,
      idempotencyKey,
      selection: targetSelection,
      customer,
    });

    return NextResponse.json(holdResult, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.httpStatus },
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create booking hold.' } },
      { status: 500 },
    );
  }
}
