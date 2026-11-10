import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { AppError } from '@/lib/errors';
import { resolveRequestActor } from '@/modules/auth/resolve-actor';
import { resolveAuthorizedDashboardTenant } from '@/modules/tenancy/tenant-resolver';
import { UniversalCommerceService } from '@/modules/commerce/commerce.service';
import { RuntimeStateRepository } from '@/modules/persistence/runtime-store';
import {
  CATALOGUE_ITEM_STATUSES,
  CATALOGUE_ITEM_TYPES,
  FULFILMENT_STATUSES,
  FULFILMENT_TYPES,
} from '@/types/domain';

const createItemSchema = z.object({
  tenantId: z.string().min(1),
  name: z.string().min(2).max(200),
  categoryName: z.string().min(2).max(120),
  subEntityName: z.string().max(120).optional(),
  itemType: z.enum(CATALOGUE_ITEM_TYPES),
  fulfilmentType: z.enum(FULFILMENT_TYPES),
  priceMinor: z.number().int().min(0),
  unitLabel: z.string().max(40).optional(),
  initialStock: z.number().int().min(0).optional(),
  accessDurationDays: z.number().int().min(1).optional(),
  flag1: z.string().max(100).optional(),
  flag2: z.string().max(100).optional(),
  status: z.enum(CATALOGUE_ITEM_STATUSES).optional(),
});

const patchSchema = z.discriminatedUnion('patchType', [
  z.object({
    patchType: z.literal('catalogue_item'),
    tenantId: z.string().min(1),
    catalogueItemId: z.string().min(1),
    status: z.enum(CATALOGUE_ITEM_STATUSES).optional(),
    flag1: z.string().optional(),
    flag2: z.string().optional(),
    restockDelta: z.number().int().optional(),
  }),
  z.object({
    patchType: z.literal('fulfilment'),
    tenantId: z.string().min(1),
    fulfilmentId: z.string().min(1),
    status: z.enum(FULFILMENT_STATUSES),
  }),
]);

const commerceService = new UniversalCommerceService();

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const actor = await resolveRequestActor(request, { scope: 'dashboard' });
    if (!actor) {
      throw new AppError('UNAUTHENTICATED', 'Authentication required.', 401);
    }

    UniversalCommerceService.sweepExpiredLocksAndEntitlements();
    const requestedTenant = request.nextUrl.searchParams.get('tenantId');
    const targetTenantId = resolveAuthorizedDashboardTenant(actor, requestedTenant ?? undefined);

    const state = RuntimeStateRepository.getState();
    const key = targetTenantId.toLowerCase();
    const tenant = state.tenants.find(
      (t) => t.id.toLowerCase() === key || t.slug.toLowerCase() === key,
    );

    if (!tenant) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Tenant not found.' } },
        { status: 404 },
      );
    }

    const catalogueItems = commerceService.listCatalogue(tenant.id, { includeDormant: true });
    const masterProjection = commerceService.getMasterDataProjection(tenant.id);
    const orders = state.orders.filter((o) => o.tenantId === tenant.id);
    const fulfilments = state.fulfilments.filter((f) => f.tenantId === tenant.id);
    const entitlements = state.entitlements.filter((e) => e.tenantId === tenant.id);
    const subscriptions = state.customerSubscriptions.filter((s) => s.tenantId === tenant.id);

    return NextResponse.json(
      {
        tenant,
        catalogueItems,
        masterProjection,
        orders,
        fulfilments,
        entitlements,
        subscriptions,
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
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to load dashboard inventory.' } },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const actor = await resolveRequestActor(request, { scope: 'dashboard' });
    if (!actor) {
      throw new AppError('UNAUTHENTICATED', 'Authentication required.', 401);
    }

    const json: unknown = await request.json();
    const parsed = createItemSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid catalogue item parameters.',
            issues: parsed.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    const targetTenantId = resolveAuthorizedDashboardTenant(actor, parsed.data.tenantId);
    const created = commerceService.createCatalogueItem({
      ...parsed.data,
      tenantId: targetTenantId,
    });
    return NextResponse.json({ item: created }, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.httpStatus },
      );
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create catalogue item.' } },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const actor = await resolveRequestActor(request, { scope: 'dashboard' });
    if (!actor) {
      throw new AppError('UNAUTHENTICATED', 'Authentication required.', 401);
    }

    const json: unknown = await request.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid patch payload.',
            issues: parsed.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    const targetTenantId = resolveAuthorizedDashboardTenant(actor, parsed.data.tenantId);

    if (parsed.data.patchType === 'catalogue_item') {
      const updated = commerceService.updateCatalogueItemOrStock({
        tenantId: targetTenantId,
        catalogueItemId: parsed.data.catalogueItemId,
        status: parsed.data.status,
        flag1: parsed.data.flag1,
        flag2: parsed.data.flag2,
        restockDelta: parsed.data.restockDelta,
      });
      return NextResponse.json({ item: updated }, { status: 200 });
    }

    const updatedFul = commerceService.updateFulfilmentStatus({
      tenantId: targetTenantId,
      fulfilmentId: parsed.data.fulfilmentId,
      status: parsed.data.status,
    });
    return NextResponse.json(updatedFul, { status: 200 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.httpStatus },
      );
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update inventory/fulfilment.' } },
      { status: 500 },
    );
  }
}
