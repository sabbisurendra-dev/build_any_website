import type {
  BillingModel,
  BookingModel,
  CatalogueItemStatus,
  CatalogueItemType,
  CurrencyCode,
  CustomerSubscriptionStatus,
  EntitlementStatus,
  EntitlementType,
  FulfilmentStatus,
  FulfilmentType,
  OrderStatus,
  UUID,
} from '@/types/domain';

export interface RuntimeBusinessUnit {
  id: UUID;
  tenantId: UUID;
  name: string; // sub_entity name
  slug: string;
  domainVertical: string;
  flag1?: string;
  flag2?: string;
  status: 'active' | 'dormant' | 'archived';
}

export interface RuntimeCategory {
  id: UUID;
  tenantId: UUID;
  businessUnitId?: UUID;
  parentId?: UUID;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
}

export interface RuntimeCatalogueItem {
  id: UUID;
  tenantId: UUID;
  businessUnitId?: UUID;
  categoryId?: UUID;
  categoryName: string;
  subEntityName: string;
  domainName: string;
  itemType: CatalogueItemType;
  fulfilmentType: FulfilmentType;
  billingModel: BillingModel;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string;
  description: string;
  flag1?: string;
  flag2?: string;
  status: CatalogueItemStatus;
  priceMinor: number;
  compareAtPriceMinor?: number;
  currency: CurrencyCode;
  unitLabel: string; // e.g., 'litre', 'unit', 'hour', 'session', '90-day pass', 'month'
  // Optional links to specialized engines
  resourceId?: UUID;
  serviceId?: UUID;
  sessionId?: UUID;
  accessDurationDays?: number; // e.g. 90 for 90-day course
  billingInterval?: 'monthly' | 'yearly';
  includedUsageUnits?: number;
  upgradeTargetItemId?: UUID;
  badgeText?: string;
}

export interface RuntimeInventoryItem {
  id: UUID;
  tenantId: UUID;
  catalogueItemId: UUID;
  sku: string;
  unitLabel: string;
  quantityOnHand: number;
  quantityReserved: number;
  lowStockThreshold: number;
  allowBackorder: boolean;
  updatedAtIso: string;
}

export interface RuntimeInventoryReservation {
  id: UUID;
  tenantId: UUID;
  inventoryItemId: UUID;
  catalogueItemId: UUID;
  orderId: UUID;
  quantity: number;
  status: 'active' | 'committed' | 'released' | 'expired';
  expiresAtMs: number;
  idempotencyKey: string;
  createdAtIso: string;
}

export interface RuntimeInventoryMovement {
  id: UUID;
  tenantId: UUID;
  inventoryItemId: UUID;
  catalogueItemId: UUID;
  movementType: 'restock' | 'sale_commit' | 'return_restock' | 'manual_adjustment' | 'damage_writeoff';
  deltaQuantity: number;
  referenceId: string;
  notes: string;
  createdAtIso: string;
}

export interface RuntimeFulfilmentRecord {
  id: UUID;
  tenantId: UUID;
  orderId: UUID;
  orderLineId: UUID;
  catalogueItemId: UUID;
  itemName: string;
  quantity: number;
  unitLabel: string;
  method: 'local_delivery' | 'courier_shipment' | 'store_pickup';
  status: FulfilmentStatus;
  customerName: string;
  customerPhone: string;
  recipientAddress: string;
  trackingNumber?: string;
  deliverySlotStartIso?: string;
  deliverySlotEndIso?: string;
  createdAtIso: string;
  completedAtIso?: string;
}

export interface RuntimeEntitlementRecord {
  id: UUID;
  tenantId: UUID;
  businessUnitId?: UUID;
  orderId?: UUID;
  orderLineId?: UUID;
  catalogueItemId: UUID;
  itemName: string;
  subscriptionId?: UUID;
  bookingId?: UUID;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  entitlementType: EntitlementType;
  /** Maps directly to master table `permission_timeslot_start` */
  permissionTimeslotStartIso: string;
  /** Maps directly to master table `permission_timeslot_end` */
  permissionTimeslotEndIso: string | null;
  maxUsageCount: number | null;
  consumedUsageCount: number;
  status: EntitlementStatus;
  flag1?: string;
  flag2?: string;
  createdAtIso: string;
  updatedAtIso: string;
}

export interface RuntimeCustomerSubscription {
  id: UUID;
  tenantId: UUID;
  catalogueItemId: UUID;
  planName: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  priceMinor: number;
  currency: CurrencyCode;
  billingInterval: 'monthly' | 'yearly';
  status: CustomerSubscriptionStatus;
  currentPeriodStartIso: string;
  currentPeriodEndIso: string;
  cancelAtPeriodEnd: boolean;
  cancelledAtIso?: string;
  linkedEntitlementId: UUID;
  createdAtIso: string;
  updatedAtIso: string;
}

export interface RuntimeOrderLineRecord {
  id: UUID;
  orderId: UUID;
  tenantId: UUID;
  catalogueItemId: UUID;
  itemName: string;
  itemType: CatalogueItemType;
  fulfilmentType: FulfilmentType;
  quantity: number;
  unitLabel: string;
  unitPriceMinor: number;
  lineTotalMinor: number;
  lineStatus: 'pending' | 'reserved' | 'confirmed' | 'fulfilled' | 'cancelled' | 'refunded';
  // Optional links to created artifacts
  inventoryReservationId?: UUID;
  bookingId?: UUID;
  bookingHoldToken?: string;
  fulfilmentId?: UUID;
  entitlementId?: UUID;
  subscriptionId?: UUID;
  slotSelection?: {
    bookingModel?: BookingModel;
    resourceId?: UUID;
    serviceId?: UUID;
    staffMemberId?: UUID;
    sessionId?: UUID;
    startsAtIso?: string;
    endsAtIso?: string;
  };
}

export interface RuntimeOrderRecord {
  id: UUID;
  orderNumber: string;
  tenantId: UUID;
  businessUnitId?: UUID;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress?: string;
  fulfilmentPreference?: 'local_delivery' | 'courier_shipment' | 'store_pickup';
  status: OrderStatus;
  paymentStatus: 'unpaid' | 'pending' | 'captured' | 'failed' | 'refunded';
  paymentMethod: 'upi' | 'card' | 'cash';
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
  currency: CurrencyCode;
  idempotencyKey: string;
  expiresAtIso: string;
  lines: RuntimeOrderLineRecord[];
  createdAtIso: string;
  updatedAtIso: string;
}

/**
 * Flat Master Data Table Row (`v_universal_commerce_master` projection)
 * Matches the user's proposed master schema:
 * Entity (company), sub_entity, domain, category, flag_1, flag_2, item_name,
 * permission_timeslot_start, permission_timeslot_end, status, + operational metrics.
 */
export interface MasterDataTableRow {
  rowId: string;
  tenantId: UUID;
  catalogueItemId: UUID;
  entity: string;
  sub_entity: string;
  domain: string;
  category: string;
  flag_1: string | null;
  flag_2: string | null;
  item_name: string;
  item_type: CatalogueItemType;
  fulfilment_type: FulfilmentType;
  permission_timeslot_start: string | null;
  permission_timeslot_end: string | null;
  status: 'dormant' | 'unavailable' | 'available' | 'sold' | 'ready_to_upgrade' | 'active' | 'expired' | 'upgraded' | 'revoked';
  price_minor: number;
  currency: CurrencyCode;
  unit_label: string;
  stock_on_hand: number | null;
  stock_reserved: number | null;
  stock_available: number | null;
  customer_holder?: string;
}
