import { randomUUID } from 'node:crypto';
import type { AuthenticatedActor } from '@/modules/auth/session.types';
import { assertTenantPermission } from '@/modules/auth/rbac';
import type { UUID } from '@/types/domain';
import { AppError } from '@/lib/errors';
import type { PageSection, WebsiteThemeConfig } from './layout.types';
import type {
  SavePageDraftInput,
  PublishWebsiteInput,
  WebsiteServicePort,
} from './website.service';
import { CORE_WIDGET_REGISTRY } from './widget-registry';
import {
  RuntimeStateRepository,
  buildDefaultThemeForVertical,
  buildStarterSectionsForTenant,
  type TenantWebsiteState,
} from '@/modules/persistence/runtime-store';
import type { MockTenant } from '@/lib/mock-data/mock-tenants';

export class WebsiteServiceImpl implements WebsiteServicePort {
  private ensureTenantWebsiteState(tenantIdOrSlug: string): {
    tenant: MockTenant;
    website: TenantWebsiteState;
  } {
    const state = RuntimeStateRepository.getState();
    const tenant = state.tenants.find(
      (t) =>
        t.id === tenantIdOrSlug ||
        t.slug.toLowerCase() === tenantIdOrSlug.toLowerCase() ||
        t.customDomain?.toLowerCase() === tenantIdOrSlug.toLowerCase(),
    );
    if (!tenant) {
      throw new AppError('NOT_FOUND', `Tenant '${tenantIdOrSlug}' was not found.`, 404);
    }

    let website = state.websites[tenant.id];
    if (!website) {
      const sections = buildStarterSectionsForTenant(tenant);
      const theme = buildDefaultThemeForVertical(tenant.vertical);
      website = {
        websiteId: `web-${tenant.slug}`,
        tenantId: tenant.id,
        pageId: `page-home-${tenant.slug}`,
        draftRevision: 1,
        draftSections: JSON.parse(JSON.stringify(sections)),
        draftTheme: JSON.parse(JSON.stringify(theme)),
        publishedVersion: tenant.publishedVersion,
        publishedSections: JSON.parse(JSON.stringify(sections)),
        publishedTheme: JSON.parse(JSON.stringify(theme)),
        versions: [
          {
            versionId: `ver-v${tenant.publishedVersion}`,
            versionNumber: tenant.publishedVersion,
            releaseNotes: 'Initial release',
            publishedAtIso: tenant.createdAt,
            sections: JSON.parse(JSON.stringify(sections)),
            theme: JSON.parse(JSON.stringify(theme)),
          },
        ],
        updatedAtIso: new Date().toISOString(),
      };
      state.websites[tenant.id] = website;
    }

    return { tenant, website };
  }

  public getEditorState(
    actor: AuthenticatedActor,
    tenantIdOrSlug: string,
  ): {
    tenant: MockTenant;
    website: TenantWebsiteState;
  } {
    const { tenant, website } = this.ensureTenantWebsiteState(tenantIdOrSlug);
    assertTenantPermission(actor, tenant.id, 'websites:read');
    return { tenant, website };
  }

  public getPublishedWebsiteBySiteKey(siteKey: string): {
    tenant: MockTenant;
    sections: PageSection[];
    theme: WebsiteThemeConfig;
    publishedVersion: number;
  } | null {
    const state = RuntimeStateRepository.getState();
    const cleaned = siteKey.split(':')[0]?.toLowerCase() ?? '';
    const tenant = state.tenants.find(
      (t) =>
        t.id.toLowerCase() === cleaned ||
        t.slug.toLowerCase() === cleaned ||
        cleaned.startsWith(`${t.slug.toLowerCase()}.`) ||
        t.customDomain?.toLowerCase() === cleaned,
    );
    if (!tenant || tenant.status !== 'active') {
      return null;
    }

    const { website } = this.ensureTenantWebsiteState(tenant.id);
    return {
      tenant,
      sections: website.publishedSections,
      theme: website.publishedTheme,
      publishedVersion: website.publishedVersion,
    };
  }

