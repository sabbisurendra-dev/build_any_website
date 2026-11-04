import { randomUUID } from 'node:crypto';
import type { UUID } from '@/types/domain';
import type {
  EnqueueNotificationInput,
  NotificationDispatcherPort,
} from './notification.port';

interface StoredNotification {
  notificationId: UUID;
  tenantId: UUID;
  channel: string;
  templateKey: string;
  recipient: string;
  idempotencyKey: string;
  status: 'queued' | 'sent' | 'failed';
  payload: Record<string, unknown>;
  createdAt: Date;
}

export class NotificationDispatcherImpl implements NotificationDispatcherPort {
  private static outbox: Map<string, StoredNotification> = new Map();
  private static seenIdempotencyKeys: Set<string> = new Set();

  public async enqueue(input: EnqueueNotificationInput): Promise<{ notificationId: UUID }> {
    // Deduplication check: ignore duplicate webhook notifications
    if (NotificationDispatcherImpl.seenIdempotencyKeys.has(input.idempotencyKey)) {
      const existing = Array.from(NotificationDispatcherImpl.outbox.values()).find(
        (n) => n.idempotencyKey === input.idempotencyKey,
      );
      if (existing) {
        return { notificationId: existing.notificationId };
      }
    }

    const notificationId = randomUUID();
    NotificationDispatcherImpl.seenIdempotencyKeys.add(input.idempotencyKey);

    const record: StoredNotification = {
      notificationId,
      tenantId: input.tenantId,
      channel: input.channel,
      templateKey: input.templateKey,
      recipient: input.recipient,
      idempotencyKey: input.idempotencyKey,
      status: 'queued',
      payload: input.payload,
      createdAt: new Date(),
    };

    NotificationDispatcherImpl.outbox.set(notificationId, record);
    return { notificationId };
  }

  public async deliverQueuedBatch(limit = 50): Promise<{ sentCount: number; failedCount: number }> {
    let sentCount = 0;
    let processed = 0;

    for (const record of NotificationDispatcherImpl.outbox.values()) {
      if (processed >= limit) break;
      if (record.status === 'queued') {
        record.status = 'sent';
        sentCount += 1;
        processed += 1;
      }
    }

    return { sentCount, failedCount: 0 };
  }

  public static getOutbox(): StoredNotification[] {
    return Array.from(NotificationDispatcherImpl.outbox.values());
  }

  public static resetForTests(): void {
    NotificationDispatcherImpl.outbox.clear();
    NotificationDispatcherImpl.seenIdempotencyKeys.clear();
  }
}
