/**
 * Authoritative catalogue of every multi-tenant table in the platform.
 * Every table listed here contains a `tenant_id` column and MUST have:
 * 1. ENABLE ROW LEVEL SECURITY
 * 2. FORCE ROW LEVEL SECURITY
 * 3. Permissive policy: USING (app.is_platform_context() OR tenant_id = app.current_tenant_id())
 *    WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id())
 */
export const TENANT_OWNED_TABLES = [
  'audit_logs',
  'availability_exceptions',
  'availability_rules',
  'booking_holds',
  'booking_items',
  'booking_sessions',
  'booking_status_history',
  'bookings',
  'business_profiles',
  'business_units',
  'catalogue_items',
  'categories',
  'customer_subscriptions',
  'customers',
  'digital_contents',
  'entitlement_usages',
  'entitlements',
  'fulfilments',
  'inventory_items',
  'inventory_movements',
  'inventory_reservations',
  'locations',
  'notifications',
  'order_lines',
  'orders',
  'outbox_events',
  'page_layouts',
  'pages',
  'payment_webhook_events',
  'payments',
  'price_plans',
  'product_variants',
  'refunds',
  'resources',
  'roles',
  'services',
  'staff_members',
  'staff_services',
  'subscriptions',
  'tenant_memberships',
  'tenant_onboarding_steps',
  'tenant_payment_configs',
  'website_versions',
  'websites',
] as const;

export type TenantOwnedTable = (typeof TENANT_OWNED_TABLES)[number];
