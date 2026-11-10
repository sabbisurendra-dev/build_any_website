import { describe, it, expect, vi } from 'vitest';
import { PostgresBookingRepository } from '@/modules/booking/postgres-booking.repository';
import { PostgresCommerceRepository } from '@/modules/commerce/postgres-commerce.repository';
import {
  OutboxService,
  InMemoryOutboxRepository,
} from '@/modules/outbox/outbox.service';
import type { OutboxEventRecord } from '@/modules/outbox/outbox.types';
import {
  SlotUnavailableError,
  HoldExpiredError,
  InsufficientStockError,
} from '@/lib/errors';
import type { AppDatabase } from '@/db';

interface MockPgError extends Error {
  code?: string;
  constraint?: string;
}

function createMockDb(options: {
  tenant?: Record<string, unknown>;
  transactionError?: MockPgError;
  inventoryUpdateRows?: unknown[];
  bookingItemUpdateRows?: unknown[];
}) {
  const tenantRow = options.tenant ?? {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Kickoff Turf',
    slug: 'kickoff',
  };

  return {
    select: vi.fn().mockImplementation(() => ({
      from: vi.fn().mockImplementation((table: { _?: { name?: string }; id?: unknown }) => ({
        where: vi.fn().mockImplementation(() => ({
          limit: vi.fn().mockImplementation(async () => {
            // If selecting from tenants, return tenantRow
            if (table?._?.name === 'tenants' || table?.id) {
              return [tenantRow];
            }
            // For bookings / orders idempotency check, return empty
            return [];
          }),
        })),
      })),
    })),
    transaction: vi.fn().mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
      if (options.transactionError) {
        throw options.transactionError;
      }
      const mockTx = {
        execute: vi.fn().mockResolvedValue([]),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                {
                  id: 'item-milk-1',
                  tenantId: '11111111-1111-1111-1111-111111111111',
                  name: 'A2 Organic Milk 2L',
                  itemType: 'physical_product',
                  status: 'active',
                  basePriceMinor: 16000,
                  unitLabel: 'bottle',
                },
                {
                  id: 'ord-123',
                  tenantId: '11111111-1111-1111-1111-111111111111',
                  orderNumber: 'ORD-2026-101',
                  status: 'awaiting_payment',
                  paymentStatus: 'unpaid',
                  expiresAt: new Date(Date.now() + 100_000),
                },
                {
                  id: 'hold-1',
                  bookingId: 'bk-1',
                  holdToken: 'valid-token',
                  status: 'expired',
                  expiresAt: new Date(Date.now() - 60_000),
                },
              ]),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue(
                options.inventoryUpdateRows ?? options.bookingItemUpdateRows ?? [],
              ),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue([]),
        }),
      };
      return callback(mockTx);
    }),
  } as unknown as AppDatabase;
}

