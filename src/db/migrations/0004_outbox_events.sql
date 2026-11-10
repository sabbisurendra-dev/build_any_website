-- 0004_outbox_events.sql
-- Phase 3: Transactional outbox table for dual-write protection, asynchronous event publishing,
-- RLS enforcement, app_runtime role grants, and allocation_status enum extension.

DO $$
BEGIN
  ALTER TYPE "public"."allocation_status" ADD VALUE IF NOT EXISTS 'consumed';
  ALTER TYPE "public"."allocation_status" ADD VALUE IF NOT EXISTS 'cancelled';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "outbox_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "event_type" varchar(120) NOT NULL,
  "aggregate_type" varchar(80) NOT NULL,
  "aggregate_id" varchar(120) NOT NULL,
  "payload" jsonb NOT NULL,
  "idempotency_key" varchar(160) NOT NULL,
  "status" varchar(32) DEFAULT 'pending' NOT NULL,
  "retry_count" integer DEFAULT 0 NOT NULL,
  "last_error" text,
  "published_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_outbox_events_tenant_idem" ON "outbox_events" ("tenant_id", "idempotency_key");
CREATE INDEX IF NOT EXISTS "idx_outbox_events_status_created" ON "outbox_events" ("status", "created_at");
CREATE INDEX IF NOT EXISTS "idx_outbox_events_tenant_created" ON "outbox_events" ("tenant_id", "created_at");

-- Enable & Force Row Level Security
ALTER TABLE "outbox_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outbox_events" FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'outbox_events' AND policyname = 'tenant_isolation_outbox_events'
  ) THEN
    CREATE POLICY "tenant_isolation_outbox_events" ON "outbox_events"
      FOR ALL
      USING (
        app.is_platform_context() OR
        tenant_id = app.current_tenant_id()
      )
      WITH CHECK (
        app.is_platform_context() OR
        tenant_id = app.current_tenant_id()
      );
  END IF;
END $$;

-- Grant app_runtime permissions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "outbox_events" TO app_runtime;
  END IF;
END $$;
