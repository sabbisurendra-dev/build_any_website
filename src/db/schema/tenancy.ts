import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import {
  billingIntervalEnum,
  businessVerticalEnum,
  gatewayEnvironmentEnum,
  membershipStatusEnum,
  paymentProviderEnum,
  roleScopeEnum,
  subscriptionPlanEnum,
  subscriptionStatusEnum,
  tenantStatusEnum,
} from './enums';

/**
 * 1. tenants — Root multi-tenant isolation boundary.
 */
export const tenants = pgTable(
  'tenants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 80 }).notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    vertical: businessVerticalEnum('vertical').notNull(),
    status: tenantStatusEnum('status').notNull().default('onboarding'),
    defaultCurrency: varchar('default_currency', { length: 3 }).notNull().default('INR'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_tenants_slug').on(t.slug),
    index('idx_tenants_status').on(t.status),
  ],
);

/**
 * 2. users — Application identity linked 1:1 with Supabase `auth.users(id)`.
 *    Platform staff (`platform_super_admin`, `internal_configurator`) hold `platformRole`.
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey(), // Matches Supabase auth.users.id
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 24 }), // E.164 format e.g. +919876543210
    fullName: varchar('full_name', { length: 160 }).notNull(),
    avatarUrl: text('avatar_url'),
    platformRole: varchar('platform_role', { length: 40 }), // 'platform_super_admin' | 'internal_configurator' | null
    isActive: boolean('is_active').notNull().default(true),
    lastSignInAt: timestamp('last_sign_in_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_users_email').on(t.email),
    uniqueIndex('uq_users_phone').on(t.phone),
  ],
);

/**
 * 3. roles — System-wide (`tenant_id IS NULL`) or custom tenant-scoped role definitions.
 */
export const roles = pgTable(
  'roles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
    key: varchar('key', { length: 64 }).notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    description: text('description'),
    scope: roleScopeEnum('scope').notNull(),
    isSystem: boolean('is_system').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_roles_tenant_key').on(t.tenantId, t.key),
  ],
);

/**
 * 4. permissions — Atomic permission catalog (e.g. 'websites:publish', 'bookings:cancel').
 */
export const permissions = pgTable(
  'permissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    key: varchar('key', { length: 96 }).notNull(),
    module: varchar('module', { length: 48 }).notNull(),
    description: text('description').notNull(),
  },
  (t) => [uniqueIndex('uq_permissions_key').on(t.key)],
);

/**
 * 5. role_permissions — Many-to-many mapping between roles and atomic permissions.
 */
export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })],
);

/**
 * 6. tenant_memberships — Assigns a user to a specific SMB tenant with a designated role.
 */
export const tenantMemberships = pgTable(
  'tenant_memberships',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'restrict' }),
    status: membershipStatusEnum('status').notNull().default('active'),
    invitedByUserId: uuid('invited_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_tenant_memberships_tenant_user').on(t.tenantId, t.userId),
    index('idx_tenant_memberships_user').on(t.userId),
  ],
);

/**
 * 7. business_profiles — Rich public & compliance metadata for the SMB.
 */
export const businessProfiles = pgTable(
  'business_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    legalName: varchar('legal_name', { length: 200 }),
    displayName: varchar('display_name', { length: 160 }).notNull(),
    tagline: varchar('tagline', { length: 240 }),
    description: text('description'),
    supportEmail: varchar('support_email', { length: 255 }),
    supportPhone: varchar('support_phone', { length: 24 }),
    whatsappNumber: varchar('whatsapp_number', { length: 24 }),
    gstin: varchar('gstin', { length: 20 }), // Indian GST Identification Number readiness
    logoUrl: text('logo_url'),
    socialLinks: jsonb('social_links').$type<Record<string, string>>().notNull().default({}),
    bookingPolicies: jsonb('booking_policies')
      .$type<{
        cancellationPolicyText?: string;
        rescheduleAllowed?: boolean;
        termsUrl?: string;
      }>()
      .notNull()
      .default({}),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('uq_business_profiles_tenant').on(t.tenantId)],
);

/**
 * 8. locations — Physical venues/clinics/branches with explicit IANA timezone.
 */
