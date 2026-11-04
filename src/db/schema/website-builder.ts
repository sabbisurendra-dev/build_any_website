import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import type { PageSection, WebsiteThemeConfig } from '@/modules/website-builder/layout.types';
import { businessVerticalEnum, pageTypeEnum, websiteStatusEnum } from './enums';
import { locations, tenants, users } from './tenancy';

/**
 * 11. templates — Reusable vertical starter blueprints (Turf, Clinic, Salon, Yoga Studio).
 */
export const templates = pgTable(
  'templates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    key: varchar('key', { length: 80 }).notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    vertical: businessVerticalEnum('vertical').notNull(),
    description: text('description'),
    thumbnailUrl: text('thumbnail_url'),
    themePreset: jsonb('theme_preset').$type<WebsiteThemeConfig>().notNull(),
    pagesBlueprint: jsonb('pages_blueprint')
      .$type<
        Array<{
          slug: string;
          path: string;
          title: string;
          pageType: 'home' | 'services' | 'booking' | 'about' | 'contact' | 'custom';
          sections: PageSection[];
        }>
      >()
      .notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_templates_key').on(t.key),
    index('idx_templates_vertical_active').on(t.vertical, t.isActive),
  ],
);

/**
 * 12. widget_definitions — Platform widget catalog metadata & sizing constraints.
 */
export const widgetDefinitions = pgTable(
  'widget_definitions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    type: varchar('type', { length: 96 }).notNull(), // e.g. 'hero.banner', 'booking.slot-picker'
    name: varchar('name', { length: 120 }).notNull(),
    category: varchar('category', { length: 64 }).notNull(),
    version: integer('version').notNull().default(1),
    defaultColSpan: integer('default_col_span').notNull().default(12),
    defaultRowSpan: integer('default_row_span').notNull().default(6),
    minColSpan: integer('min_col_span').notNull().default(3),
    minRowSpan: integer('min_row_span').notNull().default(2),
    configJsonSchema: jsonb('config_json_schema').$type<Record<string, unknown>>().notNull(),
    isBookingAware: boolean('is_booking_aware').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('uq_widget_definitions_type').on(t.type)],
);

/**
 * 13. websites — Tenant website configuration, domain routing, and pointer to live published version.
 */
export const websites = pgTable(
  'websites',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    primaryLocationId: uuid('primary_location_id').references(() => locations.id, {
      onDelete: 'set null',
    }),
    sourceTemplateId: uuid('source_template_id').references(() => templates.id, {
      onDelete: 'set null',
    }),
    name: varchar('name', { length: 160 }).notNull(),
    subdomain: varchar('subdomain', { length: 80 }).notNull(), // {subdomain}.platform.in
    customDomain: varchar('custom_domain', { length: 255 }), // e.g. kickoffturf.in
    customDomainVerified: boolean('custom_domain_verified').notNull().default(false),
    status: websiteStatusEnum('status').notNull().default('draft'),
    themeConfig: jsonb('theme_config').$type<WebsiteThemeConfig>().notNull(),
    seoDefaults: jsonb('seo_defaults')
      .$type<{
        titleTemplate?: string;
        defaultDescription?: string;
        ogImageUrl?: string;
      }>()
      .notNull()
      .default({}),
    publishedVersionId: uuid('published_version_id').references(
      (): AnyPgColumn => websiteVersions.id,
      { onDelete: 'set null' },
    ),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_websites_subdomain').on(t.subdomain),
    uniqueIndex('uq_websites_custom_domain').on(t.customDomain),
    index('idx_websites_tenant').on(t.tenantId),
  ],
);

/**
 * 14. pages — Individual routes within a tenant website.
 */
export const pages = pgTable(
  'pages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    websiteId: uuid('website_id')
      .notNull()
      .references(() => websites.id, { onDelete: 'cascade' }),
    slug: varchar('slug', { length: 120 }).notNull(),
    path: varchar('path', { length: 200 }).notNull(), // Normalized route e.g. '/', '/book', '/services'
    title: varchar('title', { length: 160 }).notNull(),
    pageType: pageTypeEnum('page_type').notNull().default('custom'),
    seoMeta: jsonb('seo_meta')
      .$type<{
        metaTitle?: string;
        metaDescription?: string;
        ogImageUrl?: string;
        noIndex?: boolean;
      }>()
      .notNull()
      .default({}),
    isPublishedEnabled: boolean('is_published_enabled').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_pages_website_path').on(t.websiteId, t.path),
    index('idx_pages_tenant_website').on(t.tenantId, t.websiteId),
  ],
);

/**
 * 15. page_layouts — Mutable working draft layout tree for the visual editor (1:1 with page).
 *     Includes `draftRevision` for optimistic concurrency control (`WHERE draft_revision = $expected`)
 *     so two internal configurators never silently overwrite each other's layout edits.
 */
export const pageLayouts = pgTable(
  'page_layouts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    pageId: uuid('page_id')
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    schemaVersion: integer('schema_version').notNull().default(1),
    draftRevision: integer('draft_revision').notNull().default(1),
    sectionsJson: jsonb('sections_json').$type<PageSection[]>().notNull().default([]),
    updatedByUserId: uuid('updated_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('uq_page_layouts_page').on(t.pageId)],
);

/**
 * 16. website_versions — Immutable published snapshots enabling atomic publish and 1-click rollback.
 *     Public customer websites ONLY read from `website_versions` pointed to by `websites.publishedVersionId`.
 */
export const websiteVersions = pgTable(
  'website_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    websiteId: uuid('website_id')
      .notNull()
      .references(() => websites.id, { onDelete: 'cascade' }),
    versionNumber: integer('version_number').notNull(),
    releaseNotes: varchar('release_notes', { length: 280 }),
    themeSnapshot: jsonb('theme_snapshot').$type<WebsiteThemeConfig>().notNull(),
    pagesSnapshot: jsonb('pages_snapshot')
      .$type<
        Record<
          string,
          {
            pageId: string;
            path: string;
            title: string;
            seoMeta: Record<string, unknown>;
            sections: PageSection[];
          }
        >
      >()
      .notNull(),
    publishedByUserId: uuid('published_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_website_versions_website_ver').on(t.websiteId, t.versionNumber),
    index('idx_website_versions_tenant_website').on(t.tenantId, t.websiteId),
  ],
);
