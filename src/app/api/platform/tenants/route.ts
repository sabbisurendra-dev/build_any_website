import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { TenantServiceImpl } from '@/modules/tenancy/tenant.impl';
import { AppError } from '@/lib/errors';
import type { AuthenticatedActor } from '@/modules/auth/session.types';
import { BUSINESS_VERTICALS } from '@/types/domain';

const tenantService = new TenantServiceImpl();

// Simulated internal configurator actor for platform administration
const PLATFORM_ACTOR: AuthenticatedActor = {
  userId: 'usr-platform-admin',
  platformRole: 'platform_super_admin',
  tenantMemberships: [],
};

const createTenantSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/),
  vertical: z.enum(BUSINESS_VERTICALS),
  defaultCurrency: z.enum(['INR', 'USD', 'AED', 'SGD', 'GBP']).default('INR'),
  primaryLocation: z.object({
    name: z.string().min(2),
    addressLine1: z.string().min(5),
    city: z.string().min(2),
    state: z.string().min(2),
    postalCode: z.string().min(4),
    phone: z.string().optional(),
    timezone: z.string().default('Asia/Kolkata'),
  }),
  ownerEmail: z.string().email().optional(),
  ownerPhone: z.string().optional(),
});

export async function GET(): Promise<NextResponse> {
  const tenants = TenantServiceImpl.listTenants();
  return NextResponse.json({ tenants, count: tenants.length });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
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

    const result = await tenantService.provisionTenant(PLATFORM_ACTOR, parsed.data);
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
