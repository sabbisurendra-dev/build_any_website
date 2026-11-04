import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { BOOKING_MODELS } from '@/types/domain';

const availabilityQuerySchema = z.object({
  tenantId: z.string().uuid(),
  locationId: z.string().uuid(),
  bookingModel: z.enum(BOOKING_MODELS),
  dateLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  resourceId: z.string().uuid().optional(),
  serviceId: z.string().uuid().optional(),
  staffMemberId: z.string().uuid().optional(),
});

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

  return NextResponse.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Availability service wiring scheduled for Booking Engine implementation phase.',
      },
    },
    { status: 501 },
  );
}
