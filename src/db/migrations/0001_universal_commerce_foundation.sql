-- =============================================================================
-- Migration: 0001_universal_commerce_foundation.sql
-- Purpose: Universal Commerce, Inventory, Fulfilment, Subscriptions &
--          Entitlement Engine + Master Projection View (v_universal_commerce_master)
-- =============================================================================

-- 1. Stock Integrity Invariant on inventory_items
-- Guarantees reserved checkout holds never exceed physical stock unless backorder is enabled
ALTER TABLE IF EXISTS inventory_items
  ADD CONSTRAINT chk_inventory_items_non_negative_stock
  CHECK (
    quantity_on_hand >= 0
    AND quantity_reserved >= 0
    AND (allow_backorder = true OR quantity_on_hand >= quantity_reserved)
  );

-- 2. Entitlement Permission Window & Usage Bounds Invariants
ALTER TABLE IF EXISTS entitlements
  ADD CONSTRAINT chk_entitlements_valid_window
  CHECK (valid_until IS NULL OR valid_until > valid_from);

ALTER TABLE IF EXISTS entitlements
  ADD CONSTRAINT chk_entitlements_usage_bounds
  CHECK (
    consumed_usage_count >= 0
    AND (max_usage_count IS NULL OR consumed_usage_count <= max_usage_count)
  );

-- 3. Subscription Period Invariant
ALTER TABLE IF EXISTS customer_subscriptions
  ADD CONSTRAINT chk_customer_subscriptions_period_bounds
  CHECK (current_period_end > current_period_start);

-- 4. Master Data Table Projection View (v_universal_commerce_master)
-- Projects the normalized tables into the exact flat Master Data Table structure:
-- Entity | Sub_entity | Domain | Category | Flag_1 | Flag_2 | Item_name |
-- Permission_timeslot_start | Permission_timeslot_end | Status
CREATE OR REPLACE VIEW v_universal_commerce_master AS
SELECT
  t.id AS tenant_id,
  t.name AS entity,
  COALESCE(bu.name, l.name, 'Main Division') AS sub_entity,
  COALESCE(wd.domain, t.slug || '.build-any-website.vercel.app') AS domain,
  COALESCE(cat.name, ci.item_type::text) AS category,
  COALESCE(ent.flag_1, ci.flag_1, bu.flag_1) AS flag_1,
  COALESCE(ent.flag_2, ci.flag_2, bu.flag_2) AS flag_2,
  ci.name AS item_name,
  ci.item_type,
  ci.fulfilment_type,
  ci.base_price_minor AS price_minor,
  ci.currency,
  inv.quantity_on_hand,
  inv.quantity_reserved,
  GREATEST(0, COALESCE(inv.quantity_on_hand, 0) - COALESCE(inv.quantity_reserved, 0)) AS stock_available,
  ent.id AS entitlement_id,
  ent.customer_name,
  ent.valid_from AS permission_timeslot_start,
  ent.valid_until AS permission_timeslot_end,
  CASE
    WHEN ent.id IS NOT NULL THEN ent.status::text
    WHEN ci.item_type = 'physical_product' AND inv.id IS NOT NULL AND (inv.quantity_on_hand - inv.quantity_reserved) <= 0 THEN 'sold'
    WHEN ci.status = 'active' THEN 'available'
    ELSE ci.status::text
  END AS status
FROM catalogue_items ci
INNER JOIN tenants t ON t.id = ci.tenant_id
LEFT JOIN business_units bu ON bu.id = ci.business_unit_id
LEFT JOIN locations l ON l.id = ci.location_id
LEFT JOIN categories cat ON cat.id = ci.category_id
LEFT JOIN websites w ON w.tenant_id = t.id
LEFT JOIN website_domains wd ON wd.website_id = w.id AND wd.is_primary = true
LEFT JOIN inventory_items inv ON inv.catalogue_item_id = ci.id
LEFT JOIN entitlements ent ON ent.catalogue_item_id = ci.id;
