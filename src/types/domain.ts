/**
 * Core cross-module domain primitives and shared enumerations.
 * Monetary values are ALWAYS stored and computed as integer minor units
 * (e.g., INR paise: Rs 499.00 => 49900) to avoid IEEE-754 floating-point drift.
 */

export type UUID = string;
export type MinorCurrencyAmount = number;
export type CurrencyCode = 'INR' | 'USD' | 'AED' | 'SGD' | 'GBP';
export type IanaTimezone = string; // Default for Indian SMBs: 'Asia/Kolkata'

export const USER_ROLES = [
  'platform_super_admin',
  'internal_configurator',
  'client_manager',
  'business_owner',
  'business_staff',
  'end_customer',
] as const;

export type SystemRoleKey = (typeof USER_ROLES)[number];

export const BUSINESS_VERTICALS = [
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
] as const;

export type BusinessVertical = (typeof BUSINESS_VERTICALS)[number];

export const CATALOGUE_ITEM_TYPES = [
  'physical_product',
  'bookable_resource',
  'service_appointment',
  'capacity_session',
  'digital_content',
  'subscription_plan',
  'bundle',
] as const;

export type CatalogueItemType = (typeof CATALOGUE_ITEM_TYPES)[number];

export const CATALOGUE_ITEM_STATUSES = [
  'draft',
  'dormant',
  'active',
  'unavailable',
  'ready_to_upgrade',
  'archived',
] as const;

export type CatalogueItemStatus = (typeof CATALOGUE_ITEM_STATUSES)[number];

export const FULFILMENT_TYPES = [
  'physical_delivery',
  'store_pickup',
  'time_slot_reservation',
  'session_seat',
  'digital_instant_access',
  'recurring_entitlement',
  'composite',
] as const;

export type FulfilmentType = (typeof FULFILMENT_TYPES)[number];

export const BILLING_MODELS = [
  'one_time',
  'time_slot',
  'fixed_duration_access',
  'recurring_subscription',
  'usage_pack',
] as const;

export type BillingModel = (typeof BILLING_MODELS)[number];

export const ORDER_STATUSES = [
  'draft',
  'awaiting_payment',
  'confirmed',
  'partially_fulfilled',
  'fulfilled',
  'cancelled',
  'refunded',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const FULFILMENT_STATUSES = [
  'pending',
  'packed',
  'ready_for_pickup',
  'out_for_delivery',
  'in_transit',
  'delivered',
  'picked_up',
  'failed_delivery',
  'returned',
] as const;

export type FulfilmentStatus = (typeof FULFILMENT_STATUSES)[number];

export const ENTITLEMENT_TYPES = [
  'digital_content_access',
  'time_slot_access',
  'session_attendance',
  'membership_access',
  'usage_credit_pack',
] as const;

export type EntitlementType = (typeof ENTITLEMENT_TYPES)[number];

export const ENTITLEMENT_STATUSES = [
  'pending',
  'active',
  'ready_to_upgrade',
  'upgraded',
  'exhausted',
  'expired',
  'suspended',
  'revoked',
] as const;

export type EntitlementStatus = (typeof ENTITLEMENT_STATUSES)[number];

export const CUSTOMER_SUBSCRIPTION_STATUSES = [
  'trialing',
  'active',
  'past_due',
  'cancel_at_period_end',
  'cancelled',
  'expired',
  'paused',
] as const;

export type CustomerSubscriptionStatus = (typeof CUSTOMER_SUBSCRIPTION_STATUSES)[number];

export const BOOKING_MODELS = [
  'exclusive_resource', // Model A: Football turfs, badminton/tennis/box cricket courts
  'staff_appointment', // Model B: Doctors, clinics, salons, consultants
  'capacity_session', // Model C: Yoga classes, group fitness, workshops
] as const;

export type BookingModel = (typeof BOOKING_MODELS)[number];

export const BOOKING_STATUSES = [
  'temporarily_held',
  'pending_payment',
  'confirmed',
  'cancelled',
  'expired',
  'completed',
  'no_show',
  'refund_pending',
  'refunded',
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const HOLD_STATUSES = ['active', 'converted', 'expired', 'released'] as const;
export type HoldStatus = (typeof HOLD_STATUSES)[number];

export const ALLOCATION_STATUSES = ['active', 'released'] as const;
export type AllocationStatus = (typeof ALLOCATION_STATUSES)[number];

export const PAYMENT_PROVIDERS = [
  'simulated',
  'razorpay',
  'cashfree',
  'stripe',
  'manual',
] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export const PAYMENT_STATUSES = [
  'created',
  'authorized',
  'captured',
  'failed',
  'captured_requires_refund',
  'refunded',
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const NOTIFICATION_CHANNELS = ['email', 'whatsapp', 'sms'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export interface TenantContext {
  readonly tenantId: UUID;
  readonly tenantSlug: string;
  readonly defaultTimezone: IanaTimezone;
  readonly defaultCurrency: CurrencyCode;
}

export interface PaginationParams {
  readonly cursor?: string;
  readonly limit?: number;
}

export interface PaginatedResult<T> {
  readonly items: readonly T[];
  readonly nextCursor: string | null;
}
