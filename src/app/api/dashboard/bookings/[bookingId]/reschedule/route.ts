import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { AppError } from '@/lib/errors';
import { requireIdempotencyKey } from '@/lib/idempotency';
import { resolveRequestActor } from '@/modules/auth/resolve-actor';
import { resolveAuthorizedDashboardTenant } from '@/modules/tenancy/tenant-resolver';
import { BookingServiceImpl } from '@/modules/booking/booking.impl';

interface RouteContext {
  params: Promise<{ bookingId: string }>;
}

const rescheduleBodySchema = z.object({
  tenantId: z.string().min(1),
  reason: z.string().max(300).optional(),
  newSelection: z.discriminatedUnion('bookingModel', [
    z.object({
      bookingModel: z.literal('exclusive_resource'),
      resourceId: z.string().min(1),
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

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const actor = await resolveRequestActor(request, {
      scope: 'dashboard',
    });
    if (!actor) {
      throw new AppError('UNAUTHENTICATED', 'Authentication required.', 401);
    }

    const { bookingId } = await context.params;
    const idempotencyKey = requireIdempotencyKey(request.headers.get('idempotency-key'));
    const json: unknown = await request.json();
    const parsed = rescheduleBodySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid reschedule payload.',
            issues: parsed.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    const targetTenantId = resolveAuthorizedDashboardTenant(actor, parsed.data.tenantId);

    const sel = parsed.data.newSelection;
    const targetSelection =
      sel.bookingModel === 'exclusive_resource'
        ? {
            bookingModel: 'exclusive_resource' as const,
            resourceId: sel.resourceId,
            startsAt: new Date(sel.startsAtIso),
            endsAt: new Date(sel.endsAtIso),
          }
        : sel.bookingModel === 'staff_appointment'
        ? {
            bookingModel: 'staff_appointment' as const,
            serviceId: sel.serviceId,
            staffMemberId: sel.staffMemberId,
            startsAt: new Date(sel.startsAtIso),
            endsAt: new Date(sel.endsAtIso),
          }
        : {
            bookingModel: 'capacity_session' as const,
            sessionId: sel.sessionId,
            quantity: sel.quantity,
          };

    const result = await bookingService.rescheduleBooking(actor, {
      tenantId: targetTenantId,
      bookingId,
      idempotencyKey,
      newSelection: targetSelection,
      reason: parsed.data.reason,
    });

    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.httpStatus },
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to reschedule booking.' } },
      { status: 500 },
    );
  }
}
