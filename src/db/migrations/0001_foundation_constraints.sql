-- ============================================================================
-- 0001_foundation_constraints.sql
-- Supplemental PostgreSQL 16+ Extensions, Concurrency Exclusion Constraints,
-- Capacity Invariants, Append-Only Audit Triggers, and Tenant RLS Helpers.
-- Applied after Drizzle table creation.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint

-- 1. TIME ORDERING & MONETARY INTEGRITY CHECK CONSTRAINTS
ALTER TABLE booking_items
  ADD CONSTRAINT chk_booking_items_valid_service_window
    CHECK (ends_at > starts_at),
  ADD CONSTRAINT chk_booking_items_valid_buffer_window
    CHECK (
      buffer_starts_at <= starts_at
      AND buffer_ends_at >= ends_at
      AND buffer_ends_at > buffer_starts_at
    ),
  ADD CONSTRAINT chk_booking_items_positive_quantity
    CHECK (quantity >= 1),
  ADD CONSTRAINT chk_booking_items_target_present
    CHECK (
      resource_id IS NOT NULL
      OR staff_member_id IS NOT NULL
      OR session_id IS NOT NULL
    );--> statement-breakpoint

-- 2. MODEL A & MODEL B: ZERO-RACE-CONDITION INTERVAL EXCLUSION CONSTRAINTS
--    Guarantees at the PostgreSQL GiST index level that simultaneous requests
--    for the same resource or staff member CANNOT create overlapping active holds
--    or confirmed bookings (raises SQLSTATE 23P01).
--    Half-open '[)' bounds allow back-to-back slots (e.g. 20:00-21:00 & 21:00-22:00).
--    Applies ONLY to live rows (allocation_status = 'active'); released/cancelled rows do not block.
ALTER TABLE booking_items
  ADD CONSTRAINT excl_booking_items_resource_overlap
    EXCLUDE USING gist (
      resource_id WITH =,
      tstzrange(buffer_starts_at, buffer_ends_at, '[)') WITH &&
    )
    WHERE (resource_id IS NOT NULL AND allocation_status = 'active');--> statement-breakpoint

ALTER TABLE booking_items
  ADD CONSTRAINT excl_booking_items_staff_overlap
    EXCLUDE USING gist (
      staff_member_id WITH =,
      tstzrange(buffer_starts_at, buffer_ends_at, '[)') WITH &&
    )
    WHERE (staff_member_id IS NOT NULL AND allocation_status = 'active');--> statement-breakpoint

-- 3. MODEL C: CAPACITY SESSION HARD INVARIANTS
ALTER TABLE booking_sessions
  ADD CONSTRAINT chk_booking_sessions_valid_window
    CHECK (ends_at > starts_at),
  ADD CONSTRAINT chk_booking_sessions_capacity_bounds
    CHECK (
      max_capacity >= 1
      AND booked_count >= 0
      AND held_count >= 0
      AND (booked_count + held_count) <= max_capacity
      AND waitlist_capacity >= 0
      AND waitlist_count >= 0
      AND waitlist_count <= waitlist_capacity
    );--> statement-breakpoint

-- 4. FINANCIAL SANITY CONSTRAINTS
ALTER TABLE bookings
  ADD CONSTRAINT chk_bookings_non_negative_amounts
    CHECK (
      subtotal_minor >= 0
      AND discount_minor >= 0
      AND tax_minor >= 0
      AND total_minor >= 0
      AND amount_paid_minor >= 0
    );--> statement-breakpoint

ALTER TABLE payments
  ADD CONSTRAINT chk_payments_positive_amount
    CHECK (amount_minor > 0);--> statement-breakpoint

ALTER TABLE refunds
  ADD CONSTRAINT chk_refunds_positive_amount
    CHECK (amount_minor > 0);--> statement-breakpoint

-- 5. APPEND-ONLY IMMUTABILITY FOR AUDIT LOGS
CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only; UPDATE and DELETE are prohibited.';
END;
$$;--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON audit_logs;--> statement-breakpoint
CREATE TRIGGER trg_audit_logs_immutable
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_mutation();--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_booking_status_history_immutable ON booking_status_history;--> statement-breakpoint
CREATE TRIGGER trg_booking_status_history_immutable
  BEFORE UPDATE OR DELETE ON booking_status_history
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_mutation();--> statement-breakpoint

-- 6. DEFENSE-IN-DEPTH TENANT ISOLATION HELPERS FOR ROW-LEVEL SECURITY (RLS)
CREATE SCHEMA IF NOT EXISTS app;--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::uuid;
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.is_platform_context()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(current_setting('app.is_platform_context', true) = 'true', false);
$$;--> statement-breakpoint