export const locations = pgTable(
  'locations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    slug: varchar('slug', { length: 80 }).notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    addressLine1: varchar('address_line1', { length: 255 }).notNull(),
    addressLine2: varchar('address_line2', { length: 255 }),
    city: varchar('city', { length: 100 }).notNull(),
    state: varchar('state', { length: 100 }).notNull(),
    postalCode: varchar('postal_code', { length: 20 }).notNull(),
    countryCode: varchar('country_code', { length: 2 }).notNull().default('IN'),
    timezone: varchar('timezone', { length: 64 }).notNull().default('Asia/Kolkata'),
    latitude: numeric('latitude', { precision: 9, scale: 6 }),
    longitude: numeric('longitude', { precision: 9, scale: 6 }),
    phone: varchar('phone', { length: 24 }),
    googleMapsUrl: text('google_maps_url'),
    isPrimary: boolean('is_primary').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_locations_tenant_slug').on(t.tenantId, t.slug),
    index('idx_locations_tenant_active').on(t.tenantId, t.isActive),
  ],
);

/**
 * 9. subscriptions — SaaS plan & feature entitlement readiness per tenant.
 */
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    planCode: subscriptionPlanEnum('plan_code').notNull().default('starter'),
    status: subscriptionStatusEnum('status').notNull().default('trialing'),
    billingInterval: billingIntervalEnum('billing_interval').notNull().default('monthly'),
    setupFeeMinor: integer('setup_fee_minor').notNull().default(0), // One-time setup fee in paise (Market Research §9.3)
    recurringAmountMinor: integer('recurring_amount_minor').notNull().default(0),
    providerSubscriptionId: varchar('provider_subscription_id', { length: 128 }),
    entitlements: jsonb('entitlements')
      .$type<{
        maxLocations: number;
        maxResources: number;
        maxStaff: number;
        customDomainAllowed: boolean;
        whatsappNotificationsEnabled: boolean;
      }>()
      .notNull(),
    trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('uq_subscriptions_tenant').on(t.tenantId)],
);

/**
 * 10. audit_logs — Immutable append-only audit trail for security & operational compliance.
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    actorRole: varchar('actor_role', { length: 64 }).notNull(),
    action: varchar('action', { length: 120 }).notNull(), // e.g. 'website.published', 'booking.refunded'
    entityType: varchar('entity_type', { length: 64 }).notNull(),
    entityId: varchar('entity_id', { length: 128 }).notNull(),
    ipAddress: varchar('ip_address', { length: 64 }),
    userAgent: text('user_agent'),
    changes: jsonb('changes')
      .$type<{ before?: Record<string, unknown>; after?: Record<string, unknown> }>()
      .notNull()
      .default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_audit_logs_tenant_created').on(t.tenantId, t.createdAt),
    index('idx_audit_logs_entity').on(t.entityType, t.entityId),
    index('idx_audit_logs_actor').on(t.actorUserId, t.createdAt),
  ],
);

/**
 * 10b. tenant_payment_configs — Per-tenant direct merchant gateway configuration (PRD §9).
 *      Supports MVP `'simulated'` / `'sandbox'` flows and P1 client-direct merchant
 *      accounts (Razorpay/Cashfree) so client funds are not held centrally.
 *      Secrets store KMS/Vault secret references—never plaintext keys.
 */
export const tenantPaymentConfigs = pgTable(
  'tenant_payment_configs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    provider: paymentProviderEnum('provider').notNull().default('simulated'),
    environment: gatewayEnvironmentEnum('environment').notNull().default('simulated'),
    publicKeyId: varchar('public_key_id', { length: 160 }),
    secretVaultRef: varchar('secret_vault_ref', { length: 255 }),
    webhookSecretVaultRef: varchar('webhook_secret_vault_ref', { length: 255 }),
    merchantAccountId: varchar('merchant_account_id', { length: 128 }),
    isActive: boolean('is_active').notNull().default(true),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('uq_tenant_payment_configs_tenant').on(t.tenantId)],
);

/**
 * 10c. tenant_onboarding_steps — Operational SLA telemetry capturing duration spent
 *      in each step of the 12-step internal website creation workflow (PRD §16 & §19)
 *      to ensure standard 1-2 day client website delivery.
 */
export const tenantOnboardingSteps = pgTable(
  'tenant_onboarding_steps',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    stepKey: varchar('step_key', { length: 64 }).notNull(), // e.g. 'template_selected', 'layout_customised', 'published'
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    durationSeconds: integer('duration_seconds'),
    completedByUserId: uuid('completed_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
  },
  (t) => [
    uniqueIndex('uq_tenant_onboarding_step').on(t.tenantId, t.stepKey),
    index('idx_tenant_onboarding_tenant').on(t.tenantId),
  ],
);
