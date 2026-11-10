-- ============================================================================
-- 0003_row_level_security.sql
-- Defense-in-depth: Enable and FORCE Row-Level Security on EVERY tenant table.
-- Creates non-owner, non-superuser role app_runtime and assigns grants.
-- ============================================================================

DO 48024
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_runtime') THEN
    CREATE ROLE app_runtime WITH LOGIN PASSWORD 'app_runtime_local_pass' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END 48024;--> statement-breakpoint

GRANT USAGE ON SCHEMA public, app TO app_runtime;--> statement-breakpoint
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_runtime;--> statement-breakpoint
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_runtime;--> statement-breakpoint
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public, app TO app_runtime;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO app_runtime;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO app_runtime;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO app_runtime;--> statement-breakpoint

ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audit_logs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_audit_logs" ON "audit_logs";--> statement-breakpoint
CREATE POLICY "tenant_isolation_audit_logs" ON "audit_logs" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint

ALTER TABLE "availability_exceptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "availability_exceptions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_availability_exceptions" ON "availability_exceptions";--> statement-breakpoint
CREATE POLICY "tenant_isolation_availability_exceptions" ON "availability_exceptions" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint

ALTER TABLE "availability_rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "availability_rules" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_availability_rules" ON "availability_rules";--> statement-breakpoint
CREATE POLICY "tenant_isolation_availability_rules" ON "availability_rules" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint

ALTER TABLE "booking_holds" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "booking_holds" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_booking_holds" ON "booking_holds";--> statement-breakpoint
CREATE POLICY "tenant_isolation_booking_holds" ON "booking_holds" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint

ALTER TABLE "booking_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "booking_items" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_booking_items" ON "booking_items";--> statement-breakpoint
CREATE POLICY "tenant_isolation_booking_items" ON "booking_items" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint

ALTER TABLE "booking_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "booking_sessions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_booking_sessions" ON "booking_sessions";--> statement-breakpoint
CREATE POLICY "tenant_isolation_booking_sessions" ON "booking_sessions" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint

ALTER TABLE "booking_status_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "booking_status_history" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_booking_status_history" ON "booking_status_history";--> statement-breakpoint
CREATE POLICY "tenant_isolation_booking_status_history" ON "booking_status_history" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint

ALTER TABLE "bookings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bookings" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_bookings" ON "bookings";--> statement-breakpoint
CREATE POLICY "tenant_isolation_bookings" ON "bookings" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint

ALTER TABLE "business_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "business_profiles" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_business_profiles" ON "business_profiles";--> statement-breakpoint
CREATE POLICY "tenant_isolation_business_profiles" ON "business_profiles" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint

ALTER TABLE "business_units" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "business_units" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_business_units" ON "business_units";--> statement-breakpoint
CREATE POLICY "tenant_isolation_business_units" ON "business_units" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint

ALTER TABLE "catalogue_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "catalogue_items" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_catalogue_items" ON "catalogue_items";--> statement-breakpoint
CREATE POLICY "tenant_isolation_catalogue_items" ON "catalogue_items" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint

ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "categories" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_categories" ON "categories";--> statement-breakpoint
CREATE POLICY "tenant_isolation_categories" ON "categories" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint

ALTER TABLE "customer_subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "customer_subscriptions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_customer_subscriptions" ON "customer_subscriptions";--> statement-breakpoint
CREATE POLICY "tenant_isolation_customer_subscriptions" ON "customer_subscriptions" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint

ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "customers" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_customers" ON "customers";--> statement-breakpoint
CREATE POLICY "tenant_isolation_customers" ON "customers" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint

ALTER TABLE "digital_contents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "digital_contents" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_digital_contents" ON "digital_contents";--> statement-breakpoint
CREATE POLICY "tenant_isolation_digital_contents" ON "digital_contents" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint

ALTER TABLE "entitlement_usages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "entitlement_usages" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_entitlement_usages" ON "entitlement_usages";--> statement-breakpoint
CREATE POLICY "tenant_isolation_entitlement_usages" ON "entitlement_usages" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint

ALTER TABLE "entitlements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "entitlements" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_entitlements" ON "entitlements";--> statement-breakpoint
CREATE POLICY "tenant_isolation_entitlements" ON "entitlements" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint

ALTER TABLE "fulfilments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "fulfilments" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_fulfilments" ON "fulfilments";--> statement-breakpoint
CREATE POLICY "tenant_isolation_fulfilments" ON "fulfilments" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint

ALTER TABLE "inventory_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "inventory_items" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_inventory_items" ON "inventory_items";--> statement-breakpoint
CREATE POLICY "tenant_isolation_inventory_items" ON "inventory_items" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint

ALTER TABLE "inventory_movements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "inventory_movements" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_inventory_movements" ON "inventory_movements";--> statement-breakpoint
CREATE POLICY "tenant_isolation_inventory_movements" ON "inventory_movements" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint

