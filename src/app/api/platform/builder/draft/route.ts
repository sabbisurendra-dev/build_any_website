import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { WebsiteServiceImpl } from '@/modules/website-builder/website.impl';
import { AppError } from '@/lib/errors';
import { resolveRequestActor } from '@/modules/auth/resolve-actor';
import type { PageSection, WebsiteThemeConfig } from '@/modules/website-builder/layout.types';

const websiteService = new WebsiteServiceImpl();

const themeSchema = z.object({
  brandPrimaryHex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  brandAccentHex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  backgroundHex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  foregroundHex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  fontHeading: z.string().min(1),
  fontBody: z.string().min(1),
  borderRadiusScale: z.enum(['sharp', 'rounded', 'pill']),
  colorScheme: z.enum(['light', 'dark']),
});

const saveDraftSchema = z.object({
  tenantId: z.string().min(1),
  pageId: z.string().min(1),
  expectedDraftRevision: z.number().int().min(0),
  sections: z.array(z.any()),
  theme: themeSchema.optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const actor = resolveRequestActor(request, {
      scope: 'platform',
      defaultRole: 'internal_configurator',
    });
    if (!actor) {
      throw new AppError('UNAUTHENTICATED', 'Authentication required.', 401);
    }

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

    const result = await websiteService.savePageDraft(actor, {
      tenantId: parsed.data.tenantId,
      pageId: parsed.data.pageId,
      expectedDraftRevision: parsed.data.expectedDraftRevision,
      sections: parsed.data.sections as PageSection[],
      theme: parsed.data.theme as WebsiteThemeConfig | undefined,
    });
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
