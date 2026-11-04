import { pgEnum } from 'drizzle-orm/pg-core';

export const tenantStatusEnum = pgEnum('tenant_status', [
  'onboarding',
  'active',
  'suspended',
  'archived',
]);

export const businessVerticalEnum = pgEnum('business_vertical', [
  'sports_turf',
  'racquet_court',
  'clinic_healthcare',
  'salon_beauty',
  'fitness_yoga',
  'general_appointment',
]);

export const roleScopeEnum = pgEnum('role_scope', ['platform', 'tenant']);

export const membershipStatusEnum = pgEnum('membership_status', [
  'invited',
  'active',
  'revoked',
]);

export const subscriptionPlanEnum = pgEnum('subscription_plan', [
  'starter',
  'growth',
  'pro',
  'enterprise',
]);

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'trialing',
  'active',
  'past_due',
  'cancelled',
]);

export const billingIntervalEnum = pgEnum('billing_interval', ['monthly', 'yearly']);

export const websiteStatusEnum = pgEnum('website_status', [
  'draft',
  'published',
  'suspended',
]);

export const pageTypeEnum = pgEnum('page_type', [
  'home',
  'services',
  'booking',
  'about',
  'contact',
  'custom',
]);

export const bookingModelEnum = pgEnum('booking_model', [
  'exclusive_resource',
  'staff_appointment',
  'capacity_session',
]);

export const scheduleTargetTypeEnum = pgEnum('schedule_target_type', [
  'location',
  'resource',
  'staff',
]);

export const sessionStatusEnum = pgEnum('session_status', [
  'scheduled',
  'cancelled',
  'completed',
]);

export const bookingStatusEnum = pgEnum('booking_status', [
  'temporarily_held',
  'pending_payment',
  'confirmed',
  'cancelled',
  'expired',
  'completed',
  'no_show',
  'refund_pending',
  'refunded',
]);

export const bookingPaymentStatusEnum = pgEnum('booking_payment_status', [
  'unpaid',
  'pending',
  'partially_paid',
  'paid',
  'refund_pending',
  'refunded',
]);

export const holdStatusEnum = pgEnum('hold_status', [
  'active',
  'converted',
  'expired',
  'released',
]);

export const allocationStatusEnum = pgEnum('allocation_status', ['active', 'released']);

export const paymentProviderEnum = pgEnum('payment_provider', [
  'simulated',
  'razorpay',
  'cashfree',
  'stripe',
  'manual',
]);

export const gatewayEnvironmentEnum = pgEnum('gateway_environment', [
  'simulated',
  'sandbox',
  'live',
]);

export const paymentMethodEnum = pgEnum('payment_method', [
  'upi',
  'card',
  'netbanking',
  'wallet',
  'cash',
  'unknown',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'created',
  'authorized',
  'captured',
  'failed',
  'captured_requires_refund',
  'refunded',
]);

export const refundStatusEnum = pgEnum('refund_status', [
  'pending',
  'processed',
  'failed',
]);

export const webhookProcessingStatusEnum = pgEnum('webhook_processing_status', [
  'received',
  'processing',
  'processed',
  'ignored',
  'failed',
]);

export const notificationChannelEnum = pgEnum('notification_channel', [
  'email',
  'whatsapp',
  'sms',
]);

export const notificationStatusEnum = pgEnum('notification_status', [
  'queued',
  'sent',
  'delivered',
  'failed',
]);
