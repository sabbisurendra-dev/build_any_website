import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { AppError } from '@/lib/errors';
import { requireIdempotencyKey } from '@/lib/idempotency';
import { resolveRequestActor } from '@/modules/auth/resolve-actor';
import { BookingServiceImpl } from '@/modules/booking/booking.impl';
import { BusinessDashboardServiceImpl } from '@/modules/analytics/dashboard.impl';
import { NotificationDispatcherImpl } from '@/modules/notifications/notification.impl';
import { RuntimeStateRepository } from '@/modules/persistence/runtime-store';

const bookingService = new BookingServiceImpl();
const dashboardService = new BusinessDashboardServiceImpl();

const createManualBookingSchema = z.object({
  tenantId: z.string().min(1),
  locationId: z.string().default('loc-01'),
  customer: z.object({
    fullName: z.string().trim().min(2).max(160),
    phone: z.string().trim().min(10).max(20),
    email: z.string().email().optional(),
    notes: z.string().max(500).optional(),
  }),
  paymentStatus: z.enum(['paid', 'unpaid']).default('paid'),
  paymentMethod: z.enum(['cash', 'upi', 'card']).default('cash'),
  selection: z.discriminatedUnion('bookingModel', [
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

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const requestedTenant =
      request.nextUrl.searchParams.get('tenantId') ?? 't-kickoff-01';

    const state = RuntimeStateRepository.getState();
    const tenant = state.tenants.find(
      (t) =>
        t.id.toLowerCase() === requestedTenant.toLowerCase() ||
        t.slug.toLowerCase() === requestedTenant.toLowerCase(),
    );
    if (!tenant) {
      throw new AppError('NOT_FOUND', 'Tenant not found.', 404);
    }

    const actor = resolveRequestActor(request, {
      scope: 'dashboard',
      fallbackTenantId: tenant.id,
    });
    if (!actor) {
      throw new AppError('UNAUTHENTICATED', 'Authentication required.', 401);
    }

    const bookings = await bookingService.listTenantBookings(actor, tenant.id);
    const overview = await dashboardService.getOverview(actor, {
      tenantId: tenant.id,
      fromDateLocal: '2026-01-01',
      toDateLocal: '2026-12-31',
    });

    const resources = state.resources.filter((r) => r.tenantId === tenant.id);
    const services = state.services.filter((s) => s.tenantId === tenant.id);
    const staffMembers = state.staffMembers.filter((st) => st.tenantId === tenant.id);
    const sessions = state.sessions
      .filter((sess) => sess.tenantId === tenant.id)
      .map((sess) => ({
        ...sess,
        remainingCapacity: Math.max(
          0,
          sess.maxCapacity - sess.bookedCount - sess.heldCount,
        ),
      }));

    return NextResponse.json({
      tenant,
      tenants: state.tenants.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        vertical: t.vertical,
      })),
      bookings,
      overview,
      notifications: NotificationDispatcherImpl.getOutbox(tenant.id),
      catalog: {
        resources,
        services,
        staffMembers,
        sessions,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.httpStatus },
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to load dashboard data.' } },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const idempotencyKey = requireIdempotencyKey(request.headers.get('idempotency-key'));
    const json: unknown = await request.json();
    const parsed = createManualBookingSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid manual booking payload.',
            issues: parsed.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    const { tenantId, locationId, customer, paymentStatus, paymentMethod, selection } =
      parsed.data;

    const actor = resolveRequestActor(request, {
      scope: 'dashboard',
      fallbackTenantId: tenantId,
    });
    if (!actor) {
      throw new AppError('UNAUTHENTICATED', 'Authentication required.', 401);
    }

    const targetSelection =
      selection.bookingModel === 'exclusive_resource'
        ? {
            bookingModel: 'exclusive_resource' as const,
            resourceId: selection.resourceId,
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

    const created = await bookingService.createManualBooking({
      actor,
      command: {
        tenantId,
        locationId,
        idempotencyKey,
        selection: targetSelection,
        customer,
      },
      paymentStatus,
      paymentMethod,
    });

    return NextResponse.json({ booking: created }, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.httpStatus },
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create manual booking.' } },
      { status: 500 },
    );
  }
}
