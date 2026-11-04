import type { NotificationChannel, UUID } from '@/types/domain';

export type NotificationTemplateKey =
  | 'booking.confirmed'
  | 'booking.cancelled'
  | 'booking.rescheduled'
  | 'booking.reminder_24h'
  | 'payment.refund_initiated'
  | 'tenant.member_invited';

export interface EnqueueNotificationInput {
  readonly tenantId: UUID;
  readonly bookingId?: UUID;
  readonly customerId?: UUID;
  readonly channel: NotificationChannel; // 'email' active in MVP; 'whatsapp' | 'sms' pluggable
  readonly templateKey: NotificationTemplateKey;
  readonly recipient: string;
  readonly idempotencyKey: string;
  readonly payload: Record<string, unknown>;
}

/**
 * Multi-channel notification port.
 * MVP dispatches transactional emails (Resend / SES) while recording outbox entries
 * in `notifications` so WhatsApp Business API & SMS adapters plug in without domain changes.
 */
export interface NotificationDispatcherPort {
  enqueue(input: EnqueueNotificationInput): Promise<{ notificationId: UUID }>;
  deliverQueuedBatch(limit?: number): Promise<{ sentCount: number; failedCount: number }>;
}
