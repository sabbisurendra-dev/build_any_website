import {
  boolean,
  char,
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
  billingIntervalEnum,
  billingModelEnum,
  catalogueItemStatusEnum,
  catalogueItemTypeEnum,
  customerSubscriptionStatusEnum,
  entitlementStatusEnum,
  entitlementTypeEnum,
  fulfilmentMethodEnum,
  fulfilmentStatusEnum,
  fulfilmentTypeEnum,
  inventoryMovementTypeEnum,
  inventoryReservationStatusEnum,
  orderLineStatusEnum,
  orderStatusEnum,
} from './enums';
import { locations, tenants } from './tenancy';
import { resources, services } from './catalog-availability';
import { bookings, customers } from './bookings-payments';

/**
 * 1. BUSINESS UNITS (`sub_entity` under `tenants` / `entity`)
 */
export const businessUnits = pgTable(
  'business_units',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 180 }).notNull(),
    slug: varchar('slug', { length: 120 }).notNull(),
    domainVertical: varchar('domain_vertical', { length: 80 }).notNull().default('universal_commerce'),
    flag1: varchar('flag_1', { length: 100 }),
    flag2: varchar('flag_2', { length: 100 }),
    status: varchar('status', { length: 32 }).notNull().default('active'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_business_units_tenant_slug').on(t.tenantId, t.slug),
    index('idx_business_units_tenant').on(t.tenantId),
  ],
);

/**
 * 2. HIERARCHICAL CATEGORIES (`category`)
 */
export const categories = pgTable(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    businessUnitId: uuid('business_unit_id').references(() => businessUnits.id, {
      onDelete: 'set null',
    }),
    parentId: uuid('parent_id'),
    name: varchar('name', { length: 140 }).notNull(),
    slug: varchar('slug', { length: 120 }).notNull(),
    description: text('description'),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_categories_tenant_slug').on(t.tenantId, t.slug),
    index('idx_categories_tenant_parent').on(t.tenantId, t.parentId),
  ],
);

/**
 * 3. UNIVERSAL CATALOGUE ITEMS (`catalogue_items`)
 * Unifies physical products (milk, laptop), bookable resources (turf), appointments (doctor),
 * capacity sessions (yoga class), digital courses (90-day access), and subscriptions.
 */
export const catalogueItems = pgTable(
  'catalogue_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    businessUnitId: uuid('business_unit_id').references(() => businessUnits.id, {
      onDelete: 'set null',
    }),
    locationId: uuid('location_id').references(() => locations.id, {
      onDelete: 'set null',
    }),
    categoryId: uuid('category_id').references(() => categories.id, {
      onDelete: 'set null',
    }),
    itemType: catalogueItemTypeEnum('item_type').notNull(),
    fulfilmentType: fulfilmentTypeEnum('fulfilment_type').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 160 }).notNull(),
    sku: varchar('sku', { length: 100 }),
    shortDescription: varchar('short_description', { length: 500 }),
    description: text('description'),
    flag1: varchar('flag_1', { length: 100 }),
    flag2: varchar('flag_2', { length: 100 }),
    status: catalogueItemStatusEnum('status').notNull().default('active'),
    basePriceMinor: integer('base_price_minor').notNull().default(0),
    compareAtPriceMinor: integer('compare_at_price_minor'),
    currency: char('currency', { length: 3 }).notNull().default('INR'),
    taxRateBps: integer('tax_rate_bps').notNull().default(0),
    resourceId: uuid('resource_id').references(() => resources.id, { onDelete: 'set null' }),
    serviceId: uuid('service_id').references(() => services.id, { onDelete: 'set null' }),
    accessDurationDays: integer('access_duration_days'), // e.g. 90 for 90-day courses
    maxCapacityOrUnits: integer('max_capacity_or_units'),
    attributes: jsonb('attributes').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_catalogue_items_tenant_slug').on(t.tenantId, t.slug),
    index('idx_catalogue_items_tenant_type_status').on(t.tenantId, t.itemType, t.status),
    index('idx_catalogue_items_tenant_flags').on(t.tenantId, t.flag1, t.flag2),
  ],
);

