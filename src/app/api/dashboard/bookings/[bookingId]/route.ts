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

const patchBookingSchema = z.object({
  tenantId: z.string().min(1),
  status: z.enum(['completed', 'no_show', 'confirmed', 'cancelled']),
  paymentStatus: z.enum(['paid', 'pending', 'unpaid']).optional(),
  reason: z.string().max(300).optional(),
});

const bookingService = new BookingServiceImpl();

export async function PATCH(
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
    const parsed = patchBookingSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid booking update payload.',
            issues: parsed.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    const targetTenantId = resolveAuthorizedDashboardTenant(actor, parsed.data.tenantId);

    if (parsed.data.status === 'cancelled') {
      await bookingService.cancelBooking({
        actor,
        tenantId: targetTenantId,
        bookingId,
        reason: parsed.data.reason ?? 'Cancelled by business operator from dashboard',
        idempotencyKey,
      });
      return NextResponse.json({ ok: true, bookingId, status: 'cancelled' });
    }

    const updated = await bookingService.updateBookingOperationalStatus({
      actor,
      tenantId: targetTenantId,
      bookingId,
      status: parsed.data.status,
      paymentStatus: parsed.data.paymentStatus,
    });

    return NextResponse.json({ ok: true, booking: updated });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.httpStatus },
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update booking.' } },
      { status: 500 },
    );
  }
}
