import { randomUUID } from 'node:crypto';
import type { AuthenticatedActor } from '@/modules/auth/session.types';
import { assertTenantPermission } from '@/modules/auth/rbac';
import type { UUID } from '@/types/domain';
import { AppError } from '@/lib/errors';
import type {
  PageSection,
  WebsiteThemeConfig,
} from './layout.types';
import type {
  SavePageDraftInput,
  PublishWebsiteInput,
  WebsiteServicePort,
} from './website.service';
import { CORE_WIDGET_REGISTRY } from './widget-registry';

interface StoredDraftState {
  pageId: UUID;
  draftRevision: number;
  sections: PageSection[];
  updatedAt: Date;
}

interface StoredVersionRecord {
  versionId: UUID;
  websiteId: UUID;
  versionNumber: number;
  releaseNotes?: string;
  publishedAt: Date;
  snapshot: {
    sections: PageSection[];
    theme: WebsiteThemeConfig;
  };
}

export class WebsiteServiceImpl implements WebsiteServicePort {
  private static drafts: Map<string, StoredDraftState> = new Map();
  private static versions: Map<string, StoredVersionRecord[]> = new Map();
  private static themes: Map<string, WebsiteThemeConfig> = new Map();

  public async savePageDraft(
    actor: AuthenticatedActor,
    input: SavePageDraftInput,
  ): Promise<{ draftRevision: number; updatedAt: Date }> {
    assertTenantPermission(actor, input.tenantId, 'websites:write_draft');

    // 1. Validate each widget against CORE_WIDGET_REGISTRY
    for (const section of input.sections) {
      for (const widget of section.widgets) {
        const def = CORE_WIDGET_REGISTRY.get(widget.widgetType);
        if (!def) {
          throw new AppError(
            'VALIDATION_ERROR',
            `Unknown widget type: '${widget.widgetType}' in section '${section.id}'.`,
            400,
          );
        }
      }
    }

    // 2. Optimistic Concurrency Check
    const draftKey = `${input.tenantId}:${input.pageId}`;
    const existing = WebsiteServiceImpl.drafts.get(draftKey);

    if (existing && existing.draftRevision !== input.expectedDraftRevision) {
      throw new AppError(
        'VALIDATION_ERROR',
        `Draft revision conflict. Expected ${input.expectedDraftRevision}, but current is ${existing.draftRevision}. Please refresh your editor.`,
        409,
      );
    }

    const nextRevision = (existing?.draftRevision ?? input.expectedDraftRevision) + 1;
    const updatedAt = new Date();

    WebsiteServiceImpl.drafts.set(draftKey, {
      pageId: input.pageId,
      draftRevision: nextRevision,
      sections: [...input.sections],
      updatedAt,
    });

    return { draftRevision: nextRevision, updatedAt };
  }

  public async updateThemeDraft(
    actor: AuthenticatedActor,
    tenantId: UUID,
    websiteId: UUID,
    theme: WebsiteThemeConfig,
  ): Promise<void> {
    assertTenantPermission(actor, tenantId, 'websites:write_draft');
    WebsiteServiceImpl.themes.set(`${tenantId}:${websiteId}`, theme);
  }

  public async publishWebsite(
    actor: AuthenticatedActor,
    input: PublishWebsiteInput,
  ): Promise<{ versionId: UUID; versionNumber: number; publishedAt: Date }> {
    assertTenantPermission(actor, input.tenantId, 'websites:publish');

    const websiteKey = `${input.tenantId}:${input.websiteId}`;
    const existingVersions = WebsiteServiceImpl.versions.get(websiteKey) ?? [];
    const nextVersionNumber = existingVersions.length + 1;
    const versionId = `ver-${randomUUID().slice(0, 8)}`;
    const publishedAt = new Date();

    // Default theme fallback
    const theme = WebsiteServiceImpl.themes.get(websiteKey) ?? {
      brandPrimaryHex: '#0f172a',
      brandAccentHex: '#16a34a',
      backgroundHex: '#ffffff',
      foregroundHex: '#090d16',
      fontHeading: 'system-ui',
      fontBody: 'system-ui',
      borderRadiusScale: 'rounded',
      colorScheme: 'light',
    };

    const newVersion: StoredVersionRecord = {
      versionId,
      websiteId: input.websiteId,
      versionNumber: nextVersionNumber,
      releaseNotes: input.releaseNotes,
      publishedAt,
      snapshot: {
        sections: [],
        theme,
      },
    };

    existingVersions.push(newVersion);
    WebsiteServiceImpl.versions.set(websiteKey, existingVersions);

    return {
      versionId,
      versionNumber: nextVersionNumber,
      publishedAt,
    };
  }

  public async rollbackToVersion(
    actor: AuthenticatedActor,
    tenantId: UUID,
    websiteId: UUID,
    targetVersionId: UUID,
  ): Promise<void> {
    assertTenantPermission(actor, tenantId, 'websites:publish');
    const websiteKey = `${tenantId}:${websiteId}`;
    const versions = WebsiteServiceImpl.versions.get(websiteKey) ?? [];
    const target = versions.find((v) => v.versionId === targetVersionId);

    if (!target) {
      throw new AppError('NOT_FOUND', `Version ${targetVersionId} not found.`, 404);
    }
  }

  public async duplicatePage(
    actor: AuthenticatedActor,
    tenantId: UUID,
    _sourcePageId: UUID,
    _targetSlug: string,
  ): Promise<{ newPageId: UUID }> {
    assertTenantPermission(actor, tenantId, 'websites:write_draft');
    const newPageId = `page-${randomUUID().slice(0, 8)}`;
    return { newPageId };
  }

  public async saveWebsiteAsTemplate(
    actor: AuthenticatedActor,
    tenantId: UUID,
    _websiteId: UUID,
    _templateKey: string,
    _templateName: string,
  ): Promise<{ templateId: UUID }> {
    assertTenantPermission(actor, tenantId, 'websites:publish');
    const templateId = `tmpl-${randomUUID().slice(0, 8)}`;
    return { templateId };
  }
}
