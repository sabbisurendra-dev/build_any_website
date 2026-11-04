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
import {
   bookingSessions,
  resources,
  services,
  staffMembers,
} from './catalog-availability';
import {
  allocationStatusEnum,
  bookingModelEnum,
  bookingPaymentStatusEnum,
  bookingStatusEnum,
  holdStatusEnum,
  notificationChannelEnum,
  notificationStatusEnum,
  paymentMethodEnum,
  paymentProviderEnum,
  paymentStatusEnum,
  refundStatusEnum,
  webhookProcessingStatusEnum,
} from './enums';
import { locations, tenants, users } from './tenancy';

/**
 * 24. customers — Tenant-isolated end-customer records (supports guest/OTP & signed-in customers).
 */
export const customers = pgTable(
  'customers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    fullName: varchar('full_name', { length: 160 }).notNull(),
    phone: varchar('phone', { length: 24 }).notNull(), // Normalized E.164 (+91...)
    email: varchar('email', { length: 255 }),
    notes: text('notes'),
    marketingOptIn: boolean('marketing_opt_in').notNull().default(false),
    totalBookingsCount: integer('total_bookings_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_customers_tenant_phone').on(t.tenantId, t.phone),
    index('idx_customers_tenant_email').on(t.tenantId, t.email),
    index('idx_customers_user').on(t.userId),
  ],
);

/**
 * 25. bookings — Master booking lifecycle aggregate across Models A, B, and C.
 */
export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    locationId: uuid('location_id')
      .notNull()
      .references(() => locations.id, { onDelete: 'restrict' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    bookingNumber: varchar('booking_number', { length: 32 }).notNull(), // Human-readable e.g. BK-20261104-8F2K
    bookingModel: bookingModelEnum('booking_model').notNull(),
    status: bookingStatusEnum('status').notNull().default('temporarily_held'),
    paymentStatus: bookingPaymentStatusEnum('payment_status').notNull().default('unpaid'),
    idempotencyKey: varchar('idempotency_key', { length: 128 }).notNull(),
    subtotalMinor: integer('subtotal_minor').notNull(),
    discountMinor: integer('discount_minor').notNull().default(0),
    taxMinor: integer('tax_minor').notNull().default(0),
    totalMinor: integer('total_minor').notNull(),
    amountPaidMinor: integer('amount_paid_minor').notNull().default(0),
    currency: varchar('currency', { length: 3 }).notNull().default('INR'),
    couponCode: varchar('coupon_code', { length: 40 }), // Discount readiness
    customerSnapshot: jsonb('customer_snapshot')
      .$type<{ fullName: string; phone: string; email?: string }>()
      .notNull(),
    customerNotes: text('customer_notes'),
    internalNotes: text('internal_notes'),
    cancellationReason: text('cancellation_reason'),
    rescheduledFromBookingId: uuid('rescheduled_from_booking_id').references(
      (): AnyPgColumn => bookings.id,
      { onDelete: 'set null' },
    ),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_bookings_tenant_number').on(t.tenantId, t.bookingNumber),
    uniqueIndex('uq_bookings_tenant_idempotency').on(t.tenantId, t.idempotencyKey),
    index('idx_bookings_tenant_status_created').on(t.tenantId, t.status, t.createdAt),
    index('idx_bookings_customer').on(t.tenantId, t.customerId),
  ],
);

/**
 * 26. booking_holds — Explicit TTL lock record governing checkout & payment window
 *     (default 8 minutes for UPI intent / card 3DS completion).
 */
export const bookingHolds = pgTable(
  'booking_holds',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    holdToken: varchar('hold_token', { length: 96 }).notNull(), // Signed client token required at checkout
    idempotencyKey: varchar('idempotency_key', { length: 128 }).notNull(),
    status: holdStatusEnum('status').notNull().default('active'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    convertedAt: timestamp('converted_at', { withTimezone: true }),
    releasedAt: timestamp('released_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_booking_holds_booking').on(t.bookingId),
    uniqueIndex('uq_booking_holds_token').on(t.holdToken),
    uniqueIndex('uq_booking_holds_tenant_idempotency').on(t.tenantId, t.idempotencyKey),
    index('idx_booking_holds_active_expiry').on(t.status, t.expiresAt),
  ],
);

/**
 * 27. booking_items — Concrete resource/staff/session time allocations.
 *
 * CRITICAL DATABASE-LEVEL EXCLUSION CONSTRAINTS (defined in `0000_foundation_constraints.sql`):
 * - `effective_range` = `tstzrange(buffer_starts_at, buffer_ends_at, '[)')`
 * - `excl_booking_items_resource_overlap`:
 *     EXCLUDE USING gist (resource_id WITH =, effective_range WITH &&)
 *     WHERE (resource_id IS NOT NULL AND allocation_status = 'active')
 * - `excl_booking_items_staff_overlap`:
 *     EXCLUDE USING gist (staff_member_id WITH =, effective_range WITH &&)
 *     WHERE (staff_member_id IS NOT NULL AND allocation_status = 'active')
 *
 * Whenever a hold expires or a booking is cancelled, `allocation_status` transitions
 * atomically from `'active'` to `'released'`, freeing the slot immediately.
 */
