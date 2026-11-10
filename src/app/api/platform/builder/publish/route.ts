import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { WebsiteServiceImpl } from '@/modules/website-builder/website.impl';
import { AppError } from '@/lib/errors';
import { resolveRequestActor } from '@/modules/auth/resolve-actor';
import type { PageSection, WebsiteThemeConfig } from '@/modules/website-builder/layout.types';

const websiteService = new WebsiteServiceImpl();

const publishSchema = z.object({
  tenantId: z.string().min(1),
  websiteId: z.string().min(1),
  pageId: z.string().optional(),
  releaseNotes: z.string().max(500).optional(),
  sections: z.array(z.any()).optional(),
  theme: z
    .object({
      brandPrimaryHex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      brandAccentHex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      backgroundHex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      foregroundHex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      fontHeading: z.string().min(1),
      fontBody: z.string().min(1),
      borderRadiusScale: z.enum(['sharp', 'rounded', 'pill']),
      colorScheme: z.enum(['light', 'dark']),
    })
    .optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const actor = await resolveRequestActor(request, {
      scope: 'platform',
      defaultRole: 'internal_configurator',
    });
    if (!actor) {
      throw new AppError('UNAUTHENTICATED', 'Authentication required.', 401);
    }

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

    // If editor submits unsaved draft sections/theme alongside Publish, persist draft first
    let draftRevision: number | undefined;
    if (parsed.data.sections) {
      const saved = await websiteService.savePageDraft(actor, {
        tenantId: parsed.data.tenantId,
        pageId: parsed.data.pageId ?? `page-home-${parsed.data.tenantId}`,
        expectedDraftRevision: 0,
        sections: parsed.data.sections as PageSection[],
        theme: parsed.data.theme as WebsiteThemeConfig | undefined,
      });
      draftRevision = saved.draftRevision;
    }

    const result = await websiteService.publishWebsite(actor, {
      tenantId: parsed.data.tenantId,
      websiteId: parsed.data.websiteId,
      releaseNotes: parsed.data.releaseNotes,
    });

    return NextResponse.json({ ...result, draftRevision }, { status: 200 });
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
