import type { PaymentProvider } from '@/types/domain';

export interface IncomingWebhookEnvelope {
  readonly provider: Exclude<PaymentProvider, 'manual'>;
  readonly providerEventId: string; // e.g. Razorpay `x-razorpay-event-id` header
  readonly signatureHeader: string;
  readonly rawBody: string;
}

export interface WebhookProcessResult {
  readonly status: 'processed' | 'duplicate_ignored' | 'unhandled_event_ignored';
  readonly eventType: string;
}

/**
 * Idempotent Payment Webhook Processor Contract.
 *
 * Processing Sequence:
 * 1. Verify cryptographic HMAC signature over exact `rawBody` BEFORE JSON parsing;
 *    reject invalid signatures with HTTP 401 (`PAYMENT_SIGNATURE_INVALID`).
 * 2. Insert into `payment_webhook_events` with `ON CONFLICT (provider, provider_event_id) DO NOTHING`.
 *    If 0 rows inserted and existing status is `'processed'`, return `'duplicate_ignored'` (HTTP 200).
 * 3. Inside `withPlatformTransaction`, lock target `payments` + `bookings` (`FOR UPDATE`),
 *    reconcile capture/failure/refund state transitions, and enqueue confirmation notifications.
 */
export interface PaymentWebhookProcessorPort {
  processIncomingWebhook(envelope: IncomingWebhookEnvelope): Promise<WebhookProcessResult>;
}
