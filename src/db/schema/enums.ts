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
  'retail_grocery',
  'electronics_retail',
  'edtech_courses',
  'digital_membership',
  'universal_commerce',
]);

export const catalogueItemTypeEnum = pgEnum('catalogue_item_type', [
  'physical_product',
  'bookable_resource',
  'service_appointment',
  'capacity_session',
  'digital_content',
  'subscription_plan',
  'bundle',
]);

export const catalogueItemStatusEnum = pgEnum('catalogue_item_status', [
  'draft',
  'dormant',
  'active',
  'unavailable',
  'ready_to_upgrade',
  'archived',
]);

export const fulfilmentTypeEnum = pgEnum('fulfilment_type', [
  'physical_delivery',
  'store_pickup',
  'time_slot_reservation',
  'session_seat',
  'digital_instant_access',
  'recurring_entitlement',
  'composite',
]);

export const billingModelEnum = pgEnum('billing_model', [
  'one_time',
  'time_slot',
  'fixed_duration_access',
  'recurring_subscription',
  'usage_pack',
]);

export const orderStatusEnum = pgEnum('order_status', [
  'draft',
  'awaiting_payment',
  'confirmed',
  'partially_fulfilled',
  'fulfilled',
  'cancelled',
  'refunded',
]);

export const orderLineStatusEnum = pgEnum('order_line_status', [
  'pending',
  'reserved',
  'confirmed',
  'fulfilled',
  'cancelled',
  'refunded',
]);

export const inventoryReservationStatusEnum = pgEnum('inventory_reservation_status', [
  'active',
  'committed',
  'released',
  'expired',
]);

export const inventoryMovementTypeEnum = pgEnum('inventory_movement_type', [
  'restock',
  'sale_commit',
  'return_restock',
  'manual_adjustment',
  'damage_writeoff',
]);

export const fulfilmentMethodEnum = pgEnum('fulfilment_method', [
  'local_delivery',
  'courier_shipment',
  'store_pickup',
]);

export const fulfilmentStatusEnum = pgEnum('fulfilment_status', [
  'pending',
  'packed',
  'ready_for_pickup',
  'out_for_delivery',
  'in_transit',
  'delivered',
  'picked_up',
  'failed_delivery',
  'returned',
]);

export const entitlementTypeEnum = pgEnum('entitlement_type', [
  'digital_content_access',
  'time_slot_access',
  'session_attendance',
  'membership_access',
  'usage_credit_pack',
]);

export const entitlementStatusEnum = pgEnum('entitlement_status', [
  'pending',
  'active',
  'ready_to_upgrade',
  'upgraded',
  'exhausted',
  'expired',
  'suspended',
  'revoked',
]);

export const customerSubscriptionStatusEnum = pgEnum('customer_subscription_status', [
  'trialing',
  'active',
  'past_due',
  'cancel_at_period_end',
  'cancelled',
  'expired',
  'paused',
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
