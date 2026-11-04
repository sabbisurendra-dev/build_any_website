import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { bookingModelEnum, scheduleTargetTypeEnum, sessionStatusEnum } from './enums';
import { locations, tenants, users } from './tenancy';

/**
 * 17. resources — Model A exclusive bookable physical assets
 *     (e.g. "Turf 1 - 7v7", "Badminton Court 3", "Box Cricket Arena").
 */
export const resources = pgTable(
  'resources',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    locationId: uuid('location_id')
      .notNull()
      .references(() => locations.id, { onDelete: 'cascade' }),
    slug: varchar('slug', { length: 80 }).notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    resourceType: varchar('resource_type', { length: 64 }).notNull(), // e.g. 'football_turf', 'badminton_court'
    description: text('description'),
    imageUrls: jsonb('image_urls').$type<string[]>().notNull().default([]),
    slotDurationMinutes: integer('slot_duration_minutes').notNull().default(60),
    minDurationMinutes: integer('min_duration_minutes').notNull().default(60), // PRD §6.1 configurable min/max duration
    maxDurationMinutes: integer('max_duration_minutes').notNull().default(180),
    slotStepMinutes: integer('slot_step_minutes').notNull().default(30),
    bufferBeforeMinutes: integer('buffer_before_minutes').notNull().default(0),
    bufferAfterMinutes: integer('buffer_after_minutes').notNull().default(0),
    basePriceMinor: integer('base_price_minor').notNull(), // Paise (e.g., Rs 1200 => 120000)
    currency: varchar('currency', { length: 3 }).notNull().default('INR'),
    pricingRules: jsonb('pricing_rules')
      .$type<
        Array<{
          label: string;
          daysOfWeek: number[];
          startTime: string; // HH:mm in location timezone
          endTime: string;
          priceMinor: number;
        }>
      >()
      .notNull()
      .default([]),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_resources_location_slug').on(t.locationId, t.slug),
    index('idx_resources_tenant_location_active').on(t.tenantId, t.locationId, t.isActive),
  ],
);

/**
 * 18. services — Bookable offerings spanning Model A, Model B (staff appointments),
 *     and Model C (capacity-based group classes/sessions).
 */
export const services = pgTable(
  'services',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    locationId: uuid('location_id').references(() => locations.id, { onDelete: 'cascade' }),
    slug: varchar('slug', { length: 80 }).notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    category: varchar('category', { length: 80 }),
    description: text('description'),
    bookingModel: bookingModelEnum('booking_model').notNull(),
    durationMinutes: integer('duration_minutes').notNull(),
    slotStepMinutes: integer('slot_step_minutes').notNull().default(15),
    bufferBeforeMinutes: integer('buffer_before_minutes').notNull().default(0),
    bufferAfterMinutes: integer('buffer_after_minutes').notNull().default(0),
    priceMinor: integer('price_minor').notNull(),
    depositMinor: integer('deposit_minor'), // Optional partial advance payment in paise
    currency: varchar('currency', { length: 3 }).notNull().default('INR'),
    minNoticeMinutes: integer('min_notice_minutes').notNull().default(30),
    maxAdvanceDays: integer('max_advance_days').notNull().default(30),
    cancellationCutoffMinutes: integer('cancellation_cutoff_minutes').notNull().default(120),
    requiresStaffSelection: boolean('requires_staff_selection').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_services_tenant_slug').on(t.tenantId, t.slug),
    index('idx_services_tenant_model_active').on(t.tenantId, t.bookingModel, t.isActive),
  ],
);

/**
 * 19. staff_members — Model B practitioners/providers (doctors, stylists, coaches).
 */
export const staffMembers = pgTable(
  'staff_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    locationId: uuid('location_id')
      .notNull()
      .references(() => locations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    displayName: varchar('display_name', { length: 160 }).notNull(),
    title: varchar('title', { length: 120 }), // e.g. 'Senior Physiotherapist', 'Master Stylist'
    bio: text('bio'),
    avatarUrl: text('avatar_url'),
    isBookable: boolean('is_bookable').notNull().default(true),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_staff_members_tenant_location').on(t.tenantId, t.locationId, t.isActive),
    index('idx_staff_members_user').on(t.userId),
  ],
);

/**
 * 20. staff_services — Assigns services to staff members with optional duration/price overrides.
 */
