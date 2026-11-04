import type { AuthenticatedActor } from '@/modules/auth/session.types';
import type { UUID } from '@/types/domain';
import type { PageSection, WebsiteThemeConfig } from './layout.types';

export interface SavePageDraftInput {
  readonly tenantId: UUID;
  readonly pageId: UUID;
  readonly expectedDraftRevision: number;
  readonly sections: readonly PageSection[];
}

export interface PublishWebsiteInput {
  readonly tenantId: UUID;
  readonly websiteId: UUID;
  readonly releaseNotes?: string;
}

export interface WebsiteServicePort {
  /**
   * Validates every widget's `config` against `CORE_WIDGET_REGISTRY` Zod schemas,
   * asserts overlap-free grid invariants, and writes `page_layouts` using optimistic
   * concurrency (`WHERE draft_revision = expectedDraftRevision`).
   */
  savePageDraft(
    actor: AuthenticatedActor,
    input: SavePageDraftInput,
  ): Promise<{ draftRevision: number; updatedAt: Date }>;

  updateThemeDraft(
    actor: AuthenticatedActor,
    tenantId: UUID,
    websiteId: UUID,
    theme: WebsiteThemeConfig,
  ): Promise<void>;

  /**
   * Freezes all enabled `pages` + `page_layouts` + `theme_config` into an immutable
   * `website_versions` row, atomically updates `websites.published_version_id`,
   * records an `audit_logs` entry, and triggers Next.js `revalidateTag` for the
   * tenant's subdomain and verified custom domain.
   */
  publishWebsite(
    actor: AuthenticatedActor,
    input: PublishWebsiteInput,
  ): Promise<{ versionId: UUID; versionNumber: number; publishedAt: Date }>;

  rollbackToVersion(
    actor: AuthenticatedActor,
    tenantId: UUID,
    websiteId: UUID,
    targetVersionId: UUID,
  ): Promise<void>;

  duplicatePage(
    actor: AuthenticatedActor,
    tenantId: UUID,
    sourcePageId: UUID,
    targetSlug: string,
  ): Promise<{ newPageId: UUID }>;

  saveWebsiteAsTemplate(
    actor: AuthenticatedActor,
    tenantId: UUID,
    websiteId: UUID,
    templateKey: string,
    templateName: string,
  ): Promise<{ templateId: UUID }>;
}
