import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { AppError } from '@/lib/errors';
import { UniversalCommerceService } from '@/modules/commerce/commerce.service';
import { RuntimeStateRepository } from '@/modules/persistence/runtime-store';

const actionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('verify_access'),
    tenantId: z.string().min(1),
    entitlementId: z.string().min(1),
    consumeUnit: z.boolean().optional(),
  }),
  z.object({
    action: z.literal('renew_subscription'),
    tenantId: z.string().min(1),
    subscriptionId: z.string().min(1),
  }),
  z.object({
    action: z.literal('cancel_subscription'),
    tenantId: z.string().min(1),
    subscriptionId: z.string().min(1),
  }),
]);

const commerceService = new UniversalCommerceService();

/**
 * Customer Entitlement & Subscription Lifecycle Endpoint (`/api/public/v1/entitlements`).
 */
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

    return NextResponse.json(
      {
        entitlements: state.entitlements.filter((e) => e.tenantId === tenant.id),
        subscriptions: state.customerSubscriptions.filter((s) => s.tenantId === tenant.id),
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to load entitlements.' } },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const json: unknown = await request.json();
    const parsed = actionSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid entitlement action payload.',
            issues: parsed.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    if (parsed.data.action === 'verify_access') {
      const res = commerceService.verifyEntitlementAccess({
        tenantId: parsed.data.tenantId,
        entitlementId: parsed.data.entitlementId,
        consumeUnit: parsed.data.consumeUnit,
      });
      return NextResponse.json(res, { status: 200 });
    }

    if (parsed.data.action === 'renew_subscription') {
      const res = commerceService.renewSubscription({
        tenantId: parsed.data.tenantId,
        subscriptionId: parsed.data.subscriptionId,
      });
      return NextResponse.json(res, { status: 200 });
    }

    const res = commerceService.cancelSubscriptionAtPeriodEnd({
      tenantId: parsed.data.tenantId,
      subscriptionId: parsed.data.subscriptionId,
    });
    return NextResponse.json(res, { status: 200 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.httpStatus },
      );
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to execute entitlement action.' } },
      { status: 500 },
    );
  }
}
