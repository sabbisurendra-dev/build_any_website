import { randomUUID } from 'node:crypto';
import type { UUID } from '@/types/domain';
import type {
  EnqueueNotificationInput,
  NotificationDispatcherPort,
} from './notification.port';
import {
  RuntimeStateRepository,
  type RuntimeNotificationRecord,
} from '@/modules/persistence/runtime-store';

export class NotificationDispatcherImpl implements NotificationDispatcherPort {
  public async enqueue(input: EnqueueNotificationInput): Promise<{ notificationId: UUID }> {
    const state = RuntimeStateRepository.getState();

    // Deduplication check: ignore duplicate webhook or retry notifications
    const existing = state.notifications.find(
      (n) => n.tenantId === input.tenantId && n.idempotencyKey === input.idempotencyKey,
    );
    if (existing) {
      return { notificationId: existing.notificationId };
    }

    const notificationId = randomUUID();
    const record: RuntimeNotificationRecord = {
      notificationId,
      tenantId: input.tenantId,
      bookingId: input.bookingId,
      channel: input.channel,
      templateKey: input.templateKey,
      recipient: input.recipient,
      idempotencyKey: input.idempotencyKey,
      status: 'queued',
      payload: input.payload,
      createdAtIso: new Date().toISOString(),
    };

    state.notifications.unshift(record);
    RuntimeStateRepository.persist();

    return { notificationId };
  }

  public async deliverQueuedBatch(limit = 50): Promise<{ sentCount: number; failedCount: number }> {
    const state = RuntimeStateRepository.getState();
    let sentCount = 0;

    for (const record of state.notifications) {
      if (sentCount >= limit) break;
      if (record.status === 'queued') {
        record.status = 'sent';
        sentCount += 1;
      }
    }

    if (sentCount > 0) {
      RuntimeStateRepository.persist();
    }

    return { sentCount, failedCount: 0 };
  }

  public static getOutbox(tenantId?: UUID): RuntimeNotificationRecord[] {
    const state = RuntimeStateRepository.getState();
    if (!tenantId) return state.notifications;
    return state.notifications.filter((n) => n.tenantId === tenantId);
  }

  public static resetForTests(): void {
    const state = RuntimeStateRepository.getState();
    state.notifications = [];
  }
}
