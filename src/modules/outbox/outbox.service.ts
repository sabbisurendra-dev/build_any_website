import { randomUUID } from 'node:crypto';
import type { OutboxEventInput, OutboxEventRecord, OutboxRepositoryPort } from './outbox.types';
import { db } from '@/db';
import { outboxEvents } from '@/db/schema';
import { eq, inArray, asc } from 'drizzle-orm';
import type { UUID } from '@/types/domain';

export class PostgresOutboxRepository implements OutboxRepositoryPort {
  public async insertEvent(txOrDb: unknown, event: OutboxEventInput): Promise<OutboxEventRecord> {
    const client = (txOrDb && typeof (txOrDb as Record<string, unknown>).insert === 'function') ? (txOrDb as typeof db) : db;
    const id = randomUUID();

    const [row] = await client
      .insert(outboxEvents)
      .values({
        id,
        tenantId: event.tenantId,
        eventType: event.eventType,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        payload: event.payload,
        idempotencyKey: event.idempotencyKey,
        status: 'pending',
        retryCount: 0,
      })
      .onConflictDoNothing()
      .returning();

    if (!row) {
      // Idempotent duplicate: fetch existing
      const [existing] = await client
        .select()
        .from(outboxEvents)
        .where(eq(outboxEvents.idempotencyKey, event.idempotencyKey));

      if (existing) {
        return {
          id: existing.id,
          tenantId: existing.tenantId,
          eventType: existing.eventType,
          aggregateType: existing.aggregateType,
          aggregateId: existing.aggregateId,
          payload: existing.payload,
          idempotencyKey: existing.idempotencyKey,
          status: existing.status as 'pending' | 'published' | 'failed',
          retryCount: existing.retryCount,
          lastError: existing.lastError,
          publishedAt: existing.publishedAt,
          createdAt: existing.createdAt,
        };
      }
    }

    return {
      id: row?.id ?? id,
      tenantId: row?.tenantId ?? event.tenantId,
      eventType: row?.eventType ?? event.eventType,
      aggregateType: row?.aggregateType ?? event.aggregateType,
      aggregateId: row?.aggregateId ?? event.aggregateId,
      payload: row?.payload ?? event.payload,
      idempotencyKey: row?.idempotencyKey ?? event.idempotencyKey,
      status: (row?.status ?? 'pending') as 'pending' | 'published' | 'failed',
      retryCount: row?.retryCount ?? 0,
      lastError: row?.lastError,
      publishedAt: row?.publishedAt,
      createdAt: row?.createdAt ?? new Date(),
    };
  }

  public async fetchPendingEvents(limit = 50): Promise<OutboxEventRecord[]> {
    const rows = await db
      .select()
      .from(outboxEvents)
      .where(eq(outboxEvents.status, 'pending'))
      .orderBy(asc(outboxEvents.createdAt))
      .limit(limit);

    return rows.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      eventType: r.eventType,
      aggregateType: r.aggregateType,
      aggregateId: r.aggregateId,
      payload: r.payload,
      idempotencyKey: r.idempotencyKey,
      status: r.status as 'pending' | 'published' | 'failed',
      retryCount: r.retryCount,
      lastError: r.lastError,
      publishedAt: r.publishedAt,
      createdAt: r.createdAt,
    }));
  }

  public async markPublished(eventIds: string[]): Promise<void> {
    if (eventIds.length === 0) return;
    await db
      .update(outboxEvents)
      .set({
        status: 'published',
        publishedAt: new Date(),
      })
      .where(inArray(outboxEvents.id, eventIds));
  }

  public async markFailed(eventId: string, error: string): Promise<void> {
    await db
      .update(outboxEvents)
      .set({
        status: 'failed',
        lastError: error.slice(0, 500),
      })
      .where(eq(outboxEvents.id, eventId));
  }
}

export class InMemoryOutboxRepository implements OutboxRepositoryPort {
  private events: OutboxEventRecord[] = [];

  public async insertEvent(_tx: unknown, event: OutboxEventInput): Promise<OutboxEventRecord> {
    const existing = this.events.find(
      (e) => e.tenantId === event.tenantId && e.idempotencyKey === event.idempotencyKey,
    );
    if (existing) {
      return existing;
    }

    const record: OutboxEventRecord = {
      id: randomUUID(),
      tenantId: event.tenantId,
      eventType: event.eventType,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      payload: event.payload,
      idempotencyKey: event.idempotencyKey,
      status: 'pending',
      retryCount: 0,
      createdAt: new Date(),
    };

    this.events.push(record);
    return record;
  }

  public async fetchPendingEvents(limit = 50): Promise<OutboxEventRecord[]> {
    return this.events.filter((e) => e.status === 'pending').slice(0, limit);
  }

  public async markPublished(eventIds: string[]): Promise<void> {
    const set = new Set(eventIds);
    for (const e of this.events) {
      if (set.has(e.id)) {
        e.status = 'published';
        e.publishedAt = new Date();
      }
    }
  }

  public async markFailed(eventId: string, error: string): Promise<void> {
    const event = this.events.find((e) => e.id === eventId);
    if (event) {
      event.status = 'failed';
      event.lastError = error;
      event.retryCount += 1;
    }
  }

  public resetForTests(): void {
    this.events = [];
  }

  public getEvents(tenantId?: UUID): OutboxEventRecord[] {
    if (!tenantId) return [...this.events];
    return this.events.filter((e) => e.tenantId === tenantId);
  }
}

export class OutboxService {
  constructor(
    private readonly repository: OutboxRepositoryPort = new InMemoryOutboxRepository(),
    private readonly publisher?: (event: OutboxEventRecord) => Promise<void>,
  ) {}

  public async recordEvent(tx: unknown, event: OutboxEventInput): Promise<OutboxEventRecord> {
    return this.repository.insertEvent(tx, event);
  }

  public async pollAndPublishBatch(limit = 50): Promise<{ publishedCount: number; failedCount: number }> {
    const pending = await this.repository.fetchPendingEvents(limit);
    let publishedCount = 0;
    let failedCount = 0;
    const publishedIds: string[] = [];

    for (const event of pending) {
      try {
        if (this.publisher) {
          await this.publisher(event);
        }
        publishedIds.push(event.id);
        publishedCount += 1;
      } catch (err) {
        failedCount += 1;
        await this.repository.markFailed(
          event.id,
          err instanceof Error ? err.message : 'Publish error',
        );
      }
    }

    if (publishedIds.length > 0) {
      await this.repository.markPublished(publishedIds);
    }

    return { publishedCount, failedCount };
  }

  public getRepository(): OutboxRepositoryPort {
    return this.repository;
  }
}