/**
 * 4. PRODUCT VARIANTS (`product_variants` — e.g. 1L vs 500ml Milk, 16GB vs 32GB Laptop)
 */
export const productVariants = pgTable(
  'product_variants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    catalogueItemId: uuid('catalogue_item_id')
      .notNull()
      .references(() => catalogueItems.id, { onDelete: 'cascade' }),
    sku: varchar('sku', { length: 100 }).notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    optionValues: jsonb('option_values').$type<Record<string, string>>().notNull().default({}),
    priceOverrideMinor: integer('price_override_minor'),
    weightGrams: integer('weight_grams'),
    trackInventory: boolean('track_inventory').notNull().default(true),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_product_variants_tenant_sku').on(t.tenantId, t.sku),
    index('idx_product_variants_item').on(t.catalogueItemId),
  ],
);

/**
 * 5. PRICE PLANS (`price_plans` — One-time, Time-slot, 90-day access, Recurring subscription)
 */
export const pricePlans = pgTable(
  'price_plans',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    catalogueItemId: uuid('catalogue_item_id')
      .notNull()
      .references(() => catalogueItems.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 160 }).notNull(),
    billingModel: billingModelEnum('billing_model').notNull(),
    priceMinor: integer('price_minor').notNull(),
    currency: char('currency', { length: 3 }).notNull().default('INR'),
    accessDurationDays: integer('access_duration_days'),
    billingInterval: billingIntervalEnum('billing_interval'),
    includedUsageUnits: integer('included_usage_units'),
    upgradeTargetPlanId: uuid('upgrade_target_plan_id'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_price_plans_item').on(t.tenantId, t.catalogueItemId)],
);

/**
 * 6. PHYSICAL INVENTORY ITEMS (`inventory_items`)
 */
export const inventoryItems = pgTable(
  'inventory_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    catalogueItemId: uuid('catalogue_item_id')
      .notNull()
      .references(() => catalogueItems.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'cascade' }),
    locationId: uuid('location_id').references(() => locations.id, { onDelete: 'set null' }),
    quantityOnHand: integer('quantity_on_hand').notNull().default(0),
    quantityReserved: integer('quantity_reserved').notNull().default(0),
    lowStockThreshold: integer('low_stock_threshold').notNull().default(5),
    allowBackorder: boolean('allow_backorder').notNull().default(false),
    unitLabel: varchar('unit_label', { length: 40 }).notNull().default('unit'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_inventory_items_tenant_item').on(t.tenantId, t.catalogueItemId)],
);

/**
 * 7. INVENTORY RESERVATIONS (`inventory_reservations` — 8-Min Checkout Stock Locks)
 */
export const inventoryReservations = pgTable(
  'inventory_reservations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    inventoryItemId: uuid('inventory_item_id')
      .notNull()
      .references(() => inventoryItems.id, { onDelete: 'cascade' }),
    orderId: uuid('order_id'),
    quantity: integer('quantity').notNull(),
    status: inventoryReservationStatusEnum('status').notNull().default('active'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 120 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_inventory_reservations_idem').on(t.tenantId, t.idempotencyKey),
    index('idx_inventory_reservations_expiry').on(t.status, t.expiresAt),
  ],
);

/**
 * 8. INVENTORY MOVEMENTS (`inventory_movements` — Immutable Stock Ledger)
 */
