import type { UUID } from '@/types/domain';
import type {
  CreateUniversalOrderInput,
} from './commerce.service';
import type {
  RuntimeCatalogueItem,
  RuntimeCustomerSubscription,
  RuntimeEntitlementRecord,
  RuntimeFulfilmentRecord,
  RuntimeInventoryItem,
  RuntimeOrderRecord,
} from './commerce.types';
import type { MockTenant } from '@/lib/mock-data/mock-tenants';

export interface CommerceRepositoryPort {
  resolveTenant(tenantIdOrSlug: string): Promise<MockTenant | null>;
  findCatalogueItem(tenantId: UUID, itemId: UUID): Promise<RuntimeCatalogueItem | null>;
  listCatalogueItems(tenantId: UUID, filter?: { itemType?: string }): Promise<RuntimeCatalogueItem[]>;
  findInventoryItem(tenantId: UUID, catalogueItemId: UUID): Promise<RuntimeInventoryItem | null>;
  findOrderById(tenantId: UUID, orderId: UUID): Promise<RuntimeOrderRecord | null>;
  findOrderByIdempotency(tenantId: UUID, idempotencyKey: string): Promise<RuntimeOrderRecord | null>;
  listOrders(tenantId: UUID): Promise<RuntimeOrderRecord[]>;
  createOrderAndHold(input: CreateUniversalOrderInput): Promise<{
    order: RuntimeOrderRecord;
    fulfilments: RuntimeFulfilmentRecord[];
    entitlements: RuntimeEntitlementRecord[];
    subscriptions: RuntimeCustomerSubscription[];
  }>;
  confirmOrderPayment(input: {
    tenantId: UUID;
    orderId: UUID;
    paymentMethod?: 'upi' | 'card' | 'cash';
    confirmedAtMs?: number;
  }): Promise<{
    order: RuntimeOrderRecord;
    fulfilments: RuntimeFulfilmentRecord[];
    entitlements: RuntimeEntitlementRecord[];
    subscriptions: RuntimeCustomerSubscription[];
  }>;
  resetForTests?(): void;
}