ALTER TABLE "inventory_reservations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "inventory_reservations" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_inventory_reservations" ON "inventory_reservations";--> statement-breakpoint
CREATE POLICY "tenant_isolation_inventory_reservations" ON "inventory_reservations" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint

ALTER TABLE "locations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "locations" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_locations" ON "locations";--> statement-breakpoint
CREATE POLICY "tenant_isolation_locations" ON "locations" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint

ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notifications" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_notifications" ON "notifications";--> statement-breakpoint
CREATE POLICY "tenant_isolation_notifications" ON "notifications" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint

ALTER TABLE "order_lines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "order_lines" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_order_lines" ON "order_lines";--> statement-breakpoint
CREATE POLICY "tenant_isolation_order_lines" ON "order_lines" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint

ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "orders" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_orders" ON "orders";--> statement-breakpoint
CREATE POLICY "tenant_isolation_orders" ON "orders" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint

ALTER TABLE "page_layouts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "page_layouts" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_page_layouts" ON "page_layouts";--> statement-breakpoint
CREATE POLICY "tenant_isolation_page_layouts" ON "page_layouts" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint

ALTER TABLE "pages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pages" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_pages" ON "pages";--> statement-breakpoint
CREATE POLICY "tenant_isolation_pages" ON "pages" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint

ALTER TABLE "payment_webhook_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "payment_webhook_events" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_payment_webhook_events" ON "payment_webhook_events";--> statement-breakpoint
CREATE POLICY "tenant_isolation_payment_webhook_events" ON "payment_webhook_events" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint

ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "payments" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_payments" ON "payments";--> statement-breakpoint
CREATE POLICY "tenant_isolation_payments" ON "payments" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint

ALTER TABLE "price_plans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "price_plans" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_price_plans" ON "price_plans";--> statement-breakpoint
CREATE POLICY "tenant_isolation_price_plans" ON "price_plans" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint

ALTER TABLE "product_variants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "product_variants" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_product_variants" ON "product_variants";--> statement-breakpoint
CREATE POLICY "tenant_isolation_product_variants" ON "product_variants" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint

ALTER TABLE "refunds" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "refunds" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_refunds" ON "refunds";--> statement-breakpoint
CREATE POLICY "tenant_isolation_refunds" ON "refunds" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint

ALTER TABLE "resources" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "resources" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_resources" ON "resources";--> statement-breakpoint
CREATE POLICY "tenant_isolation_resources" ON "resources" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint

ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "roles" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_roles" ON "roles";--> statement-breakpoint
CREATE POLICY "tenant_isolation_roles" ON "roles" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id() OR tenant_id IS NULL) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint

ALTER TABLE "services" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "services" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_services" ON "services";--> statement-breakpoint
CREATE POLICY "tenant_isolation_services" ON "services" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint

ALTER TABLE "staff_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "staff_members" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_staff_members" ON "staff_members";--> statement-breakpoint
CREATE POLICY "tenant_isolation_staff_members" ON "staff_members" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint

ALTER TABLE "staff_services" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "staff_services" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_staff_services" ON "staff_services";--> statement-breakpoint
CREATE POLICY "tenant_isolation_staff_services" ON "staff_services" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint

ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "subscriptions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_subscriptions" ON "subscriptions";--> statement-breakpoint
CREATE POLICY "tenant_isolation_subscriptions" ON "subscriptions" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint

ALTER TABLE "tenant_memberships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tenant_memberships" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_tenant_memberships" ON "tenant_memberships";--> statement-breakpoint
CREATE POLICY "tenant_isolation_tenant_memberships" ON "tenant_memberships" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint

ALTER TABLE "tenant_onboarding_steps" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tenant_onboarding_steps" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_tenant_onboarding_steps" ON "tenant_onboarding_steps";--> statement-breakpoint
CREATE POLICY "tenant_isolation_tenant_onboarding_steps" ON "tenant_onboarding_steps" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint

ALTER TABLE "tenant_payment_configs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tenant_payment_configs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_tenant_payment_configs" ON "tenant_payment_configs";--> statement-breakpoint
CREATE POLICY "tenant_isolation_tenant_payment_configs" ON "tenant_payment_configs" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint

ALTER TABLE "website_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "website_versions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_website_versions" ON "website_versions";--> statement-breakpoint
CREATE POLICY "tenant_isolation_website_versions" ON "website_versions" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint

ALTER TABLE "websites" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "websites" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation_websites" ON "websites";--> statement-breakpoint
CREATE POLICY "tenant_isolation_websites" ON "websites" AS PERMISSIVE FOR ALL TO public USING (app.is_platform_context() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_platform_context() OR tenant_id = app.current_tenant_id());--> statement-breakpoint