export const inventoryMovements = pgTable(
  'inventory_movements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    inventoryItemId: uuid('inventory_item_id')
      .notNull()
      .references(() => inventoryItems.id, { onDelete: 'cascade' }),
    movementType: inventoryMovementTypeEnum('movement_type').notNull(),
    deltaQuantity: integer('delta_quantity').notNull(),
    referenceId: varchar('reference_id', { length: 120 }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_inventory_movements_item').on(t.tenantId, t.inventoryItemId)],
);

/**
 * 9. DIGITAL CONTENTS (`digital_contents` — Course Modules & Protected Assets)
 */
export const digitalContents = pgTable(
  'digital_contents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    catalogueItemId: uuid('catalogue_item_id')
      .notNull()
      .references(() => catalogueItems.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    contentType: varchar('content_type', { length: 64 }).notNull().default('video_lesson'),
    assetUrlOrKey: text('asset_url_or_key').notNull(),
    durationMinutes: integer('duration_minutes').notNull().default(15),
    sortOrder: integer('sort_order').notNull().default(0),
    isPreviewFree: boolean('is_preview_free').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_digital_contents_item').on(t.tenantId, t.catalogueItemId)],
);

/**
 * 10. UNIVERSAL ORDERS (`orders`)
 */
export const orders = pgTable(
  'orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    businessUnitId: uuid('business_unit_id').references(() => businessUnits.id, {
      onDelete: 'set null',
    }),
    orderNumber: varchar('order_number', { length: 40 }).notNull(),
    customerId: uuid('customer_id').references(() => customers.id, {
      onDelete: 'set null',
    }),
    customerName: varchar('customer_name', { length: 180 }).notNull(),
    customerPhone: varchar('customer_phone', { length: 40 }).notNull(),
    customerEmail: varchar('customer_email', { length: 255 }),
    status: orderStatusEnum('status').notNull().default('awaiting_payment'),
    paymentStatus: varchar('payment_status', { length: 32 }).notNull().default('unpaid'),
    subtotalMinor: integer('subtotal_minor').notNull().default(0),
    taxMinor: integer('tax_minor').notNull().default(0),
    totalMinor: integer('total_minor').notNull().default(0),
    currency: char('currency', { length: 3 }).notNull().default('INR'),
    shippingAddress: jsonb('shipping_address').$type<Record<string, string>>(),
    idempotencyKey: varchar('idempotency_key', { length: 120 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_orders_tenant_number').on(t.tenantId, t.orderNumber),
    uniqueIndex('uq_orders_tenant_idem').on(t.tenantId, t.idempotencyKey),
    index('idx_orders_tenant_status').on(t.tenantId, t.status),
  ],
);

/**
 * 11. ORDER LINES (`order_lines` — Supports Mixed Physical + Booking + Digital + Subscription Carts)
 */
export const orderLines = pgTable(
  'order_lines',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    catalogueItemId: uuid('catalogue_item_id')
      .notNull()
      .references(() => catalogueItems.id, { onDelete: 'restrict' }),
    variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
    pricePlanId: uuid('price_plan_id').references(() => pricePlans.id, { onDelete: 'set null' }),
    itemType: catalogueItemTypeEnum('item_type').notNull(),
    fulfilmentType: fulfilmentTypeEnum('fulfilment_type').notNull(),
    titleSnapshot: varchar('title_snapshot', { length: 255 }).notNull(),
    quantity: integer('quantity').notNull().default(1),
    unitPriceMinor: integer('unit_price_minor').notNull(),
    lineTotalMinor: integer('line_total_minor').notNull(),
    reservationRefId: uuid('reservation_ref_id'),
    bookingId: uuid('booking_id').references(() => bookings.id, { onDelete: 'set null' }),
    lineStatus: orderLineStatusEnum('line_status').notNull().default('pending'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  },
  (t) => [index('idx_order_lines_order').on(t.tenantId, t.orderId)],
);

/**
 * 12. PHYSICAL FULFILMENTS (`fulfilments` — Delivery & Store Pickup)
 */
export const fulfilments = pgTable(
  'fulfilments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    orderLineId: uuid('order_line_id')
      .notNull()
      .references(() => orderLines.id, { onDelete: 'cascade' }),
    method: fulfilmentMethodEnum('method').notNull().default('local_delivery'),
    status: fulfilmentStatusEnum('status').notNull().default('pending'),
    trackingNumber: varchar('tracking_number', { length: 120 }),
    deliverySlotStart: timestamp('delivery_slot_start', { withTimezone: true }),
    deliverySlotEnd: timestamp('delivery_slot_end', { withTimezone: true }),
    recipientAddress: text('recipient_address'),
    dispatchedAt: timestamp('dispatched_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_fulfilments_order').on(t.tenantId, t.orderId, t.status)],
);