export const staffServices = pgTable(
  'staff_services',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    staffMemberId: uuid('staff_member_id')
      .notNull()
      .references(() => staffMembers.id, { onDelete: 'cascade' }),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    customDurationMinutes: integer('custom_duration_minutes'),
    customPriceMinor: integer('custom_price_minor'),
  },
  (t) => [
    uniqueIndex('uq_staff_services_pair').on(t.staffMemberId, t.serviceId),
    index('idx_staff_services_tenant_service').on(t.tenantId, t.serviceId),
  ],
);

/**
 * 21. availability_rules — Recurring weekly working/operating hours interpreted
 *     in the associated `locations.timezone`.
 */
export const availabilityRules = pgTable(
  'availability_rules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    locationId: uuid('location_id')
      .notNull()
      .references(() => locations.id, { onDelete: 'cascade' }),
    targetType: scheduleTargetTypeEnum('target_type').notNull(),
    resourceId: uuid('resource_id').references(() => resources.id, { onDelete: 'cascade' }),
    staffMemberId: uuid('staff_member_id').references(() => staffMembers.id, {
      onDelete: 'cascade',
    }),
    dayOfWeek: smallint('day_of_week').notNull(), // 0 = Sunday .. 6 = Saturday
    startTime: time('start_time').notNull(), // Wall-clock time in location timezone
    endTime: time('end_time').notNull(),
    spansMidnight: boolean('spans_midnight').notNull().default(false), // PRD §7.4 cross-midnight operating hours (e.g. 18:00 -> 02:00+1d)
    effectiveFrom: date('effective_from'),
    effectiveUntil: date('effective_until'),
    priceOverrideMinor: integer('price_override_minor'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_availability_rules_lookup').on(
      t.tenantId,
      t.locationId,
      t.targetType,
      t.dayOfWeek,
    ),
    index('idx_availability_rules_resource').on(t.resourceId),
    index('idx_availability_rules_staff').on(t.staffMemberId),
  ],
);

/**
 * 22. availability_exceptions — Date-specific overrides: holidays, turf maintenance blocks,
 *     doctor leave, or special extended festival hours.
 */
export const availabilityExceptions = pgTable(
  'availability_exceptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    locationId: uuid('location_id')
      .notNull()
      .references(() => locations.id, { onDelete: 'cascade' }),
    targetType: scheduleTargetTypeEnum('target_type').notNull(),
    resourceId: uuid('resource_id').references(() => resources.id, { onDelete: 'cascade' }),
    staffMemberId: uuid('staff_member_id').references(() => staffMembers.id, {
      onDelete: 'cascade',
    }),
    exceptionDate: date('exception_date').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }), // Null when full-day blackout
    endsAt: timestamp('ends_at', { withTimezone: true }),
    isUnavailable: boolean('is_unavailable').notNull().default(true),
    reason: varchar('reason', { length: 240 }),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_availability_exceptions_lookup').on(
      t.tenantId,
      t.locationId,
      t.exceptionDate,
    ),
  ],
);

/**
 * 23. booking_sessions — Model C scheduled capacity-based occurrences
 *     (e.g. "Morning Ashtanga Yoga - 7:00 AM, Max 20 spots").
 *     Concurrency invariant enforced via `SELECT ... FOR UPDATE` + DB CHECK constraint:
 *     `booked_count >= 0 AND held_count >= 0 AND (booked_count + held_count) <= max_capacity`.
 */
export const bookingSessions = pgTable(
  'booking_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    locationId: uuid('location_id')
      .notNull()
      .references(() => locations.id, { onDelete: 'cascade' }),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'restrict' }),
    staffMemberId: uuid('staff_member_id').references(() => staffMembers.id, {
      onDelete: 'set null',
    }),
    resourceId: uuid('resource_id').references(() => resources.id, {
      onDelete: 'set null',
    }),
    title: varchar('title', { length: 160 }).notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    maxCapacity: integer('max_capacity').notNull(),
    bookedCount: integer('booked_count').notNull().default(0),
    heldCount: integer('held_count').notNull().default(0),
    waitlistCapacity: integer('waitlist_capacity').notNull().default(0), // Future waitlist readiness
    waitlistCount: integer('waitlist_count').notNull().default(0),
    priceMinor: integer('price_minor').notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('INR'),
    status: sessionStatusEnum('status').notNull().default('scheduled'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_booking_sessions_tenant_window').on(t.tenantId, t.locationId, t.startsAt),
    index('idx_booking_sessions_service_starts').on(t.serviceId, t.startsAt),
  ],
);
