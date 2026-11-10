import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { AppError } from '@/lib/errors';
import { requireIdempotencyKey } from '@/lib/idempotency';
import { assertRateLimit } from '@/lib/rate-limit';
import { extractClientIp } from '@/modules/auth/resolve-actor';
import { UniversalCommerceService } from '@/modules/commerce/commerce.service';
import { RuntimeStateRepository } from '@/modules/persistence/runtime-store';
import { BOOKING_MODELS } from '@/types/domain';

const createOrderSchema = z.object({
  tenantId: z.string().min(1),
  customer: z.object({
    fullName: z.string().min(2).max(140),
    phone: z.string().min(6).max(32),
    email: z.string().email().optional(),
    shippingAddress: z.string().max(400).optional(),
  }),
  fulfilmentPreference: z
    .enum(['local_delivery', 'courier_shipment', 'store_pickup'])
    .optional(),
  paymentMethod: z.enum(['upi', 'card', 'cash']).optional(),
  autoConfirmPayment: z.boolean().default(true),
  lines: z
    .array(
      z.object({
        catalogueItemId: z.string().min(1),
        quantity: z.number().int().min(1).max(100).default(1),
        slotSelection: z
          .object({
            bookingModel: z.enum(BOOKING_MODELS).optional(),
            resourceId: z.string().optional(),
            serviceId: z.string().optional(),
            staffMemberId: z.string().optional(),
            sessionId: z.string().optional(),
            startsAt: z.string().optional(),
            endsAt: z.string().optional(),
          })
          .optional(),
      }),
    )
    .min(1),
});

const commerceService = new UniversalCommerceService();

/**
 * Unified Order & Mixed-Cart Checkout Endpoint (`POST /api/public/v1/orders`).
 * Handles physical inventory (Milk, Laptop), time-slot bookings (Turf, Doctor, Yoga),
 * 90-day digital courses, and recurring subscriptions in a single atomic transaction.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await assertRateLimit(extractClientIp(request), 'public:hold_create');
    const idempotencyKey = requireIdempotencyKey(
      request.headers.get('idempotency-key') ?? `idem-ord-${Date.now()}`,
    );
    const json: unknown = await request.json();
    const parsed = createOrderSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid universal order payload.',
            issues: parsed.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    const result = await commerceService.createOrderAndHold({
      tenantId: parsed.data.tenantId,
      idempotencyKey,
      customer: parsed.data.customer,
      fulfilmentPreference: parsed.data.fulfilmentPreference,
      paymentMethod: parsed.data.paymentMethod,
      autoConfirmPayment: parsed.data.autoConfirmPayment,
      lines: parsed.data.lines,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.httpStatus },
      );
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to process universal order.' } },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    UniversalCommerceService.sweepExpiredLocksAndEntitlements();
    const tenantId = request.nextUrl.searchParams.get('tenantId') ?? 't-uni-06';
    const state = RuntimeStateRepository.getState();
    const key = tenantId.toLowerCase();
    const tenant = state.tenants.find(
      (t) => t.id.toLowerCase() === key || t.slug.toLowerCase() === key,
    );

    if (!tenant) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Tenant not found.' } },
        { status: 404 },
      );
    }

    const orders = state.orders.filter((o) => o.tenantId === tenant.id);
    const fulfilments = state.fulfilments.filter((f) => f.tenantId === tenant.id);
    const entitlements = state.entitlements.filter((e) => e.tenantId === tenant.id);
    const subscriptions = state.customerSubscriptions.filter((s) => s.tenantId === tenant.id);

    return NextResponse.json(
      {
        orders,
        fulfilments,
        entitlements,
        subscriptions,
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to load orders.' } },
      { status: 500 },
    );
  }
}
