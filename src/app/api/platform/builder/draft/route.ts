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

const saveDraftSchema = z.object({
  tenantId: z.string().min(1),
  pageId: z.string().min(1),
  expectedDraftRevision: z.number().int().min(0),
  sections: z.array(z.any()),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const json: unknown = await request.json();
    const parsed = saveDraftSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid draft payload.',
            issues: parsed.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    const result = await websiteService.savePageDraft(CONFIGURATOR_ACTOR, parsed.data);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.httpStatus },
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to save page draft.' } },
      { status: 500 },
    );
  }
}
