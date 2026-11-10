import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { TenantServiceImpl } from '@/modules/tenancy/tenant.impl';
import { AppError } from '@/lib/errors';
import { assertPlatformPermission } from '@/modules/auth/rbac';
import { resolveRequestActor } from '@/modules/auth/resolve-actor';
import { BUSINESS_VERTICALS } from '@/types/domain';

const tenantService = new TenantServiceImpl();

const createTenantSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9-]+$/),
  vertical: z.enum(BUSINESS_VERTICALS),
  defaultCurrency: z.enum(['INR', 'USD', 'AED', 'SGD', 'GBP']).default('INR'),
  primaryLocation: z.object({
    name: z.string().trim().min(2),
    addressLine1: z.string().trim().min(3),
    city: z.string().trim().min(2),
    state: z.string().trim().min(2),
    postalCode: z.string().trim().min(4),
    phone: z.string().optional(),
    timezone: z.string().default('Asia/Kolkata'),
  }),
  ownerEmail: z.string().email().optional(),
  ownerPhone: z.string().optional(),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const actor = await resolveRequestActor(request, {
      scope: 'platform',
      defaultRole: 'platform_super_admin',
    });
    assertPlatformPermission(actor, 'platform:tenants:manage');

    const tenants = TenantServiceImpl.listTenants();
    return NextResponse.json({ tenants, count: tenants.length });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.httpStatus },
      );
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to list tenants.' } },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const actor = await resolveRequestActor(request, {
      scope: 'platform',
      defaultRole: 'platform_super_admin',
    });
    const verifiedActor = assertPlatformPermission(actor, 'platform:tenants:manage');

    const json: unknown = await request.json();
    const parsed = createTenantSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid tenant provisioning payload.',
            issues: parsed.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    const result = await tenantService.provisionTenant(verifiedActor, parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.httpStatus },
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to provision tenant.' } },
      { status: 500 },
    );
  }
}
