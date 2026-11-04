import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { BOOKING_MODELS } from '@/types/domain';
import { AvailabilityServiceImpl } from '@/modules/booking/availability.impl';

const availabilityQuerySchema = z.object({
  tenantId: z.string().min(1),
  locationId: z.string().min(1),
  bookingModel: z.enum(BOOKING_MODELS),
  dateLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  resourceId: z.string().optional(),
  serviceId: z.string().optional(),
  staffMemberId: z.string().optional(),
});

const availabilityService = new AvailabilityServiceImpl();

/**
 * Public Server-Authoritative Slot Availability Endpoint (`GET /api/public/v1/availability`).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const rawParams = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = availabilityQuerySchema.safeParse(rawParams);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid availability query parameters.',
          issues: parsed.error.flatten(),
        },
      },
      { status: 400 },
    );
  }

  try {
    const slots = await availabilityService.listAvailableSlots(parsed.data);
    return NextResponse.json({ slots, count: slots.length }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to query availability.',
        },
      },
      { status: 500 },
    );
  }
}
