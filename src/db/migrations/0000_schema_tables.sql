CREATE EXTENSION IF NOT EXISTS pgcrypto;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
CREATE TYPE "public"."allocation_status" AS ENUM('active', 'released');--> statement-breakpoint
CREATE TYPE "public"."billing_interval" AS ENUM('monthly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."billing_model" AS ENUM('one_time', 'time_slot', 'fixed_duration_access', 'recurring_subscription', 'usage_pack');--> statement-breakpoint
CREATE TYPE "public"."booking_model" AS ENUM('exclusive_resource', 'staff_appointment', 'capacity_session');--> statement-breakpoint
CREATE TYPE "public"."booking_payment_status" AS ENUM('unpaid', 'pending', 'partially_paid', 'paid', 'refund_pending', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('temporarily_held', 'pending_payment', 'confirmed', 'cancelled', 'expired', 'completed', 'no_show', 'refund_pending', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."business_vertical" AS ENUM('sports_turf', 'racquet_court', 'clinic_healthcare', 'salon_beauty', 'fitness_yoga', 'general_appointment', 'retail_grocery', 'electronics_retail', 'edtech_courses', 'digital_membership', 'universal_commerce');--> statement-breakpoint
CREATE TYPE "public"."catalogue_item_status" AS ENUM('draft', 'dormant', 'active', 'unavailable', 'ready_to_upgrade', 'archived');--> statement-breakpoint
CREATE TYPE "public"."catalogue_item_type" AS ENUM('physical_product', 'bookable_resource', 'service_appointment', 'capacity_session', 'digital_content', 'subscription_plan', 'bundle');--> statement-breakpoint
CREATE TYPE "public"."customer_subscription_status" AS ENUM('trialing', 'active', 'past_due', 'cancel_at_period_end', 'cancelled', 'expired', 'paused');--> statement-breakpoint
CREATE TYPE "public"."entitlement_status" AS ENUM('pending', 'active', 'ready_to_upgrade', 'upgraded', 'exhausted', 'expired', 'suspended', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."entitlement_type" AS ENUM('digital_content_access', 'time_slot_access', 'session_attendance', 'membership_access', 'usage_credit_pack');--> statement-breakpoint
CREATE TYPE "public"."fulfilment_method" AS ENUM('local_delivery', 'courier_shipment', 'store_pickup');--> statement-breakpoint
CREATE TYPE "public"."fulfilment_status" AS ENUM('pending', 'packed', 'ready_for_pickup', 'out_for_delivery', 'in_transit', 'delivered', 'picked_up', 'failed_delivery', 'returned');--> statement-breakpoint
CREATE TYPE "public"."fulfilment_type" AS ENUM('physical_delivery', 'store_pickup', 'time_slot_reservation', 'session_seat', 'digital_instant_access', 'recurring_entitlement', 'composite');--> statement-breakpoint
CREATE TYPE "public"."gateway_environment" AS ENUM('simulated', 'sandbox', 'live');--> statement-breakpoint
CREATE TYPE "public"."hold_status" AS ENUM('active', 'converted', 'expired', 'released');--> statement-breakpoint
CREATE TYPE "public"."inventory_movement_type" AS ENUM('restock', 'sale_commit', 'return_restock', 'manual_adjustment', 'damage_writeoff');--> statement-breakpoint
CREATE TYPE "public"."inventory_reservation_status" AS ENUM('active', 'committed', 'released', 'expired');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('invited', 'active', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('email', 'whatsapp', 'sms');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('queued', 'sent', 'delivered', 'failed');--> statement-breakpoint
CREATE TYPE "public"."order_line_status" AS ENUM('pending', 'reserved', 'confirmed', 'fulfilled', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('draft', 'awaiting_payment', 'confirmed', 'partially_fulfilled', 'fulfilled', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."page_type" AS ENUM('home', 'services', 'booking', 'about', 'contact', 'custom');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('upi', 'card', 'netbanking', 'wallet', 'cash', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."payment_provider" AS ENUM('simulated', 'razorpay', 'cashfree', 'stripe', 'manual');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('created', 'authorized', 'captured', 'failed', 'captured_requires_refund', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('pending', 'processed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."role_scope" AS ENUM('platform', 'tenant');--> statement-breakpoint
CREATE TYPE "public"."schedule_target_type" AS ENUM('location', 'resource', 'staff');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('scheduled', 'cancelled', 'completed');--> statement-breakpoint
CREATE TYPE "public"."subscription_plan" AS ENUM('starter', 'growth', 'pro', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."tenant_status" AS ENUM('onboarding', 'active', 'suspended', 'archived');--> statement-breakpoint
CREATE TYPE "public"."webhook_processing_status" AS ENUM('received', 'processing', 'processed', 'ignored', 'failed');--> statement-breakpoint
CREATE TYPE "public"."website_status" AS ENUM('draft', 'published', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."aicos_agent_run_status" AS ENUM('queued', 'running', 'succeeded', 'failed', 'aborted');--> statement-breakpoint
CREATE TYPE "public"."aicos_approval_status" AS ENUM('pending', 'approved', 'rejected', 'changes_requested', 'invalidated', 'expired');--> statement-breakpoint
CREATE TYPE "public"."aicos_autonomy_mode" AS ENUM('manual_only', 'guarded', 'high_autonomy');--> statement-breakpoint
CREATE TYPE "public"."aicos_decision_status" AS ENUM('active', 'superseded', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."aicos_deliverable_type" AS ENUM('prd', 'research_report', 'architecture_proposal', 'ux_design_spec', 'engineering_implementation', 'antigravity_handoff_bundle', 'pull_request_summary', 'qa_verification_report', 'legal_compliance_memo', 'growth_analytics_plan', 'executive_report');--> statement-breakpoint
CREATE TYPE "public"."aicos_department_code" AS ENUM('ceo_office', 'product', 'cto_arch', 'engineering', 'design_ux', 'qa_testing', 'business_research', 'marketing_growth', 'data_analytics', 'legal_compliance');--> statement-breakpoint
CREATE TYPE "public"."aicos_execution_cycle_status" AS ENUM('initializing', 'planning', 'awaiting_clarification', 'running_discovery', 'awaiting_approval', 'executing_authorised', 'verifying_qa', 'paused', 'completed', 'partially_completed', 'blocked', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."aicos_execution_mode" AS ENUM('in_process_specialist', 'isolated_worktree', 'antigravity_sdk', 'external_handoff');--> statement-breakpoint
CREATE TYPE "public"."aicos_founder_request_status" AS ENUM('received', 'clarification_needed', 'planned', 'executing', 'completed', 'superseded', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."aicos_knowledge_category" AS ENUM('product', 'technical', 'decision', 'execution', 'department');--> statement-breakpoint
CREATE TYPE "public"."aicos_quality_check_status" AS ENUM('pending', 'passed', 'failed', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."aicos_request_classification" AS ENUM('question_explanation', 'research_request', 'product_feedback', 'new_feature', 'feature_modification', 'bug_defect', 'design_change', 'architecture_change', 'technical_debt', 'performance_issue', 'security_issue', 'business_strategy', 'roadmap_reprioritisation', 'emergency_incident', 'approval_rejection', 'continue_autonomous_work', 'general_instruction');--> statement-breakpoint
CREATE TYPE "public"."aicos_risk_level" AS ENUM('low', 'medium', 'high', 'prohibited');--> statement-breakpoint
CREATE TYPE "public"."aicos_task_status" AS ENUM('new', 'planned', 'approval_pending', 'approved', 'in_progress', 'awaiting_external_handoff', 'review', 'qa', 'completed', 'blocked', 'rejected', 'cancelled', 'failed', 'superseded');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"actor_user_id" uuid,
	"actor_role" varchar(64) NOT NULL,
	"action" varchar(120) NOT NULL,
	"entity_type" varchar(64) NOT NULL,
	"entity_id" varchar(128) NOT NULL,
	"ip_address" varchar(64),
	"user_agent" text,
	"changes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"legal_name" varchar(200),
	"display_name" varchar(160) NOT NULL,
	"tagline" varchar(240),
	"description" text,
	"support_email" varchar(255),
	"support_phone" varchar(24),
	"whatsapp_number" varchar(24),
	"gstin" varchar(20),
	"logo_url" text,
	"social_links" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"booking_policies" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"slug" varchar(80) NOT NULL,
	"name" varchar(160) NOT NULL,
	"address_line1" varchar(255) NOT NULL,
	"address_line2" varchar(255),
	"city" varchar(100) NOT NULL,
	"state" varchar(100) NOT NULL,
	"postal_code" varchar(20) NOT NULL,
	"country_code" varchar(2) DEFAULT 'IN' NOT NULL,
	"timezone" varchar(64) DEFAULT 'Asia/Kolkata' NOT NULL,
	"latitude" numeric(9, 6),
	"longitude" numeric(9, 6),
	"phone" varchar(24),
	"google_maps_url" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(96) NOT NULL,
	"module" varchar(48) NOT NULL,
	"description" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"key" varchar(64) NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text,
	"scope" "role_scope" NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"plan_code" "subscription_plan" DEFAULT 'starter' NOT NULL,
	"status" "subscription_status" DEFAULT 'trialing' NOT NULL,
	"billing_interval" "billing_interval" DEFAULT 'monthly' NOT NULL,
	"setup_fee_minor" integer DEFAULT 0 NOT NULL,
	"recurring_amount_minor" integer DEFAULT 0 NOT NULL,
	"provider_subscription_id" varchar(128),
	"entitlements" jsonb NOT NULL,
	"trial_ends_at" timestamp with time zone,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"status" "membership_status" DEFAULT 'active' NOT NULL,
	"invited_by_user_id" uuid,
	"joined_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_onboarding_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"step_key" varchar(64) NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"duration_seconds" integer,
	"completed_by_user_id" uuid
);
--> statement-breakpoint
CREATE TABLE "tenant_payment_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider" "payment_provider" DEFAULT 'simulated' NOT NULL,
	"environment" "gateway_environment" DEFAULT 'simulated' NOT NULL,
	"public_key_id" varchar(160),
	"secret_vault_ref" varchar(255),
	"webhook_secret_vault_ref" varchar(255),
	"merchant_account_id" varchar(128),
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(80) NOT NULL,
	"name" varchar(160) NOT NULL,
	"vertical" "business_vertical" NOT NULL,
	"status" "tenant_status" DEFAULT 'onboarding' NOT NULL,
	"default_currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" varchar(255),
	"phone" varchar(24),
	"full_name" varchar(160) NOT NULL,
	"avatar_url" text,
	"platform_role" varchar(40),
	"is_active" boolean DEFAULT true NOT NULL,
	"last_sign_in_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_layouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"page_id" uuid NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"draft_revision" integer DEFAULT 1 NOT NULL,
	"sections_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_by_user_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"website_id" uuid NOT NULL,
	"slug" varchar(120) NOT NULL,
	"path" varchar(200) NOT NULL,
	"title" varchar(160) NOT NULL,
	"page_type" "page_type" DEFAULT 'custom' NOT NULL,
	"seo_meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_published_enabled" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(80) NOT NULL,
	"name" varchar(160) NOT NULL,
	"vertical" "business_vertical" NOT NULL,
	"description" text,
	"thumbnail_url" text,
	"theme_preset" jsonb NOT NULL,
	"pages_blueprint" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "website_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"website_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"release_notes" varchar(280),
	"theme_snapshot" jsonb NOT NULL,
	"pages_snapshot" jsonb NOT NULL,
	"published_by_user_id" uuid,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "websites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"primary_location_id" uuid,
	"source_template_id" uuid,
	"name" varchar(160) NOT NULL,
	"subdomain" varchar(80) NOT NULL,
	"custom_domain" varchar(255),
	"custom_domain_verified" boolean DEFAULT false NOT NULL,
	"status" "website_status" DEFAULT 'draft' NOT NULL,
	"theme_config" jsonb NOT NULL,
	"seo_defaults" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"published_version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "widget_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(96) NOT NULL,
	"name" varchar(120) NOT NULL,
	"category" varchar(64) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"default_col_span" integer DEFAULT 12 NOT NULL,
	"default_row_span" integer DEFAULT 6 NOT NULL,
	"min_col_span" integer DEFAULT 3 NOT NULL,
	"min_row_span" integer DEFAULT 2 NOT NULL,
	"config_json_schema" jsonb NOT NULL,
	"is_booking_aware" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "availability_exceptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"target_type" "schedule_target_type" NOT NULL,
	"resource_id" uuid,
	"staff_member_id" uuid,
	"exception_date" date NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"is_unavailable" boolean DEFAULT true NOT NULL,
	"reason" varchar(240),
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "availability_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"target_type" "schedule_target_type" NOT NULL,
	"resource_id" uuid,
	"staff_member_id" uuid,
	"day_of_week" smallint NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"spans_midnight" boolean DEFAULT false NOT NULL,
	"effective_from" date,
	"effective_until" date,
	"price_override_minor" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"staff_member_id" uuid,
	"resource_id" uuid,
	"title" varchar(160) NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"max_capacity" integer NOT NULL,
	"booked_count" integer DEFAULT 0 NOT NULL,
	"held_count" integer DEFAULT 0 NOT NULL,
	"waitlist_capacity" integer DEFAULT 0 NOT NULL,
	"waitlist_count" integer DEFAULT 0 NOT NULL,
	"price_minor" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"status" "session_status" DEFAULT 'scheduled' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"slug" varchar(80) NOT NULL,
	"name" varchar(160) NOT NULL,
	"resource_type" varchar(64) NOT NULL,
	"description" text,
	"image_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"slot_duration_minutes" integer DEFAULT 60 NOT NULL,
	"min_duration_minutes" integer DEFAULT 60 NOT NULL,
	"max_duration_minutes" integer DEFAULT 180 NOT NULL,
	"slot_step_minutes" integer DEFAULT 30 NOT NULL,
	"buffer_before_minutes" integer DEFAULT 0 NOT NULL,
	"buffer_after_minutes" integer DEFAULT 0 NOT NULL,
	"base_price_minor" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"pricing_rules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"location_id" uuid,
	"slug" varchar(80) NOT NULL,
	"name" varchar(160) NOT NULL,
	"category" varchar(80),
	"description" text,
	"booking_model" "booking_model" NOT NULL,
	"duration_minutes" integer NOT NULL,
	"slot_step_minutes" integer DEFAULT 15 NOT NULL,
	"buffer_before_minutes" integer DEFAULT 0 NOT NULL,
	"buffer_after_minutes" integer DEFAULT 0 NOT NULL,
	"price_minor" integer NOT NULL,
	"deposit_minor" integer,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"min_notice_minutes" integer DEFAULT 30 NOT NULL,
	"max_advance_days" integer DEFAULT 30 NOT NULL,
	"cancellation_cutoff_minutes" integer DEFAULT 120 NOT NULL,
	"requires_staff_selection" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"user_id" uuid,
	"display_name" varchar(160) NOT NULL,
	"title" varchar(120),
	"bio" text,
	"avatar_url" text,
	"is_bookable" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"staff_member_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"custom_duration_minutes" integer,
	"custom_price_minor" integer
);
--> statement-breakpoint
CREATE TABLE "booking_holds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"hold_token" varchar(96) NOT NULL,
	"idempotency_key" varchar(128) NOT NULL,
	"status" "hold_status" DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"converted_at" timestamp with time zone,
	"released_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"service_id" uuid,
	"resource_id" uuid,
	"staff_member_id" uuid,
	"session_id" uuid,
	"quantity" integer DEFAULT 1 NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"buffer_starts_at" timestamp with time zone NOT NULL,
	"buffer_ends_at" timestamp with time zone NOT NULL,
	"allocation_status" "allocation_status" DEFAULT 'active' NOT NULL,
	"unit_price_minor" integer NOT NULL,
	"total_price_minor" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"from_status" "booking_status",
	"to_status" "booking_status" NOT NULL,
	"actor_user_id" uuid,
	"actor_type" varchar(32) NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"booking_number" varchar(32) NOT NULL,
	"booking_model" "booking_model" NOT NULL,
	"status" "booking_status" DEFAULT 'temporarily_held' NOT NULL,
	"payment_status" "booking_payment_status" DEFAULT 'unpaid' NOT NULL,
	"idempotency_key" varchar(128) NOT NULL,
	"subtotal_minor" integer NOT NULL,
	"discount_minor" integer DEFAULT 0 NOT NULL,
	"tax_minor" integer DEFAULT 0 NOT NULL,
	"total_minor" integer NOT NULL,
	"amount_paid_minor" integer DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"coupon_code" varchar(40),
	"customer_snapshot" jsonb NOT NULL,
	"customer_notes" text,
	"internal_notes" text,
	"cancellation_reason" text,
	"rescheduled_from_booking_id" uuid,
	"confirmed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"full_name" varchar(160) NOT NULL,
	"phone" varchar(24) NOT NULL,
	"email" varchar(255),
	"notes" text,
	"marketing_opt_in" boolean DEFAULT false NOT NULL,
	"total_bookings_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"booking_id" uuid,
	"customer_id" uuid,
	"channel" "notification_channel" NOT NULL,
	"template_key" varchar(96) NOT NULL,
	"recipient" varchar(255) NOT NULL,
	"payload" jsonb NOT NULL,
	"provider_message_id" varchar(160),
	"idempotency_key" varchar(128) NOT NULL,
	"status" "notification_status" DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"provider_event_id" varchar(160) NOT NULL,
	"event_type" varchar(96) NOT NULL,
	"tenant_id" uuid,
	"signature_verified" boolean DEFAULT false NOT NULL,
	"payload" jsonb NOT NULL,
	"processing_status" "webhook_processing_status" DEFAULT 'received' NOT NULL,
	"error_message" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"provider_order_id" varchar(128) NOT NULL,
	"provider_payment_id" varchar(128),
	"idempotency_key" varchar(128) NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"method" "payment_method" DEFAULT 'unknown' NOT NULL,
	"status" "payment_status" DEFAULT 'created' NOT NULL,
	"provider_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"payment_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"provider_refund_id" varchar(128),
	"idempotency_key" varchar(128) NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"reason" varchar(240) NOT NULL,
	"status" "refund_status" DEFAULT 'pending' NOT NULL,
	"initiated_by_user_id" uuid,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(180) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"domain_vertical" varchar(80) DEFAULT 'universal_commerce' NOT NULL,
	"flag_1" varchar(100),
	"flag_2" varchar(100),
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalogue_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"business_unit_id" uuid,
	"location_id" uuid,
	"category_id" uuid,
	"item_type" "catalogue_item_type" NOT NULL,
	"fulfilment_type" "fulfilment_type" NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(160) NOT NULL,
	"sku" varchar(100),
	"short_description" varchar(500),
	"description" text,
	"flag_1" varchar(100),
	"flag_2" varchar(100),
	"status" "catalogue_item_status" DEFAULT 'active' NOT NULL,
	"base_price_minor" integer DEFAULT 0 NOT NULL,
	"compare_at_price_minor" integer,
	"currency" char(3) DEFAULT 'INR' NOT NULL,
	"tax_rate_bps" integer DEFAULT 0 NOT NULL,
	"resource_id" uuid,
	"service_id" uuid,
	"access_duration_days" integer,
	"max_capacity_or_units" integer,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"business_unit_id" uuid,
	"parent_id" uuid,
	"name" varchar(140) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"catalogue_item_id" uuid NOT NULL,
	"price_plan_id" uuid,
	"customer_name" varchar(180) NOT NULL,
	"customer_phone" varchar(40) NOT NULL,
	"customer_email" varchar(255),
	"status" "customer_subscription_status" DEFAULT 'active' NOT NULL,
	"current_period_start" timestamp with time zone NOT NULL,
	"current_period_end" timestamp with time zone NOT NULL,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "digital_contents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"catalogue_item_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"content_type" varchar(64) DEFAULT 'video_lesson' NOT NULL,
	"asset_url_or_key" text NOT NULL,
	"duration_minutes" integer DEFAULT 15 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_preview_free" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entitlement_usages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"entitlement_id" uuid NOT NULL,
	"action" varchar(64) DEFAULT 'access_verified' NOT NULL,
	"quantity_consumed" integer DEFAULT 1 NOT NULL,
	"consumed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entitlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"business_unit_id" uuid,
	"order_id" uuid,
	"order_line_id" uuid,
	"catalogue_item_id" uuid NOT NULL,
	"subscription_id" uuid,
	"booking_id" uuid,
	"customer_name" varchar(180) NOT NULL,
	"customer_phone" varchar(40) NOT NULL,
	"customer_email" varchar(255),
	"entitlement_type" "entitlement_type" NOT NULL,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_until" timestamp with time zone,
	"max_usage_count" integer,
	"consumed_usage_count" integer DEFAULT 0 NOT NULL,
	"status" "entitlement_status" DEFAULT 'active' NOT NULL,
	"flag_1" varchar(100),
	"flag_2" varchar(100),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fulfilments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"order_line_id" uuid NOT NULL,
	"method" "fulfilment_method" DEFAULT 'local_delivery' NOT NULL,
	"status" "fulfilment_status" DEFAULT 'pending' NOT NULL,
	"tracking_number" varchar(120),
	"delivery_slot_start" timestamp with time zone,
	"delivery_slot_end" timestamp with time zone,
	"recipient_address" text,
	"dispatched_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"catalogue_item_id" uuid NOT NULL,
	"variant_id" uuid,
	"location_id" uuid,
	"quantity_on_hand" integer DEFAULT 0 NOT NULL,
	"quantity_reserved" integer DEFAULT 0 NOT NULL,
	"low_stock_threshold" integer DEFAULT 5 NOT NULL,
	"allow_backorder" boolean DEFAULT false NOT NULL,
	"unit_label" varchar(40) DEFAULT 'unit' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"inventory_item_id" uuid NOT NULL,
	"movement_type" "inventory_movement_type" NOT NULL,
	"delta_quantity" integer NOT NULL,
	"reference_id" varchar(120),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"inventory_item_id" uuid NOT NULL,
	"order_id" uuid,
	"quantity" integer NOT NULL,
	"status" "inventory_reservation_status" DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"idempotency_key" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"catalogue_item_id" uuid NOT NULL,
	"variant_id" uuid,
	"price_plan_id" uuid,
	"item_type" "catalogue_item_type" NOT NULL,
	"fulfilment_type" "fulfilment_type" NOT NULL,
	"title_snapshot" varchar(255) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price_minor" integer NOT NULL,
	"line_total_minor" integer NOT NULL,
	"reservation_ref_id" uuid,
	"booking_id" uuid,
	"line_status" "order_line_status" DEFAULT 'pending' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"business_unit_id" uuid,
	"order_number" varchar(40) NOT NULL,
	"customer_id" uuid,
	"customer_name" varchar(180) NOT NULL,
	"customer_phone" varchar(40) NOT NULL,
	"customer_email" varchar(255),
	"status" "order_status" DEFAULT 'awaiting_payment' NOT NULL,
	"payment_status" varchar(32) DEFAULT 'unpaid' NOT NULL,
	"subtotal_minor" integer DEFAULT 0 NOT NULL,
	"tax_minor" integer DEFAULT 0 NOT NULL,
	"total_minor" integer DEFAULT 0 NOT NULL,
	"currency" char(3) DEFAULT 'INR' NOT NULL,
	"shipping_address" jsonb,
	"idempotency_key" varchar(120) NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"catalogue_item_id" uuid NOT NULL,
	"variant_id" uuid,
	"name" varchar(160) NOT NULL,
	"billing_model" "billing_model" NOT NULL,
	"price_minor" integer NOT NULL,
	"currency" char(3) DEFAULT 'INR' NOT NULL,
	"access_duration_days" integer,
	"billing_interval" "billing_interval",
	"included_usage_units" integer,
	"upgrade_target_plan_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"catalogue_item_id" uuid NOT NULL,
	"sku" varchar(100) NOT NULL,
	"name" varchar(200) NOT NULL,
	"option_values" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"price_override_minor" integer,
	"weight_grams" integer,
	"track_inventory" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aicos_agent_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"execution_cycle_id" uuid,
	"sender_role" varchar(40) NOT NULL,
	"sender_label" varchar(120) NOT NULL,
	"message_type" varchar(48) NOT NULL,
	"content_markdown" text NOT NULL,
	"structured_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aicos_agent_model_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"work_type" varchar(100) NOT NULL,
	"reasoning_tier" varchar(64) NOT NULL,
	"primary_provider" varchar(64) NOT NULL,
	"primary_model" varchar(120) NOT NULL,
	"fallback_provider" varchar(64) NOT NULL,
	"fallback_model" varchar(120) NOT NULL,
	"max_tokens_budget" integer DEFAULT 32000 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aicos_agent_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"execution_cycle_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"department_code" "aicos_department_code" NOT NULL,
	"provider" varchar(64) NOT NULL,
	"model" varchar(120) NOT NULL,
	"status" "aicos_agent_run_status" DEFAULT 'queued' NOT NULL,
	"context_summary" text NOT NULL,
	"tool_calls_executed" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"structured_output" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error_category" varchar(64),
	"error_detail" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "aicos_agent_tool_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"tool_name" varchar(120) NOT NULL,
	"permission_mode" varchar(32) DEFAULT 'allow' NOT NULL,
	"scope_constraint" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aicos_agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"department_id" uuid NOT NULL,
	"role_key" varchar(100) NOT NULL,
	"display_name" varchar(140) NOT NULL,
	"system_instructions" text NOT NULL,
	"max_subagent_depth" integer DEFAULT 1 NOT NULL,
	"max_retries" integer DEFAULT 2 NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aicos_approval_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"approval_id" uuid NOT NULL,
	"actor_role" varchar(48) NOT NULL,
	"actor_identity" varchar(140) NOT NULL,
	"event_type" varchar(48) NOT NULL,
	"proposal_version" integer NOT NULL,
	"proposal_hash" varchar(128) NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aicos_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"execution_cycle_id" uuid NOT NULL,
	"task_id" uuid,
	"requesting_department" "aicos_department_code" NOT NULL,
	"title" varchar(240) NOT NULL,
	"proposal_version" integer DEFAULT 1 NOT NULL,
	"proposal_hash" varchar(128) NOT NULL,
	"risk_level" "aicos_risk_level" NOT NULL,
	"ceo_recommendation" text NOT NULL,
	"reason_for_approval" text NOT NULL,
	"affected_components" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"expected_benefit" text NOT NULL,
	"potential_downside" text NOT NULL,
	"alternatives_considered" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"estimated_cost_minor" integer DEFAULT 0 NOT NULL,
	"estimated_duration_minutes" integer DEFAULT 15 NOT NULL,
	"rollback_plan" text NOT NULL,
	"exact_scope" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "aicos_approval_status" DEFAULT 'pending' NOT NULL,
	"capability_token" varchar(255),
	"decided_by" varchar(120),
	"decided_at" timestamp with time zone,
	"decision_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aicos_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"execution_cycle_id" uuid,
	"task_id" uuid,
	"actor_type" varchar(48) NOT NULL,
	"actor_id" varchar(120) NOT NULL,
	"event_type" varchar(80) NOT NULL,
	"summary" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aicos_checkpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"execution_cycle_id" uuid NOT NULL,
	"task_id" uuid,
	"milestone_key" varchar(100) NOT NULL,
	"summary" text NOT NULL,
	"state_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"git_commit_sha" varchar(64),
	"is_recoverable" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aicos_company_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(180) NOT NULL,
	"founder_name" varchar(140) DEFAULT 'Human Founder & Chairman' NOT NULL,
	"autonomy_mode" "aicos_autonomy_mode" DEFAULT 'guarded' NOT NULL,
	"global_kill_switch_active" boolean DEFAULT false NOT NULL,
	"max_delegation_depth" integer DEFAULT 2 NOT NULL,
	"max_parallel_agents" integer DEFAULT 4 NOT NULL,
	"operating_principles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aicos_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" varchar(240) NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aicos_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"execution_cycle_id" uuid,
	"approval_id" uuid,
	"code" varchar(48) NOT NULL,
	"title" varchar(240) NOT NULL,
	"category" varchar(64) NOT NULL,
	"origin" varchar(80) NOT NULL,
	"summary" text NOT NULL,
	"rationale" text NOT NULL,
	"alternatives_considered" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "aicos_decision_status" DEFAULT 'active' NOT NULL,
	"superseded_by_decision_id" uuid,
	"authorised_by" varchar(140) NOT NULL,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aicos_deliverables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"execution_cycle_id" uuid NOT NULL,
	"task_id" uuid,
	"department_code" "aicos_department_code" NOT NULL,
	"deliverable_type" "aicos_deliverable_type" NOT NULL,
	"title" varchar(240) NOT NULL,
	"summary" text NOT NULL,
	"content_markdown" text NOT NULL,
	"structured_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"artifact_path" varchar(500),
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aicos_departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_profile_id" uuid NOT NULL,
	"code" "aicos_department_code" NOT NULL,
	"name" varchar(140) NOT NULL,
	"mandate" text NOT NULL,
	"responsibilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"permission_boundaries" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aicos_execution_cycles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"founder_request_id" uuid NOT NULL,
	"cycle_code" varchar(40) NOT NULL,
	"objective" text NOT NULL,
	"business_rationale" text NOT NULL,
	"expected_outcome" text NOT NULL,
	"scope_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"out_of_scope_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"overall_risk_level" "aicos_risk_level" DEFAULT 'low' NOT NULL,
	"status" "aicos_execution_cycle_status" DEFAULT 'initializing' NOT NULL,
	"plan_version" integer DEFAULT 1 NOT NULL,
	"plan_hash" varchar(128) NOT NULL,
	"departments_involved" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"budget_limit_minor" integer DEFAULT 250000 NOT NULL,
	"cost_spent_minor" integer DEFAULT 0 NOT NULL,
	"executive_report_id" uuid,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paused_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aicos_founder_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"raw_message" text NOT NULL,
	"classification" "aicos_request_classification" NOT NULL,
	"status" "aicos_founder_request_status" DEFAULT 'received' NOT NULL,
	"ceo_interpretation" text NOT NULL,
	"clarification_needed" boolean DEFAULT false NOT NULL,
	"clarification_questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aicos_github_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"execution_cycle_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"ref_type" varchar(40) NOT NULL,
	"ref_identifier" varchar(255) NOT NULL,
	"url_or_path" varchar(500) NOT NULL,
	"base_branch" varchar(80) DEFAULT 'main' NOT NULL,
	"base_sha" varchar(64),
	"head_sha" varchar(64),
	"status" varchar(48) DEFAULT 'created' NOT NULL,
	"files_changed" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aicos_knowledge_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"slug" varchar(140) NOT NULL,
	"title" varchar(240) NOT NULL,
	"category" "aicos_knowledge_category" NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"current_version" integer DEFAULT 1 NOT NULL,
	"content_markdown" text NOT NULL,
	"source_files" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_by" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aicos_knowledge_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"change_summary" text NOT NULL,
	"content_markdown" text NOT NULL,
	"authorised_by" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aicos_model_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"execution_cycle_id" uuid,
	"agent_run_id" uuid,
	"provider" varchar(64) NOT NULL,
	"model" varchar(120) NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"estimated_cost_minor" integer DEFAULT 0 NOT NULL,
	"currency" char(3) DEFAULT 'INR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aicos_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"execution_cycle_id" uuid,
	"category" varchar(64) NOT NULL,
	"severity" varchar(32) DEFAULT 'info' NOT NULL,
	"title" varchar(240) NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aicos_policy_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"rule_code" varchar(80) NOT NULL,
	"name" varchar(180) NOT NULL,
	"description" text NOT NULL,
	"action_category" varchar(80) NOT NULL,
	"path_patterns" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"risk_level" "aicos_risk_level" NOT NULL,
	"requires_founder_approval" boolean DEFAULT false NOT NULL,
	"is_hard_prohibited" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aicos_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_profile_id" uuid NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"repository_url" varchar(500) NOT NULL,
	"default_branch" varchar(80) DEFAULT 'main' NOT NULL,
	"workspace_path" varchar(500) NOT NULL,
	"autonomy_mode" "aicos_autonomy_mode" DEFAULT 'guarded' NOT NULL,
	"monthly_budget_minor" integer DEFAULT 5000000 NOT NULL,
	"spent_budget_minor" integer DEFAULT 0 NOT NULL,
	"currency" char(3) DEFAULT 'INR' NOT NULL,
	"status" varchar(40) DEFAULT 'active' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aicos_quality_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"execution_cycle_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"reviewer_agent_id" uuid,
	"reviewer_provider_model" varchar(140) NOT NULL,
	"check_type" varchar(64) NOT NULL,
	"status" "aicos_quality_check_status" DEFAULT 'pending' NOT NULL,
	"commands_executed" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"criteria_results" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"defects_raised" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aicos_task_dependencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"depends_on_task_id" uuid NOT NULL,
	"dependency_type" varchar(40) DEFAULT 'blocking' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aicos_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"execution_cycle_id" uuid NOT NULL,
	"code" varchar(40) NOT NULL,
	"title" varchar(240) NOT NULL,
	"objective" text NOT NULL,
	"stage" varchar(40) DEFAULT 'discovery' NOT NULL,
	"department_code" "aicos_department_code" NOT NULL,
	"assigned_agent_id" uuid,
	"risk_level" "aicos_risk_level" DEFAULT 'low' NOT NULL,
	"requires_approval" boolean DEFAULT false NOT NULL,
	"approval_id" uuid,
	"execution_mode" "aicos_execution_mode" DEFAULT 'in_process_specialist' NOT NULL,
	"status" "aicos_task_status" DEFAULT 'new' NOT NULL,
	"relevant_files" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"constraints" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"acceptance_criteria" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"blocker_reason" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"max_retries" integer DEFAULT 2 NOT NULL,
	"estimated_cost_minor" integer DEFAULT 500 NOT NULL,
	"actual_cost_minor" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_onboarding_steps" ADD CONSTRAINT "tenant_onboarding_steps_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_onboarding_steps" ADD CONSTRAINT "tenant_onboarding_steps_completed_by_user_id_users_id_fk" FOREIGN KEY ("completed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_payment_configs" ADD CONSTRAINT "tenant_payment_configs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_layouts" ADD CONSTRAINT "page_layouts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_layouts" ADD CONSTRAINT "page_layouts_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_layouts" ADD CONSTRAINT "page_layouts_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_versions" ADD CONSTRAINT "website_versions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_versions" ADD CONSTRAINT "website_versions_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_versions" ADD CONSTRAINT "website_versions_published_by_user_id_users_id_fk" FOREIGN KEY ("published_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websites" ADD CONSTRAINT "websites_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websites" ADD CONSTRAINT "websites_primary_location_id_locations_id_fk" FOREIGN KEY ("primary_location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websites" ADD CONSTRAINT "websites_source_template_id_templates_id_fk" FOREIGN KEY ("source_template_id") REFERENCES "public"."templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websites" ADD CONSTRAINT "websites_published_version_id_website_versions_id_fk" FOREIGN KEY ("published_version_id") REFERENCES "public"."website_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_exceptions" ADD CONSTRAINT "availability_exceptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_exceptions" ADD CONSTRAINT "availability_exceptions_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_exceptions" ADD CONSTRAINT "availability_exceptions_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_exceptions" ADD CONSTRAINT "availability_exceptions_staff_member_id_staff_members_id_fk" FOREIGN KEY ("staff_member_id") REFERENCES "public"."staff_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_exceptions" ADD CONSTRAINT "availability_exceptions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_staff_member_id_staff_members_id_fk" FOREIGN KEY ("staff_member_id") REFERENCES "public"."staff_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_sessions" ADD CONSTRAINT "booking_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_sessions" ADD CONSTRAINT "booking_sessions_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_sessions" ADD CONSTRAINT "booking_sessions_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_sessions" ADD CONSTRAINT "booking_sessions_staff_member_id_staff_members_id_fk" FOREIGN KEY ("staff_member_id") REFERENCES "public"."staff_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_sessions" ADD CONSTRAINT "booking_sessions_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_services" ADD CONSTRAINT "staff_services_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_services" ADD CONSTRAINT "staff_services_staff_member_id_staff_members_id_fk" FOREIGN KEY ("staff_member_id") REFERENCES "public"."staff_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_services" ADD CONSTRAINT "staff_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_holds" ADD CONSTRAINT "booking_holds_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_holds" ADD CONSTRAINT "booking_holds_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_staff_member_id_staff_members_id_fk" FOREIGN KEY ("staff_member_id") REFERENCES "public"."staff_members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_session_id_booking_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."booking_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_rescheduled_from_booking_id_bookings_id_fk" FOREIGN KEY ("rescheduled_from_booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_webhook_events" ADD CONSTRAINT "payment_webhook_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_initiated_by_user_id_users_id_fk" FOREIGN KEY ("initiated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_units" ADD CONSTRAINT "business_units_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalogue_items" ADD CONSTRAINT "catalogue_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalogue_items" ADD CONSTRAINT "catalogue_items_business_unit_id_business_units_id_fk" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalogue_items" ADD CONSTRAINT "catalogue_items_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalogue_items" ADD CONSTRAINT "catalogue_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalogue_items" ADD CONSTRAINT "catalogue_items_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalogue_items" ADD CONSTRAINT "catalogue_items_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_business_unit_id_business_units_id_fk" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_subscriptions" ADD CONSTRAINT "customer_subscriptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_subscriptions" ADD CONSTRAINT "customer_subscriptions_catalogue_item_id_catalogue_items_id_fk" FOREIGN KEY ("catalogue_item_id") REFERENCES "public"."catalogue_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_subscriptions" ADD CONSTRAINT "customer_subscriptions_price_plan_id_price_plans_id_fk" FOREIGN KEY ("price_plan_id") REFERENCES "public"."price_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_contents" ADD CONSTRAINT "digital_contents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_contents" ADD CONSTRAINT "digital_contents_catalogue_item_id_catalogue_items_id_fk" FOREIGN KEY ("catalogue_item_id") REFERENCES "public"."catalogue_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlement_usages" ADD CONSTRAINT "entitlement_usages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlement_usages" ADD CONSTRAINT "entitlement_usages_entitlement_id_entitlements_id_fk" FOREIGN KEY ("entitlement_id") REFERENCES "public"."entitlements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_business_unit_id_business_units_id_fk" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_order_line_id_order_lines_id_fk" FOREIGN KEY ("order_line_id") REFERENCES "public"."order_lines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_catalogue_item_id_catalogue_items_id_fk" FOREIGN KEY ("catalogue_item_id") REFERENCES "public"."catalogue_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_subscription_id_customer_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."customer_subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfilments" ADD CONSTRAINT "fulfilments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfilments" ADD CONSTRAINT "fulfilments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfilments" ADD CONSTRAINT "fulfilments_order_line_id_order_lines_id_fk" FOREIGN KEY ("order_line_id") REFERENCES "public"."order_lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_catalogue_item_id_catalogue_items_id_fk" FOREIGN KEY ("catalogue_item_id") REFERENCES "public"."catalogue_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_catalogue_item_id_catalogue_items_id_fk" FOREIGN KEY ("catalogue_item_id") REFERENCES "public"."catalogue_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_price_plan_id_price_plans_id_fk" FOREIGN KEY ("price_plan_id") REFERENCES "public"."price_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_business_unit_id_business_units_id_fk" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_plans" ADD CONSTRAINT "price_plans_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_plans" ADD CONSTRAINT "price_plans_catalogue_item_id_catalogue_items_id_fk" FOREIGN KEY ("catalogue_item_id") REFERENCES "public"."catalogue_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_plans" ADD CONSTRAINT "price_plans_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_catalogue_item_id_catalogue_items_id_fk" FOREIGN KEY ("catalogue_item_id") REFERENCES "public"."catalogue_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_agent_messages" ADD CONSTRAINT "aicos_agent_messages_project_id_aicos_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."aicos_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_agent_messages" ADD CONSTRAINT "aicos_agent_messages_conversation_id_aicos_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."aicos_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_agent_messages" ADD CONSTRAINT "aicos_agent_messages_execution_cycle_id_aicos_execution_cycles_id_fk" FOREIGN KEY ("execution_cycle_id") REFERENCES "public"."aicos_execution_cycles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_agent_model_configs" ADD CONSTRAINT "aicos_agent_model_configs_agent_id_aicos_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."aicos_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_agent_runs" ADD CONSTRAINT "aicos_agent_runs_project_id_aicos_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."aicos_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_agent_runs" ADD CONSTRAINT "aicos_agent_runs_execution_cycle_id_aicos_execution_cycles_id_fk" FOREIGN KEY ("execution_cycle_id") REFERENCES "public"."aicos_execution_cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_agent_runs" ADD CONSTRAINT "aicos_agent_runs_task_id_aicos_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."aicos_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_agent_runs" ADD CONSTRAINT "aicos_agent_runs_agent_id_aicos_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."aicos_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_agent_tool_permissions" ADD CONSTRAINT "aicos_agent_tool_permissions_agent_id_aicos_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."aicos_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_agents" ADD CONSTRAINT "aicos_agents_department_id_aicos_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."aicos_departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_approval_events" ADD CONSTRAINT "aicos_approval_events_project_id_aicos_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."aicos_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_approval_events" ADD CONSTRAINT "aicos_approval_events_approval_id_aicos_approvals_id_fk" FOREIGN KEY ("approval_id") REFERENCES "public"."aicos_approvals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_approvals" ADD CONSTRAINT "aicos_approvals_project_id_aicos_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."aicos_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_approvals" ADD CONSTRAINT "aicos_approvals_execution_cycle_id_aicos_execution_cycles_id_fk" FOREIGN KEY ("execution_cycle_id") REFERENCES "public"."aicos_execution_cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_approvals" ADD CONSTRAINT "aicos_approvals_task_id_aicos_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."aicos_tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_audit_logs" ADD CONSTRAINT "aicos_audit_logs_project_id_aicos_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."aicos_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_checkpoints" ADD CONSTRAINT "aicos_checkpoints_project_id_aicos_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."aicos_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_checkpoints" ADD CONSTRAINT "aicos_checkpoints_execution_cycle_id_aicos_execution_cycles_id_fk" FOREIGN KEY ("execution_cycle_id") REFERENCES "public"."aicos_execution_cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_checkpoints" ADD CONSTRAINT "aicos_checkpoints_task_id_aicos_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."aicos_tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_conversations" ADD CONSTRAINT "aicos_conversations_project_id_aicos_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."aicos_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_decisions" ADD CONSTRAINT "aicos_decisions_project_id_aicos_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."aicos_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_decisions" ADD CONSTRAINT "aicos_decisions_execution_cycle_id_aicos_execution_cycles_id_fk" FOREIGN KEY ("execution_cycle_id") REFERENCES "public"."aicos_execution_cycles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_decisions" ADD CONSTRAINT "aicos_decisions_approval_id_aicos_approvals_id_fk" FOREIGN KEY ("approval_id") REFERENCES "public"."aicos_approvals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_deliverables" ADD CONSTRAINT "aicos_deliverables_project_id_aicos_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."aicos_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_deliverables" ADD CONSTRAINT "aicos_deliverables_execution_cycle_id_aicos_execution_cycles_id_fk" FOREIGN KEY ("execution_cycle_id") REFERENCES "public"."aicos_execution_cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_deliverables" ADD CONSTRAINT "aicos_deliverables_task_id_aicos_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."aicos_tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_departments" ADD CONSTRAINT "aicos_departments_company_profile_id_aicos_company_profiles_id_fk" FOREIGN KEY ("company_profile_id") REFERENCES "public"."aicos_company_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_execution_cycles" ADD CONSTRAINT "aicos_execution_cycles_project_id_aicos_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."aicos_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_execution_cycles" ADD CONSTRAINT "aicos_execution_cycles_conversation_id_aicos_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."aicos_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_execution_cycles" ADD CONSTRAINT "aicos_execution_cycles_founder_request_id_aicos_founder_requests_id_fk" FOREIGN KEY ("founder_request_id") REFERENCES "public"."aicos_founder_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_founder_requests" ADD CONSTRAINT "aicos_founder_requests_project_id_aicos_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."aicos_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_founder_requests" ADD CONSTRAINT "aicos_founder_requests_conversation_id_aicos_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."aicos_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_github_references" ADD CONSTRAINT "aicos_github_references_project_id_aicos_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."aicos_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_github_references" ADD CONSTRAINT "aicos_github_references_execution_cycle_id_aicos_execution_cycles_id_fk" FOREIGN KEY ("execution_cycle_id") REFERENCES "public"."aicos_execution_cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_github_references" ADD CONSTRAINT "aicos_github_references_task_id_aicos_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."aicos_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_knowledge_documents" ADD CONSTRAINT "aicos_knowledge_documents_project_id_aicos_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."aicos_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_knowledge_versions" ADD CONSTRAINT "aicos_knowledge_versions_project_id_aicos_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."aicos_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_knowledge_versions" ADD CONSTRAINT "aicos_knowledge_versions_document_id_aicos_knowledge_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."aicos_knowledge_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_model_usage" ADD CONSTRAINT "aicos_model_usage_project_id_aicos_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."aicos_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_model_usage" ADD CONSTRAINT "aicos_model_usage_execution_cycle_id_aicos_execution_cycles_id_fk" FOREIGN KEY ("execution_cycle_id") REFERENCES "public"."aicos_execution_cycles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_model_usage" ADD CONSTRAINT "aicos_model_usage_agent_run_id_aicos_agent_runs_id_fk" FOREIGN KEY ("agent_run_id") REFERENCES "public"."aicos_agent_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_notifications" ADD CONSTRAINT "aicos_notifications_project_id_aicos_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."aicos_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_notifications" ADD CONSTRAINT "aicos_notifications_execution_cycle_id_aicos_execution_cycles_id_fk" FOREIGN KEY ("execution_cycle_id") REFERENCES "public"."aicos_execution_cycles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_policy_rules" ADD CONSTRAINT "aicos_policy_rules_project_id_aicos_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."aicos_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_projects" ADD CONSTRAINT "aicos_projects_company_profile_id_aicos_company_profiles_id_fk" FOREIGN KEY ("company_profile_id") REFERENCES "public"."aicos_company_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_quality_checks" ADD CONSTRAINT "aicos_quality_checks_project_id_aicos_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."aicos_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_quality_checks" ADD CONSTRAINT "aicos_quality_checks_execution_cycle_id_aicos_execution_cycles_id_fk" FOREIGN KEY ("execution_cycle_id") REFERENCES "public"."aicos_execution_cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_quality_checks" ADD CONSTRAINT "aicos_quality_checks_task_id_aicos_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."aicos_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_quality_checks" ADD CONSTRAINT "aicos_quality_checks_reviewer_agent_id_aicos_agents_id_fk" FOREIGN KEY ("reviewer_agent_id") REFERENCES "public"."aicos_agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_task_dependencies" ADD CONSTRAINT "aicos_task_dependencies_project_id_aicos_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."aicos_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_task_dependencies" ADD CONSTRAINT "aicos_task_dependencies_task_id_aicos_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."aicos_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_task_dependencies" ADD CONSTRAINT "aicos_task_dependencies_depends_on_task_id_aicos_tasks_id_fk" FOREIGN KEY ("depends_on_task_id") REFERENCES "public"."aicos_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_tasks" ADD CONSTRAINT "aicos_tasks_project_id_aicos_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."aicos_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_tasks" ADD CONSTRAINT "aicos_tasks_execution_cycle_id_aicos_execution_cycles_id_fk" FOREIGN KEY ("execution_cycle_id") REFERENCES "public"."aicos_execution_cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aicos_tasks" ADD CONSTRAINT "aicos_tasks_assigned_agent_id_aicos_agents_id_fk" FOREIGN KEY ("assigned_agent_id") REFERENCES "public"."aicos_agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_logs_tenant_created" ON "audit_logs" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_entity" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_actor" ON "audit_logs" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_business_profiles_tenant" ON "business_profiles" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_locations_tenant_slug" ON "locations" USING btree ("tenant_id","slug");--> statement-breakpoint
CREATE INDEX "idx_locations_tenant_active" ON "locations" USING btree ("tenant_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_permissions_key" ON "permissions" USING btree ("key");--> statement-breakpoint
CREATE INDEX "idx_roles_tenant_key" ON "roles" USING btree ("tenant_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_subscriptions_tenant" ON "subscriptions" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_tenant_memberships_tenant_user" ON "tenant_memberships" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_tenant_memberships_user" ON "tenant_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_tenant_onboarding_step" ON "tenant_onboarding_steps" USING btree ("tenant_id","step_key");--> statement-breakpoint
CREATE INDEX "idx_tenant_onboarding_tenant" ON "tenant_onboarding_steps" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_tenant_payment_configs_tenant" ON "tenant_payment_configs" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_tenants_slug" ON "tenants" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_tenants_status" ON "tenants" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_users_phone" ON "users" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_page_layouts_page" ON "page_layouts" USING btree ("page_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_pages_website_path" ON "pages" USING btree ("website_id","path");--> statement-breakpoint
CREATE INDEX "idx_pages_tenant_website" ON "pages" USING btree ("tenant_id","website_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_templates_key" ON "templates" USING btree ("key");--> statement-breakpoint
CREATE INDEX "idx_templates_vertical_active" ON "templates" USING btree ("vertical","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_website_versions_website_ver" ON "website_versions" USING btree ("website_id","version_number");--> statement-breakpoint
CREATE INDEX "idx_website_versions_tenant_website" ON "website_versions" USING btree ("tenant_id","website_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_websites_subdomain" ON "websites" USING btree ("subdomain");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_websites_custom_domain" ON "websites" USING btree ("custom_domain");--> statement-breakpoint
CREATE INDEX "idx_websites_tenant" ON "websites" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_widget_definitions_type" ON "widget_definitions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_availability_exceptions_lookup" ON "availability_exceptions" USING btree ("tenant_id","location_id","exception_date");--> statement-breakpoint
CREATE INDEX "idx_availability_rules_lookup" ON "availability_rules" USING btree ("tenant_id","location_id","target_type","day_of_week");--> statement-breakpoint
CREATE INDEX "idx_availability_rules_resource" ON "availability_rules" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "idx_availability_rules_staff" ON "availability_rules" USING btree ("staff_member_id");--> statement-breakpoint
CREATE INDEX "idx_booking_sessions_tenant_window" ON "booking_sessions" USING btree ("tenant_id","location_id","starts_at");--> statement-breakpoint
CREATE INDEX "idx_booking_sessions_service_starts" ON "booking_sessions" USING btree ("service_id","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_resources_location_slug" ON "resources" USING btree ("location_id","slug");--> statement-breakpoint
CREATE INDEX "idx_resources_tenant_location_active" ON "resources" USING btree ("tenant_id","location_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_services_tenant_slug" ON "services" USING btree ("tenant_id","slug");--> statement-breakpoint
CREATE INDEX "idx_services_tenant_model_active" ON "services" USING btree ("tenant_id","booking_model","is_active");--> statement-breakpoint
CREATE INDEX "idx_staff_members_tenant_location" ON "staff_members" USING btree ("tenant_id","location_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_staff_members_user" ON "staff_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_staff_services_pair" ON "staff_services" USING btree ("staff_member_id","service_id");--> statement-breakpoint
CREATE INDEX "idx_staff_services_tenant_service" ON "staff_services" USING btree ("tenant_id","service_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_booking_holds_booking" ON "booking_holds" USING btree ("booking_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_booking_holds_token" ON "booking_holds" USING btree ("hold_token");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_booking_holds_tenant_idempotency" ON "booking_holds" USING btree ("tenant_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_booking_holds_active_expiry" ON "booking_holds" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "idx_booking_items_booking" ON "booking_items" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "idx_booking_items_resource_window" ON "booking_items" USING btree ("resource_id","allocation_status","buffer_starts_at","buffer_ends_at");--> statement-breakpoint
CREATE INDEX "idx_booking_items_staff_window" ON "booking_items" USING btree ("staff_member_id","allocation_status","buffer_starts_at","buffer_ends_at");--> statement-breakpoint
CREATE INDEX "idx_booking_items_session" ON "booking_items" USING btree ("session_id","allocation_status");--> statement-breakpoint
CREATE INDEX "idx_booking_items_tenant_starts" ON "booking_items" USING btree ("tenant_id","starts_at");--> statement-breakpoint
CREATE INDEX "idx_booking_status_history_booking" ON "booking_status_history" USING btree ("booking_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_bookings_tenant_number" ON "bookings" USING btree ("tenant_id","booking_number");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_bookings_tenant_idempotency" ON "bookings" USING btree ("tenant_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_bookings_tenant_status_created" ON "bookings" USING btree ("tenant_id","status","created_at");--> statement-breakpoint
CREATE INDEX "idx_bookings_customer" ON "bookings" USING btree ("tenant_id","customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_customers_tenant_phone" ON "customers" USING btree ("tenant_id","phone");--> statement-breakpoint
CREATE INDEX "idx_customers_tenant_email" ON "customers" USING btree ("tenant_id","email");--> statement-breakpoint
CREATE INDEX "idx_customers_user" ON "customers" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_notifications_tenant_idempotency" ON "notifications" USING btree ("tenant_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_notifications_status_created" ON "notifications" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_payment_webhook_provider_event" ON "payment_webhook_events" USING btree ("provider","provider_event_id");--> statement-breakpoint
CREATE INDEX "idx_payment_webhook_status_received" ON "payment_webhook_events" USING btree ("processing_status","received_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_payments_provider_order" ON "payments" USING btree ("provider","provider_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_payments_provider_payment" ON "payments" USING btree ("provider","provider_payment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_payments_tenant_idempotency" ON "payments" USING btree ("tenant_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_payments_booking" ON "payments" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "idx_payments_tenant_status_created" ON "payments" USING btree ("tenant_id","status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_refunds_provider_id" ON "refunds" USING btree ("provider_refund_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_refunds_tenant_idempotency" ON "refunds" USING btree ("tenant_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_refunds_payment" ON "refunds" USING btree ("payment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_business_units_tenant_slug" ON "business_units" USING btree ("tenant_id","slug");--> statement-breakpoint
CREATE INDEX "idx_business_units_tenant" ON "business_units" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_catalogue_items_tenant_slug" ON "catalogue_items" USING btree ("tenant_id","slug");--> statement-breakpoint
CREATE INDEX "idx_catalogue_items_tenant_type_status" ON "catalogue_items" USING btree ("tenant_id","item_type","status");--> statement-breakpoint
CREATE INDEX "idx_catalogue_items_tenant_flags" ON "catalogue_items" USING btree ("tenant_id","flag_1","flag_2");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_categories_tenant_slug" ON "categories" USING btree ("tenant_id","slug");--> statement-breakpoint
CREATE INDEX "idx_categories_tenant_parent" ON "categories" USING btree ("tenant_id","parent_id");--> statement-breakpoint
CREATE INDEX "idx_customer_subscriptions_tenant_status" ON "customer_subscriptions" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_digital_contents_item" ON "digital_contents" USING btree ("tenant_id","catalogue_item_id");--> statement-breakpoint
CREATE INDEX "idx_entitlement_usages_entitlement" ON "entitlement_usages" USING btree ("tenant_id","entitlement_id");--> statement-breakpoint
CREATE INDEX "idx_entitlements_tenant_customer" ON "entitlements" USING btree ("tenant_id","customer_phone","status");--> statement-breakpoint
CREATE INDEX "idx_entitlements_window" ON "entitlements" USING btree ("tenant_id","valid_from","valid_until");--> statement-breakpoint
CREATE INDEX "idx_fulfilments_order" ON "fulfilments" USING btree ("tenant_id","order_id","status");--> statement-breakpoint
CREATE INDEX "idx_inventory_items_tenant_item" ON "inventory_items" USING btree ("tenant_id","catalogue_item_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_movements_item" ON "inventory_movements" USING btree ("tenant_id","inventory_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_inventory_reservations_idem" ON "inventory_reservations" USING btree ("tenant_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_inventory_reservations_expiry" ON "inventory_reservations" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "idx_order_lines_order" ON "order_lines" USING btree ("tenant_id","order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_orders_tenant_number" ON "orders" USING btree ("tenant_id","order_number");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_orders_tenant_idem" ON "orders" USING btree ("tenant_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_orders_tenant_status" ON "orders" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_price_plans_item" ON "price_plans" USING btree ("tenant_id","catalogue_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_product_variants_tenant_sku" ON "product_variants" USING btree ("tenant_id","sku");--> statement-breakpoint
CREATE INDEX "idx_product_variants_item" ON "product_variants" USING btree ("catalogue_item_id");--> statement-breakpoint
CREATE INDEX "idx_aicos_messages_conv" ON "aicos_agent_messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_aicos_model_configs_agent" ON "aicos_agent_model_configs" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_aicos_agent_runs_task" ON "aicos_agent_runs" USING btree ("task_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_aicos_agent_tool" ON "aicos_agent_tool_permissions" USING btree ("agent_id","tool_name");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_aicos_agents_role_key" ON "aicos_agents" USING btree ("role_key");--> statement-breakpoint
CREATE INDEX "idx_aicos_approval_events_approval" ON "aicos_approval_events" USING btree ("approval_id");--> statement-breakpoint
CREATE INDEX "idx_aicos_approvals_project_status" ON "aicos_approvals" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "idx_aicos_approvals_hash" ON "aicos_approvals" USING btree ("proposal_hash");--> statement-breakpoint
CREATE INDEX "idx_aicos_audit_logs_project_time" ON "aicos_audit_logs" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_aicos_checkpoints_cycle" ON "aicos_checkpoints" USING btree ("execution_cycle_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_aicos_conversations_project" ON "aicos_conversations" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_aicos_decisions_project_status" ON "aicos_decisions" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "idx_aicos_deliverables_project_cycle" ON "aicos_deliverables" USING btree ("project_id","execution_cycle_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_aicos_departments_code" ON "aicos_departments" USING btree ("company_profile_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_aicos_cycles_project_code" ON "aicos_execution_cycles" USING btree ("project_id","cycle_code");--> statement-breakpoint
CREATE INDEX "idx_aicos_cycles_project_status" ON "aicos_execution_cycles" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "idx_aicos_founder_requests_project" ON "aicos_founder_requests" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "idx_aicos_github_refs_task" ON "aicos_github_references" USING btree ("task_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_aicos_knowledge_project_slug" ON "aicos_knowledge_documents" USING btree ("project_id","slug");--> statement-breakpoint
CREATE INDEX "idx_aicos_knowledge_versions_doc" ON "aicos_knowledge_versions" USING btree ("document_id","version_number");--> statement-breakpoint
CREATE INDEX "idx_aicos_model_usage_project" ON "aicos_model_usage" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_aicos_notifications_project_read" ON "aicos_notifications" USING btree ("project_id","is_read");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_aicos_policy_rules_code" ON "aicos_policy_rules" USING btree ("project_id","rule_code");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_aicos_projects_slug" ON "aicos_projects" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_aicos_quality_checks_task" ON "aicos_quality_checks" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_aicos_task_deps_task" ON "aicos_task_dependencies" USING btree ("task_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_aicos_tasks_cycle_code" ON "aicos_tasks" USING btree ("execution_cycle_id","code");--> statement-breakpoint
CREATE INDEX "idx_aicos_tasks_project_status" ON "aicos_tasks" USING btree ("project_id","status");