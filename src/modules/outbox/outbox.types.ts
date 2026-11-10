import type { UUID } from '@/types/domain';

export interface OutboxEventInput {
  tenantId: UUID;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
}

export interface OutboxEventRecord {
  id: UUID;
  tenantId: UUID;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  status: 'pending' | 'published' | 'failed';
  retryCount: number;
  lastError?: string | null;
  publishedAt?: Date | null;
  createdAt: Date;
}

export interface OutboxRepositoryPort {
  insertEvent(tx: unknown, event: OutboxEventInput): Promise<OutboxEventRecord>;
  fetchPendingEvents(limit?: number): Promise<OutboxEventRecord[]>;
  markPublished(eventIds: string[]): Promise<void>;
  markFailed(eventId: string, error: string): Promise<void>;
  resetForTests?(): void;
}