/**
 * 13. CUSTOMER SUBSCRIPTIONS (`customer_subscriptions` — Recurring Memberships & Passes)
 */
export const customerSubscriptions = pgTable(
  'customer_subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    catalogueItemId: uuid('catalogue_item_id')
      .notNull()
      .references(() => catalogueItems.id, { onDelete: 'restrict' }),
    pricePlanId: uuid('price_plan_id').references(() => pricePlans.id, { onDelete: 'set null' }),
    customerName: varchar('customer_name', { length: 180 }).notNull(),
    customerPhone: varchar('customer_phone', { length: 40 }).notNull(),
    customerEmail: varchar('customer_email', { length: 255 }),
    status: customerSubscriptionStatusEnum('status').notNull().default('active'),
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_customer_subscriptions_tenant_status').on(t.tenantId, t.status)],
);

/**
 * 14. CUSTOMER ENTITLEMENTS (`entitlements` — "Grant a Right" with `permission_timeslot_start..end`)
 */
export const entitlements = pgTable(
  'entitlements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    businessUnitId: uuid('business_unit_id').references(() => businessUnits.id, {
      onDelete: 'set null',
    }),
    orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
    orderLineId: uuid('order_line_id').references(() => orderLines.id, { onDelete: 'set null' }),
    catalogueItemId: uuid('catalogue_item_id')
      .notNull()
      .references(() => catalogueItems.id, { onDelete: 'cascade' }),
    subscriptionId: uuid('subscription_id').references(() => customerSubscriptions.id, {
      onDelete: 'set null',
    }),
    bookingId: uuid('booking_id').references(() => bookings.id, { onDelete: 'set null' }),
    customerName: varchar('customer_name', { length: 180 }).notNull(),
    customerPhone: varchar('customer_phone', { length: 40 }).notNull(),
    customerEmail: varchar('customer_email', { length: 255 }),
    entitlementType: entitlementTypeEnum('entitlement_type').notNull(),
    validFrom: timestamp('valid_from', { withTimezone: true }).notNull(), // permission_timeslot_start
    validUntil: timestamp('valid_until', { withTimezone: true }), // permission_timeslot_end
    maxUsageCount: integer('max_usage_count'),
    consumedUsageCount: integer('consumed_usage_count').notNull().default(0),
    status: entitlementStatusEnum('status').notNull().default('active'),
    flag1: varchar('flag_1', { length: 100 }),
    flag2: varchar('flag_2', { length: 100 }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_entitlements_tenant_customer').on(t.tenantId, t.customerPhone, t.status),
    index('idx_entitlements_window').on(t.tenantId, t.validFrom, t.validUntil),
  ],
);

/**
 * 15. ENTITLEMENT USAGES (`entitlement_usages` — Consumption Audit Trail)
 */
export const entitlementUsages = pgTable(
  'entitlement_usages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    entitlementId: uuid('entitlement_id')
      .notNull()
      .references(() => entitlements.id, { onDelete: 'cascade' }),
    action: varchar('action', { length: 64 }).notNull().default('access_verified'),
    quantityConsumed: integer('quantity_consumed').notNull().default(1),
    consumedAt: timestamp('consumed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_entitlement_usages_entitlement').on(t.tenantId, t.entitlementId)],
);
