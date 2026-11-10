import { NextResponse, type NextRequest } from 'next/server';
import { WebsiteServiceImpl } from '@/modules/website-builder/website.impl';
import { TenantServiceImpl } from '@/modules/tenancy/tenant.impl';
import { AppError } from '@/lib/errors';
import { resolveRequestActor } from '@/modules/auth/resolve-actor';

const websiteService = new WebsiteServiceImpl();

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const actor = await resolveRequestActor(request, {
      scope: 'platform',
      defaultRole: 'internal_configurator',
    });
    if (!actor) {
      throw new AppError('UNAUTHENTICATED', 'Authentication required.', 401);
    }

    const tenantParam =
      request.nextUrl.searchParams.get('tenantId') ??
      request.nextUrl.searchParams.get('tenant') ??
      't-kickoff-01';

    const { tenant, website } = websiteService.getEditorState(actor, tenantParam);
    const allTenants = TenantServiceImpl.listTenants().map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      vertical: t.vertical,
    }));

    return NextResponse.json({
      tenant,
      website,
      tenants: allTenants,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.httpStatus },
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to load website builder state.' } },
      { status: 500 },
    );
  }
}