export const bookingItems = pgTable(
  'booking_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    serviceId: uuid('service_id').references(() => services.id, { onDelete: 'restrict' }),
    resourceId: uuid('resource_id').references(() => resources.id, { onDelete: 'restrict' }),
    staffMemberId: uuid('staff_member_id').references(() => staffMembers.id, {
      onDelete: 'restrict',
    }),
    sessionId: uuid('session_id').references(() => bookingSessions.id, {
      onDelete: 'restrict',
    }),
    quantity: integer('quantity').notNull().default(1), // Seats/spots for Model C
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    bufferStartsAt: timestamp('buffer_starts_at', { withTimezone: true }).notNull(),
    bufferEndsAt: timestamp('buffer_ends_at', { withTimezone: true }).notNull(),
    allocationStatus: allocationStatusEnum('allocation_status').notNull().default('active'),
    unitPriceMinor: integer('unit_price_minor').notNull(),
    totalPriceMinor: integer('total_price_minor').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_booking_items_booking').on(t.bookingId),
    index('idx_booking_items_resource_window').on(
      t.resourceId,
      t.allocationStatus,
      t.bufferStartsAt,
      t.bufferEndsAt,
    ),
    index('idx_booking_items_staff_window').on(
      t.staffMemberId,
      t.allocationStatus,
      t.bufferStartsAt,
      t.bufferEndsAt,
    ),
    index('idx_booking_items_session').on(t.sessionId, t.allocationStatus),
    index('idx_booking_items_tenant_starts').on(t.tenantId, t.startsAt),
  ],
);

/**
 * 28. payments — Server-verified gateway orders & captures.
 *     NEVER stores raw card PAN, CVV, or expiry (PCI-DSS SAQ-A boundary).
 */
export const payments = pgTable(
  'payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'restrict' }),
    provider: paymentProviderEnum('provider').notNull(),
    providerOrderId: varchar('provider_order_id', { length: 128 }).notNull(),
    providerPaymentId: varchar('provider_payment_id', { length: 128 }),
    idempotencyKey: varchar('idempotency_key', { length: 128 }).notNull(),
    amountMinor: integer('amount_minor').notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('INR'),
    method: paymentMethodEnum('method').notNull().default('unknown'),
    status: paymentStatusEnum('status').notNull().default('created'),
    providerMetadata: jsonb('provider_metadata')
      .$type<{
        bankReferenceRrn?: string;
        maskedUpiVpa?: string;
        cardNetwork?: string;
        cardLast4?: string;
        failureCode?: string;
        failureReason?: string;
      }>()
      .notNull()
      .default({}),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_payments_provider_order').on(t.provider, t.providerOrderId),
    uniqueIndex('uq_payments_provider_payment').on(t.provider, t.providerPaymentId),
    uniqueIndex('uq_payments_tenant_idempotency').on(t.tenantId, t.idempotencyKey),
    index('idx_payments_booking').on(t.bookingId),
    index('idx_payments_tenant_status_created').on(t.tenantId, t.status, t.createdAt),
  ],
);

/**
 * 29. refunds — Full or partial refund ledger tied to captured payments.
 */
export const refunds = pgTable(
  'refunds',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    paymentId: uuid('payment_id')
      .notNull()
      .references(() => payments.id, { onDelete: 'restrict' }),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'restrict' }),
    providerRefundId: varchar('provider_refund_id', { length: 128 }),
    idempotencyKey: varchar('idempotency_key', { length: 128 }).notNull(),
    amountMinor: integer('amount_minor').notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('INR'),
    reason: varchar('reason', { length: 240 }).notNull(),
    status: refundStatusEnum('status').notNull().default('pending'),
    initiatedByUserId: uuid('initiated_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_refunds_provider_id').on(t.providerRefundId),
    uniqueIndex('uq_refunds_tenant_idempotency').on(t.tenantId, t.idempotencyKey),
    index('idx_refunds_payment').on(t.paymentId),
  ],
);

/**
 * 30. payment_webhook_events — Idempotent inbox guaranteeing duplicate gateway webhooks
 *     (`ON CONFLICT (provider, provider_event_id) DO NOTHING`) are never processed twice.
 */
export const paymentWebhookEvents = pgTable(
  'payment_webhook_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    provider: paymentProviderEnum('provider').notNull(),
    providerEventId: varchar('provider_event_id', { length: 160 }).notNull(),
    eventType: varchar('event_type', { length: 96 }).notNull(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
    signatureVerified: boolean('signature_verified').notNull().default(false),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    processingStatus: webhookProcessingStatusEnum('processing_status')
      .notNull()
      .default('received'),
    errorMessage: text('error_message'),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('uq_payment_webhook_provider_event').on(t.provider, t.providerEventId),
    index('idx_payment_webhook_status_received').on(t.processingStatus, t.receivedAt),
  ],
);

/**
 * 31. notifications — Transactional outbox/delivery log for Email (MVP) & WhatsApp/SMS readiness.
 */
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    bookingId: uuid('booking_id').references(() => bookings.id, { onDelete: 'set null' }),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    channel: notificationChannelEnum('channel').notNull(),
    templateKey: varchar('template_key', { length: 96 }).notNull(), // e.g. 'booking.confirmed'
    recipient: varchar('recipient', { length: 255 }).notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    providerMessageId: varchar('provider_message_id', { length: 160 }),
    idempotencyKey: varchar('idempotency_key', { length: 128 }).notNull(),
    status: notificationStatusEnum('status').notNull().default('queued'),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_notifications_tenant_idempotency').on(t.tenantId, t.idempotencyKey),
    index('idx_notifications_status_created').on(t.status, t.createdAt),
  ],
);

/**
 * 32. booking_status_history — Immutable audit trail of every booking status transition
 *     as explicitly mandated by PRD §7.7 ("Maintain an audit trail of booking status transitions").
 */
export const bookingStatusHistory = pgTable(
  'booking_status_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    fromStatus: bookingStatusEnum('from_status'),
    toStatus: bookingStatusEnum('to_status').notNull(),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    actorType: varchar('actor_type', { length: 32 }).notNull(), // 'customer' | 'staff' | 'owner' | 'webhook' | 'expiry_worker'
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_booking_status_history_booking').on(t.bookingId, t.createdAt)],
);
