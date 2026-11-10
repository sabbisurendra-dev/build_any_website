import type { CatalogueItemType, UUID } from '@/types/domain';
import type { RuntimeCatalogueItem } from '@/modules/commerce/commerce.types';
import { UniversalCommerceService } from '@/modules/commerce/commerce.service';

/**
 * AI-COS Read-Only Commerce Access Port (Finding 5.1 & Architecture §4.1).
 *
 * INVARIANT: AI-COS agents are strictly read-only observers of core commerce.
 * Agents may inspect catalogue items, storefront summaries, and active schedules to craft
 * relevant copy and analysis, but possesses ZERO permissions to directly mutate inventory,
 * create bookings, modify prices, or alter orders.
 *
 * Any proposed mutation to merchant state MUST be submitted to the human-in-the-loop
 * approval queue (`ApprovalQueueService`).
 */
export interface StorefrontCommerceSummary {
  readonly tenantId: UUID;
  readonly tenantName: string;
  readonly totalItemCount: number;
  readonly categories: readonly string[];
  readonly itemSummaries: readonly {
    readonly id: UUID;
    readonly name: string;
    readonly itemType: string;
    readonly priceMinor: number;
    readonly unitLabel: string;
    readonly description: string;
  }[];
}

export interface CosCommerceReadPort {
  getCatalogueItem(tenantId: UUID, itemId: UUID): Promise<Readonly<RuntimeCatalogueItem | null>>;
  listCatalogueItems(tenantId: UUID, filter?: { itemType?: CatalogueItemType }): Promise<readonly Readonly<RuntimeCatalogueItem>[]>;
  getStorefrontSummary(tenantId: UUID): Promise<StorefrontCommerceSummary>;
}

export class CosCommerceReadBridge implements CosCommerceReadPort {
  private commerceService: UniversalCommerceService;

  constructor(commerceService?: UniversalCommerceService) {
    this.commerceService = commerceService ?? new UniversalCommerceService();
  }

  public async getCatalogueItem(
    tenantId: UUID,
    itemId: UUID,
  ): Promise<Readonly<RuntimeCatalogueItem | null>> {
    try {
      const items = this.commerceService.listCatalogue(tenantId, { includeDormant: true });
      const match = items.find((i) => i.id === itemId);
      return match ? Object.freeze({ ...match }) : null;
    } catch {
      return null;
    }
  }

  public async listCatalogueItems(
    tenantId: UUID,
    filter?: { itemType?: CatalogueItemType },
  ): Promise<readonly Readonly<RuntimeCatalogueItem>[]> {
    try {
      const items = this.commerceService.listCatalogue(tenantId, filter);
      return items.map((i) => Object.freeze({ ...i }));
    } catch {
      return [];
    }
  }

  public async getStorefrontSummary(tenantId: UUID): Promise<StorefrontCommerceSummary> {
    try {
      const tenant = await this.commerceService.getRepository().resolveTenant(tenantId);
      const resolvedId = tenant?.id ?? tenantId;
      const tenantName = tenant?.name ?? 'Merchant Store';
      const items = this.commerceService.listCatalogue(resolvedId);
      const categories = Array.from(new Set(items.map((i) => i.categoryName)));
      const itemSummaries = items.map((i) => ({
        id: i.id,
        name: i.name,
        itemType: i.itemType,
        priceMinor: i.priceMinor,
        unitLabel: i.unitLabel,
        description: i.shortDescription || i.description || '',
      }));

      return Object.freeze({
        tenantId: resolvedId,
        tenantName,
        totalItemCount: items.length,
        categories,
        itemSummaries,
      });
    } catch {
      return Object.freeze({
        tenantId,
        tenantName: 'Merchant Store',
        totalItemCount: 0,
        categories: [],
        itemSummaries: [],
      });
    }
  }
}