describe('Phase 3: Postgres Repositories & Transactional Error Handling', () => {
  describe('3.1 & 3.2: PostgresBookingRepository GiST & Concurrency Error Mapping', () => {
    it('translates Postgres GiST exclusion error (23P01) to 409 SlotUnavailableError', async () => {
      const pgError: MockPgError = new Error(
        'conflicting key value violates exclusion constraint "excl_booking_items_resource_overlap"',
      );
      pgError.code = '23P01';
      pgError.constraint = 'excl_booking_items_resource_overlap';

      const mockDb = createMockDb({ transactionError: pgError });
      const repo = new PostgresBookingRepository(mockDb);
      vi.spyOn(repo, 'findBookingByIdempotency').mockResolvedValueOnce(null);

      const holdPromise = repo.createHold({
        tenantId: '11111111-1111-1111-1111-111111111111',
        locationId: '22222222-2222-2222-2222-222222222222',
        idempotencyKey: 'test-gist-overlap-key',
        selection: {
          bookingModel: 'exclusive_resource',
          resourceId: '33333333-3333-3333-3333-333333333333',
          startsAt: new Date('2026-11-15T18:00:00Z'),
          endsAt: new Date('2026-11-15T19:00:00Z'),
        },
        customer: {
          fullName: 'Alice Smith',
          phone: '+91 98765 00001',
        },
      });

      await expect(holdPromise).rejects.toThrow(SlotUnavailableError);
      await expect(holdPromise).rejects.toMatchObject({
        code: 'SLOT_UNAVAILABLE',
        httpStatus: 409,
      });
    });

    it('translates Postgres serialization failure (40001) to 409 SlotUnavailableError', async () => {
      const pgError: MockPgError = new Error('could not serialize access due to read/write dependencies');
      pgError.code = '40001';

      const mockDb = createMockDb({ transactionError: pgError });
      const repo = new PostgresBookingRepository(mockDb);
      vi.spyOn(repo, 'findBookingByIdempotency').mockResolvedValueOnce(null);

      const holdPromise = repo.createHold({
        tenantId: '11111111-1111-1111-1111-111111111111',
        locationId: '22222222-2222-2222-2222-222222222222',
        idempotencyKey: 'test-serialization-key',
        selection: {
          bookingModel: 'exclusive_resource',
          resourceId: '33333333-3333-3333-3333-333333333333',
          startsAt: new Date('2026-11-15T18:00:00Z'),
          endsAt: new Date('2026-11-15T19:00:00Z'),
        },
        customer: {
          fullName: 'Bob Jones',
          phone: '+91 98765 00002',
        },
      });

      await expect(holdPromise).rejects.toThrow(SlotUnavailableError);
      await expect(holdPromise).rejects.toMatchObject({
        code: 'SLOT_UNAVAILABLE',
        httpStatus: 409,
      });
    });

    it('translates Postgres deadlock detected (40P01) to 409 SlotUnavailableError', async () => {
      const pgError: MockPgError = new Error('deadlock detected');
      pgError.code = '40P01';

      const mockDb = createMockDb({ transactionError: pgError });
      const repo = new PostgresBookingRepository(mockDb);
      vi.spyOn(repo, 'findBookingByIdempotency').mockResolvedValueOnce(null);

      const holdPromise = repo.createHold({
        tenantId: '11111111-1111-1111-1111-111111111111',
        locationId: '22222222-2222-2222-2222-222222222222',
        idempotencyKey: 'test-deadlock-key',
        selection: {
          bookingModel: 'exclusive_resource',
          resourceId: '33333333-3333-3333-3333-333333333333',
          startsAt: new Date('2026-11-15T18:00:00Z'),
          endsAt: new Date('2026-11-15T19:00:00Z'),
        },
        customer: {
          fullName: 'Charlie Davis',
          phone: '+91 98765 00003',
        },
      });

      await expect(holdPromise).rejects.toThrow(SlotUnavailableError);
      await expect(holdPromise).rejects.toMatchObject({
        code: 'SLOT_UNAVAILABLE',
        httpStatus: 409,
      });
    });

    it('throws HoldExpiredError (410) when claiming a hold whose token is expired or consumed', async () => {
      const mockDb = {
        transaction: vi.fn().mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
          const mockTx = {
            execute: vi.fn().mockResolvedValue([]),
            select: vi.fn().mockReturnValue({
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([
                    {
                      id: 'hold-1',
                      bookingId: 'bk-1',
                      holdToken: 'valid-token',
                      status: 'expired',
                      expiresAt: new Date(Date.now() - 60_000),
                    },
                  ]),
                }),
              }),
            }),
          };
          return callback(mockTx);
        }),
      } as unknown as AppDatabase;

      const repo = new PostgresBookingRepository(mockDb);

      const claimPromise = repo.claimHold(
        '11111111-1111-1111-1111-111111111111',
        'bk-1',
        'valid-token',
      );

      await expect(claimPromise).rejects.toThrow(HoldExpiredError);
      await expect(claimPromise).rejects.toMatchObject({
        code: 'HOLD_EXPIRED',
        httpStatus: 410,
      });
    });
  });

  describe('3.3: Transactional Checkout & Atomic Step Enforcement', () => {
    it('throws 409 InsufficientStockError when physical inventory update matches 0 rows', async () => {
      const mockDb = createMockDb({
        tenant: {
          id: '11111111-1111-1111-1111-111111111111',
          name: 'Organic Milk Store',
          slug: 'milk-store',
        },
        inventoryUpdateRows: [], // 0 rows updated!
      });

      const commerceRepo = new PostgresCommerceRepository(mockDb);
      vi.spyOn(commerceRepo, 'findOrderByIdempotency').mockResolvedValueOnce(null);

      const checkoutPromise = commerceRepo.createOrderAndHold({
        tenantId: '11111111-1111-1111-1111-111111111111',
        idempotencyKey: 'checkout-insufficient-stock-key',
        customer: {
          fullName: 'Dairy Lover',
          phone: '+91 98765 11111',
        },
        lines: [
          {
            catalogueItemId: 'item-milk-1',
            quantity: 50,
          },
        ],
      });

      await expect(checkoutPromise).rejects.toThrow(InsufficientStockError);
      await expect(checkoutPromise).rejects.toMatchObject({
        code: 'OUT_OF_STOCK',
        httpStatus: 409,
      });
    });

    it('throws HoldExpiredError (410) during payment confirmation when booking hold is expired or consumed (0 rows updated)', async () => {
      const mockDb = {
        transaction: vi.fn().mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
          const mockTx = {
            execute: vi.fn().mockResolvedValue([]),
            select: vi.fn()
              .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                  where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue([
                      {
                        id: 'ord-123',
                        tenantId: '11111111-1111-1111-1111-111111111111',
                        orderNumber: 'ORD-2026-101',
                        status: 'awaiting_payment',
                        paymentStatus: 'unpaid',
                        expiresAt: new Date(Date.now() + 100_000),
                      },
                    ]),
                  }),
                }),
              })
              .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                  where: vi.fn().mockResolvedValue([
                    {
                      id: 'ol-1',
                      orderId: 'ord-123',
                      tenantId: '11111111-1111-1111-1111-111111111111',
                      catalogueItemId: 'ci-turf',
                      itemType: 'bookable_resource',
                      titleSnapshot: 'Football Turf Slot',
                      bookingId: 'bk-turf-999',
                      quantity: 1,
                    },
                  ]),
                }),
              }),
            // update booking_items returns 0 rows (hold already consumed!)
            update: vi.fn().mockReturnValue({
              set: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  returning: vi.fn().mockResolvedValue([]),
                }),
              }),
            }),
          };
          return callback(mockTx);
        }),
      } as unknown as AppDatabase;

      const commerceRepo = new PostgresCommerceRepository(mockDb);

      const confirmPromise = commerceRepo.confirmOrderPayment({
        tenantId: '11111111-1111-1111-1111-111111111111',
        orderId: 'ord-123',
      });

      await expect(confirmPromise).rejects.toThrow(HoldExpiredError);
      await expect(confirmPromise).rejects.toMatchObject({
        code: 'HOLD_EXPIRED',
        httpStatus: 410,
      });
    });
  });

  describe('3.4: Transactional Outbox Pattern & Background Publisher Worker', () => {
    it('records outbox events and publishes pending events in batches', async () => {
      const outboxRepo = new InMemoryOutboxRepository();
      const publishedEvents: OutboxEventRecord[] = [];

      const service = new OutboxService(outboxRepo, async (event) => {
        publishedEvents.push(event);
      });

      // Insert two pending events
      await service.recordEvent(null, {
        tenantId: '11111111-1111-1111-1111-111111111111',
        eventType: 'order.checkout_completed',
        aggregateType: 'order',
        aggregateId: 'ord-outbox-1',
        payload: { orderNumber: 'ORD-2026-001', totalMinor: 50000 },
        idempotencyKey: 'outbox-idem-1',
      });

      await service.recordEvent(null, {
        tenantId: '11111111-1111-1111-1111-111111111111',
        eventType: 'booking.confirmed',
        aggregateType: 'booking',
        aggregateId: 'bk-outbox-2',
        payload: { bookingNumber: 'BK-2026-002', totalMinor: 180000 },
        idempotencyKey: 'outbox-idem-2',
      });

      const pendingBefore = await outboxRepo.fetchPendingEvents();
      expect(pendingBefore).toHaveLength(2);
      expect(pendingBefore[0]!.status).toBe('pending');
      expect(pendingBefore[1]!.status).toBe('pending');

      const result = await service.pollAndPublishBatch();
      expect(result.publishedCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(publishedEvents).toHaveLength(2);

      const pendingAfter = await outboxRepo.fetchPendingEvents();
      expect(pendingAfter).toHaveLength(0);

      const allEvents = outboxRepo.getEvents();
      expect(allEvents[0]!.status).toBe('published');
      expect(allEvents[0]!.publishedAt).toBeInstanceOf(Date);
      expect(allEvents[1]!.status).toBe('published');
    });

    it('marks event as failed and records error when publisher throws, without crashing worker', async () => {
      const outboxRepo = new InMemoryOutboxRepository();
      const service = new OutboxService(outboxRepo, async (event) => {
        if (event.aggregateId === 'bad-event') {
          throw new Error('Connection refused to webhook delivery endpoint');
        }
      });

      await service.recordEvent(null, {
        tenantId: '11111111-1111-1111-1111-111111111111',
        eventType: 'notification.dispatch',
        aggregateType: 'notification',
        aggregateId: 'bad-event',
        payload: { recipient: 'bad@example.com' },
        idempotencyKey: 'bad-idem-key',
      });

      const result = await service.pollAndPublishBatch();
      expect(result.publishedCount).toBe(0);
      expect(result.failedCount).toBe(1);

      const allEvents = outboxRepo.getEvents();
      expect(allEvents[0]!.status).toBe('failed');
      expect(allEvents[0]!.lastError).toContain('Connection refused');
      expect(allEvents[0]!.retryCount).toBe(1);
    });
  });
});
