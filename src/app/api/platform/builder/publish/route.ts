import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { WebsiteServiceImpl } from '@/modules/website-builder/website.impl';
import { AppError } from '@/lib/errors';
import type { AuthenticatedActor } from '@/modules/auth/session.types';

const websiteService = new WebsiteServiceImpl();

const CONFIGURATOR_ACTOR: AuthenticatedActor = {
  userId: 'usr-configurator-01',
  platformRole: 'internal_configurator',
  tenantMemberships: [],
};

const publishSchema = z.object({
  tenantId: z.string().min(1),
  websiteId: z.string().min(1),
  releaseNotes: z.string().max(500).optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const json: unknown = await request.json();
    const parsed = publishSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid publish payload.',
            issues: parsed.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    const result = await websiteService.publishWebsite(CONFIGURATOR_ACTOR, parsed.data);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.httpStatus },
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to publish website.' } },
      { status: 500 },
    );
  }
}
