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
] as const;

export type BusinessVertical = (typeof BUSINESS_VERTICALS)[number];

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
