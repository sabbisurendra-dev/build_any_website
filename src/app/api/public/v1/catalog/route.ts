import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { AppError } from '@/lib/errors';
import { assertRateLimit } from '@/lib/rate-limit';
import { extractClientIp } from '@/modules/auth/resolve-actor';
import { BookingServiceImpl } from '@/modules/booking/booking.impl';
import { RuntimeStateRepository } from '@/modules/persistence/runtime-store';

const querySchema = z.object({
  tenantId: z.string().min(1),
});

/**
 * Public Tenant Catalog Endpoint (`GET /api/public/v1/catalog?tenantId=...`).
 * Returns strictly active, public-safe bookable offerings for the resolved tenant.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await assertRateLimit(extractClientIp(request), 'public:availability');

    const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = querySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing or invalid tenantId parameter.',
          },
        },
        { status: 400 },
      );
    }

    BookingServiceImpl.sweepExpiredAllocationsNow();
    const state = RuntimeStateRepository.getState();
    const key = parsed.data.tenantId.toLowerCase();
    const tenant = state.tenants.find(
      (t) => t.id.toLowerCase() === key || t.slug.toLowerCase() === key,
    );

    if (!tenant || tenant.status !== 'active') {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Business not found.' } },
        { status: 404 },
      );
    }

    const resources = state.resources.filter(
      (r) => r.tenantId === tenant.id && r.isActive,
    );
    const services = state.services.filter(
      (s) => s.tenantId === tenant.id && s.isActive,
    );
    const staffMembers = state.staffMembers
      .filter((st) => st.tenantId === tenant.id && st.isActive)
      .map((st) => ({
        id: st.id,
        displayName: st.displayName,
        specialty: st.specialty,
        serviceIds: st.serviceIds,
        workingStartHour: st.workingStartHour,
        workingEndHour: st.workingEndHour,
      }));
    const sessions = state.sessions
      .filter((sess) => sess.tenantId === tenant.id && sess.isActive)
      .map((sess) => ({
        id: sess.id,
        name: sess.name,
        instructorName: sess.instructorName,
        description: sess.description,
        dateLocal: sess.dateLocal,
        startTime: sess.startTime,
        endTime: sess.endTime,
        maxCapacity: sess.maxCapacity,
        bookedCount: sess.bookedCount,
        heldCount: sess.heldCount,
        remainingCapacity: Math.max(
          0,
          sess.maxCapacity - sess.bookedCount - sess.heldCount,
        ),
        priceMinor: sess.priceMinor,
      }));

    return NextResponse.json(
      {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          vertical: tenant.vertical,
          defaultCurrency: tenant.defaultCurrency,
          location: tenant.location,
        },
        resources,
        services,
        staffMembers,
        sessions,
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
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to load catalog.' } },
      { status: 500 },
    );
  }
}