  public async savePageDraft(
    actor: AuthenticatedActor,
    input: SavePageDraftInput & { theme?: WebsiteThemeConfig },
  ): Promise<{ draftRevision: number; updatedAt: Date }> {
    const { tenant, website } = this.ensureTenantWebsiteState(input.tenantId);
    assertTenantPermission(actor, tenant.id, 'websites:write_draft');

    // 1. Validate each widget against CORE_WIDGET_REGISTRY and 12-column grid bounds
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
        const { colStart, colSpan, rowStart, rowSpan } = widget.placement.desktop;
        if (
          colStart < 1 ||
          colSpan < 1 ||
          colStart + colSpan - 1 > 12 ||
          rowStart < 1 ||
          rowSpan < 1
        ) {
          throw new AppError(
            'VALIDATION_ERROR',
            `Widget '${widget.id}' has out-of-bounds grid placement.`,
            400,
          );
        }
      }
    }

    // 2. Optimistic Concurrency Check (when expectedDraftRevision > 0)
    if (
      input.expectedDraftRevision > 0 &&
      website.draftRevision !== input.expectedDraftRevision
    ) {
      throw new AppError(
        'VALIDATION_ERROR',
        `Draft revision conflict. Expected v${input.expectedDraftRevision}, but current server draft is v${website.draftRevision}.`,
        409,
      );
    }

    const nextRevision = website.draftRevision + 1;
    const updatedAt = new Date();

    website.draftRevision = nextRevision;
    website.draftSections = JSON.parse(JSON.stringify(input.sections));
    if (input.theme) {
      website.draftTheme = JSON.parse(JSON.stringify(input.theme));
    }
    website.updatedAtIso = updatedAt.toISOString();

    RuntimeStateRepository.persist();
    return { draftRevision: nextRevision, updatedAt };
  }

  public async updateThemeDraft(
    actor: AuthenticatedActor,
    tenantId: UUID,
    _websiteId: UUID,
    theme: WebsiteThemeConfig,
  ): Promise<void> {
    const { tenant, website } = this.ensureTenantWebsiteState(tenantId);
    assertTenantPermission(actor, tenant.id, 'websites:write_draft');
    website.draftTheme = JSON.parse(JSON.stringify(theme));
    website.updatedAtIso = new Date().toISOString();
    RuntimeStateRepository.persist();
  }

  public async publishWebsite(
    actor: AuthenticatedActor,
    input: PublishWebsiteInput,
  ): Promise<{ versionId: UUID; versionNumber: number; publishedAt: Date }> {
    const { tenant, website } = this.ensureTenantWebsiteState(input.tenantId);
    assertTenantPermission(actor, tenant.id, 'websites:publish');

    const nextVersionNumber = website.publishedVersion + 1;
    const versionId = `ver-${randomUUID().slice(0, 8)}`;
    const publishedAt = new Date();

    const snapshotSections: PageSection[] = JSON.parse(
      JSON.stringify(website.draftSections),
    );
    const snapshotTheme: WebsiteThemeConfig = JSON.parse(
      JSON.stringify(website.draftTheme),
    );

    website.publishedVersion = nextVersionNumber;
    website.publishedSections = snapshotSections;
    website.publishedTheme = snapshotTheme;
    website.updatedAtIso = publishedAt.toISOString();

    website.versions.unshift({
      versionId,
      versionNumber: nextVersionNumber,
      releaseNotes: input.releaseNotes,
      publishedAtIso: publishedAt.toISOString(),
      sections: JSON.parse(JSON.stringify(snapshotSections)),
      theme: JSON.parse(JSON.stringify(snapshotTheme)),
    });

    tenant.publishedVersion = nextVersionNumber;
    tenant.websiteStatus = 'published';

    RuntimeStateRepository.persist();
    return {
      versionId,
      versionNumber: nextVersionNumber,
      publishedAt,
    };
  }

  public async rollbackToVersion(
    actor: AuthenticatedActor,
    tenantId: UUID,
    _websiteId: UUID,
    targetVersionId: UUID,
  ): Promise<void> {
    const { tenant, website } = this.ensureTenantWebsiteState(tenantId);
    assertTenantPermission(actor, tenant.id, 'websites:publish');

    const target = website.versions.find((v) => v.versionId === targetVersionId);
    if (!target) {
      throw new AppError('NOT_FOUND', `Version ${targetVersionId} not found.`, 404);
    }

    website.draftSections = JSON.parse(JSON.stringify(target.sections));
    website.draftTheme = JSON.parse(JSON.stringify(target.theme));
    website.publishedSections = JSON.parse(JSON.stringify(target.sections));
    website.publishedTheme = JSON.parse(JSON.stringify(target.theme));
    website.draftRevision += 1;
    website.publishedVersion += 1;
    tenant.publishedVersion = website.publishedVersion;

    RuntimeStateRepository.persist();
  }

  public async duplicatePage(
    actor: AuthenticatedActor,
    tenantId: UUID,
    _sourcePageId: UUID,
    _targetSlug: string,
  ): Promise<{ newPageId: UUID }> {
    const { tenant } = this.ensureTenantWebsiteState(tenantId);
    assertTenantPermission(actor, tenant.id, 'websites:write_draft');
    return { newPageId: `page-${randomUUID().slice(0, 8)}` };
  }

  public async saveWebsiteAsTemplate(
    actor: AuthenticatedActor,
    tenantId: UUID,
    _websiteId: UUID,
    _templateKey: string,
    _templateName: string,
  ): Promise<{ templateId: UUID }> {
    const { tenant } = this.ensureTenantWebsiteState(tenantId);
    assertTenantPermission(actor, tenant.id, 'websites:publish');
    return { templateId: `tmpl-${randomUUID().slice(0, 8)}` };
  }
}
