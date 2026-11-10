import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type {
  BookingModel,
  BookingStatus,
  BusinessVertical,
  CurrencyCode,
  PaymentProvider,
  PaymentStatus,
  UUID,
} from '@/types/domain';
import type { PageSection, WebsiteThemeConfig } from '@/modules/website-builder/layout.types';
import { MOCK_TENANTS, type MockTenant } from '@/lib/mock-data/mock-tenants';
import { MOCK_RESOURCES } from '@/lib/mock-data/mock-resources';
import { MOCK_BOOKINGS } from '@/lib/mock-data/mock-bookings';
import type { AuditLogEntryInput } from '@/modules/tenancy/tenant.service';
import type {
  RuntimeBusinessUnit,
  RuntimeCatalogueItem,
  RuntimeCategory,
  RuntimeCustomerSubscription,
  RuntimeEntitlementRecord,
  RuntimeFulfilmentRecord,
  RuntimeInventoryItem,
  RuntimeInventoryMovement,
  RuntimeInventoryReservation,
  RuntimeOrderRecord,
} from '@/modules/commerce/commerce.types';

export interface CatalogResourceEntity {
  id: UUID;
  tenantId: UUID;
  name: string;
  type: string;
  slotDurationMinutes: number;
  slotStepMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  basePriceMinor: number;
  peakPriceMinor: number;
  description: string;
  operatingStartHour: number;
  operatingEndHour: number;
  operatingHoursLabel: string;
  isActive: boolean;
}

export interface CatalogServiceEntity {
  id: UUID;
  tenantId: UUID;
  name: string;
  description: string;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  priceMinor: number;
  isActive: boolean;
}

export interface StaffAvailabilityException {
  id: string;
  dateLocal: string; // YYYY-MM-DD
  isUnavailable: boolean;
  startHour?: number;
  endHour?: number;
  reason?: string;
}

export interface CatalogStaffEntity {
  id: UUID;
  tenantId: UUID;
  displayName: string;
  specialty: string;
  serviceIds: UUID[];
  workingStartHour: number;
  workingEndHour: number;
  breakHour?: number;
  exceptions: StaffAvailabilityException[];
  isActive: boolean;
}

export interface CatalogSessionEntity {
  id: UUID;
  tenantId: UUID;
  name: string;
  instructorName: string;
  description: string;
  dateLocal: string; // YYYY-MM-DD or '*' for daily recurring class schedule
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  maxCapacity: number;
  bookedCount: number;
  heldCount: number;
  priceMinor: number;
  isActive: boolean;
}

export interface RuntimeAllocation {
  id: UUID;
  tenantId: UUID;
  bookingId: UUID;
  bookingModel: BookingModel;
  resourceId?: UUID;
  serviceId?: UUID;
  staffMemberId?: UUID;
  sessionId?: UUID;
  quantity: number;
  startsAtMs: number;
  endsAtMs: number;
  bufferStartsAtMs: number;
  bufferEndsAtMs: number;
  expiresAtMs: number;
  status: 'held' | 'confirmed' | 'released' | 'expired';
}

export interface RuntimeBookingRecord {
  bookingId: UUID;
  bookingNumber: string;
  tenantId: UUID;
  locationId: UUID;
  bookingModel: BookingModel;
  idempotencyKey: string;
  payloadFingerprint: string;
  holdId: UUID;
  holdToken: string;
  status: BookingStatus;
  paymentStatus: 'paid' | 'pending' | 'unpaid' | 'refunded' | 'failed';
  paymentMethod: 'upi' | 'card' | 'cash' | 'unknown';
  expiresAtIso: string;
  totalMinor: number;
  currency: CurrencyCode;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  notes?: string;
  resourceOrServiceName: string;
  staffName?: string;
  courtOrRoom?: string;
  dateLocal: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  startsAtIso: string;
  endsAtIso: string;
  resourceId?: UUID;
  serviceId?: UUID;
  staffMemberId?: UUID;
  sessionId?: UUID;
  quantity: number;
  allocationId: UUID;
  createdAtIso: string;
}

export interface RuntimePaymentRecord {
  paymentId: UUID;
  tenantId: UUID;
  bookingId: UUID;
  provider: Exclude<PaymentProvider, 'manual'>;
  providerOrderId: string;
  providerPaymentId?: string;
  amountMinor: number;
  currency: CurrencyCode;
  status: PaymentStatus;
  idempotencyKey: string;
  createdAtIso: string;
}

export interface RuntimeRefundRecord {
  refundId: UUID;
  tenantId: UUID;
  bookingId: UUID;
  paymentId: UUID;
  providerRefundId: string;
  amountMinor: number;
  reason: string;
  createdAtIso: string;
}

export interface RuntimeNotificationRecord {
  notificationId: UUID;
  tenantId: UUID;
  bookingId?: UUID;
  channel: string;
  templateKey: string;
  recipient: string;
  idempotencyKey: string;
  status: 'queued' | 'sent' | 'failed';
  payload: Record<string, unknown>;
  createdAtIso: string;
}

export interface TenantWebsiteState {
  websiteId: UUID;
  tenantId: UUID;
  pageId: UUID;
  draftRevision: number;
  draftSections: PageSection[];
  draftTheme: WebsiteThemeConfig;
  publishedVersion: number;
  publishedSections: PageSection[];
  publishedTheme: WebsiteThemeConfig;
  versions: Array<{
    versionId: UUID;
    versionNumber: number;
    releaseNotes?: string;
    publishedAtIso: string;
    sections: PageSection[];
    theme: WebsiteThemeConfig;
  }>;
  updatedAtIso: string;
}

export interface PlatformRuntimeSnapshot {
  tenants: MockTenant[];
  websites: Record<string, TenantWebsiteState>; // keyed by tenantId
  resources: CatalogResourceEntity[];
  services: CatalogServiceEntity[];
  staffMembers: CatalogStaffEntity[];
  sessions: CatalogSessionEntity[];
  bookings: RuntimeBookingRecord[];
  allocations: RuntimeAllocation[];
  payments: RuntimePaymentRecord[];
  refunds: RuntimeRefundRecord[];
  processedWebhookKeys: string[];
  notifications: RuntimeNotificationRecord[];
  auditLogs: AuditLogEntryInput[];
  // Universal Commerce & Entitlement Extensions
  businessUnits: RuntimeBusinessUnit[];
  categories: RuntimeCategory[];
  catalogueItems: RuntimeCatalogueItem[];
  inventoryItems: RuntimeInventoryItem[];
  inventoryReservations: RuntimeInventoryReservation[];
  inventoryMovements: RuntimeInventoryMovement[];
  orders: RuntimeOrderRecord[];
  fulfilments: RuntimeFulfilmentRecord[];
  entitlements: RuntimeEntitlementRecord[];
  customerSubscriptions: RuntimeCustomerSubscription[];
}

const RUNTIME_FILE_PATH = resolve(process.cwd(), '.runtime-state.json');

declare global {
  var __smbRuntimeSnapshot: PlatformRuntimeSnapshot | undefined;
  var __smbRuntimeMtimeMs: number | undefined;
}

export function buildDefaultThemeForVertical(
  vertical: BusinessVertical,
  accentOverride?: string,
): WebsiteThemeConfig {
  const accentMap: Record<BusinessVertical, string> = {
    sports_turf: '#16a34a',
    racquet_court: '#2563eb',
    clinic_healthcare: '#0284c7',
    salon_beauty: '#db2777',
    fitness_yoga: '#7c3aed',
    general_appointment: '#0f172a',
    retail_grocery: '#15803d',
    electronics_retail: '#1d4ed8',
    edtech_courses: '#4f46e5',
    digital_membership: '#9333ea',
    universal_commerce: '#0f766e',
  };

  return {
    brandPrimaryHex: '#0f172a',
    brandAccentHex: accentOverride ?? accentMap[vertical] ?? '#16a34a',
    backgroundHex: '#ffffff',
    foregroundHex: '#090d16',
    fontHeading: 'system-ui',
    fontBody: 'system-ui',
    borderRadiusScale: 'rounded',
    colorScheme: 'light',
  };
}

export function buildStarterSectionsForTenant(tenant: MockTenant): PageSection[] {
  if (tenant.vertical === 'clinic_healthcare' || tenant.vertical === 'salon_beauty') {
    const isClinic = tenant.vertical === 'clinic_healthcare';
    return [
      {
        id: 'sec-hero-booking-01',
        name: isClinic ? 'Clinic Hero & Doctor Appointment' : 'Salon Hero & Stylist Booking',
        sortOrder: 0,
        compactMode: 'vertical',
        rowUnitPx: 48,
        gapPx: 16,
        style: { backgroundVariant: 'default', paddingY: 'md', fullBleed: false },
        widgets: [
          {
            id: 'w-hero-01',
            widgetType: 'hero.banner',
            widgetVersion: 1,
            placement: { desktop: { colStart: 1, colSpan: 12, rowStart: 1, rowSpan: 7 } },
            config: {
              eyebrow: `${tenant.location.name} • ${tenant.location.city}`,
              headline: isClinic
                ? `${tenant.name} — Specialist Appointments Online`
                : `${tenant.name} — Bespoke Styling & Wellness`,
              subheadline: isClinic
                ? 'Choose your treatment, select your specialist doctor, and receive instant WhatsApp & Email confirmation.'
                : 'Select your service, pick your senior stylist, and confirm your appointment slot in seconds.',
              primaryCtaLabel: 'Book Appointment',
              primaryCtaHref: '#book',
              alignment: 'left',
            },
          },
          {
            id: 'w-services-02',
            widgetType: 'catalog.service-list',
            widgetVersion: 1,
            placement: { desktop: { colStart: 1, colSpan: 6, rowStart: 8, rowSpan: 8 } },
            config: {
              heading: isClinic ? 'Clinical Treatments & Consultations' : 'Signature Salon Services',
              showDuration: true,
              showPrice: true,
            },
          },
          {
            id: 'w-slot-picker-03',
            widgetType: 'booking.slot-picker',
            widgetVersion: 1,
            placement: { desktop: { colStart: 7, colSpan: 6, rowStart: 8, rowSpan: 8 } },
            config: {
              heading: isClinic ? 'Select Doctor & Time Slot' : 'Select Stylist & Slot',
              bookingModel: 'staff_appointment',
              showPricingSummary: true,
              dateHorizonDays: 14,
            },
          },
        ],
      },
      {
        id: 'sec-location-02',
        name: 'Location & Visiting Hours',
        sortOrder: 1,
        compactMode: 'vertical',
        rowUnitPx: 48,
        gapPx: 16,
        style: { backgroundVariant: 'muted', paddingY: 'md', fullBleed: false },
        widgets: [
          {
            id: 'w-loc-04',
            widgetType: 'location.map-hours',
            widgetVersion: 1,
            placement: { desktop: { colStart: 1, colSpan: 12, rowStart: 1, rowSpan: 5 } },
            config: {
              heading: `${tenant.location.address}, ${tenant.location.city} • 10:00 AM – 07:00 PM`,
              showGoogleMapEmbed: true,
              showWhatsappButton: true,
            },
          },
        ],
      },
    ];
  }

  if (tenant.vertical === 'fitness_yoga') {
    return [
      {
        id: 'sec-hero-booking-01',
        name: 'Studio Hero & Group Class Schedule',
        sortOrder: 0,
        compactMode: 'vertical',
        rowUnitPx: 48,
        gapPx: 16,
        style: { backgroundVariant: 'default', paddingY: 'md', fullBleed: false },
        widgets: [
          {
            id: 'w-hero-01',
            widgetType: 'hero.banner',
            widgetVersion: 1,
            placement: { desktop: { colStart: 1, colSpan: 12, rowStart: 1, rowSpan: 7 } },
            config: {
              eyebrow: `${tenant.location.name} • ${tenant.location.city}`,
              headline: `${tenant.name} — Reserve Your Mat & Batch`,
              subheadline:
                'Live batch capacity tracking, expert instructors, and guaranteed spot reservation before classes fill up.',
              primaryCtaLabel: 'Book Class Seat',
              primaryCtaHref: '#book',
              alignment: 'left',
            },
          },
          {
            id: 'w-slot-picker-03',
            widgetType: 'booking.slot-picker',
            widgetVersion: 1,
            placement: { desktop: { colStart: 1, colSpan: 7, rowStart: 8, rowSpan: 8 } },
            config: {
              heading: 'Upcoming Group Classes & Live Capacity',
              bookingModel: 'capacity_session',
              showPricingSummary: true,
              dateHorizonDays: 14,
            },
          },
          {
            id: 'w-faq-02',
            widgetType: 'content.faq',
            widgetVersion: 1,
            placement: { desktop: { colStart: 8, colSpan: 5, rowStart: 8, rowSpan: 8 } },
            config: {
              heading: 'Studio Guidelines & Mats',
              items: [
                {
                  question: 'Are yoga mats provided at the studio?',
                  answer: 'Yes, sanitized cork mats and blocks are complimentary for every booked participant.',
                },
                {
                  question: 'When should I arrive before my batch?',
                  answer: 'Please arrive 10 minutes prior to batch start time for check-in.',
                },
              ],
            },
          },
        ],
      },
      {
        id: 'sec-location-02',
        name: 'Studio Address & Timings',
        sortOrder: 1,
        compactMode: 'vertical',
        rowUnitPx: 48,
        gapPx: 16,
        style: { backgroundVariant: 'muted', paddingY: 'md', fullBleed: false },
        widgets: [
          {
            id: 'w-loc-04',
            widgetType: 'location.map-hours',
            widgetVersion: 1,
            placement: { desktop: { colStart: 1, colSpan: 12, rowStart: 1, rowSpan: 5 } },
            config: {
              heading: `${tenant.location.address}, ${tenant.location.city} • 06:00 AM – 09:00 PM`,
              showGoogleMapEmbed: true,
              showWhatsappButton: true,
            },
          },
        ],
      },
    ];
  }

  if (
    tenant.vertical === 'universal_commerce' ||
    tenant.vertical === 'retail_grocery' ||
    tenant.vertical === 'electronics_retail' ||
    tenant.vertical === 'edtech_courses' ||
    tenant.vertical === 'digital_membership'
  ) {
    return [
      {
        id: 'sec-hero-universal-01',
        name: 'Universal Storefront Hero & Live Inventory Slot',
        sortOrder: 0,
        compactMode: 'vertical',
        rowUnitPx: 48,
        gapPx: 16,
        style: { backgroundVariant: 'default', paddingY: 'md', fullBleed: false },
        widgets: [
          {
            id: 'w-hero-01',
            widgetType: 'hero.banner',
            widgetVersion: 1,
            placement: { desktop: { colStart: 1, colSpan: 12, rowStart: 1, rowSpan: 7 } },
            config: {
              eyebrow: `${tenant.location.name} • Universal Commerce & Entitlements`,
              headline: `${tenant.name} — Sell Any Item, Book Any Slot, Grant Any Right`,
              subheadline:
                'Order physical items (milk, laptops), book exclusive turf & doctor slots, enroll in 20-seat classes, or unlock 90-day digital courses in a single unified cart.',
              primaryCtaLabel: 'Explore Catalogue & Book',
              primaryCtaHref: '#book',
              alignment: 'left',
            },
          },
          {
            id: 'w-uni-inv-slot-02',
            widgetType: 'commerce.inventory-slot',
            widgetVersion: 1,
            placement: { desktop: { colStart: 1, colSpan: 7, rowStart: 8, rowSpan: 9 } },
            config: {
              heading: 'Live Inventory & Instant Order Slot (Products, Courses, Slots & Passes)',
              filterItemType: 'all',
              displayStyle: 'cards_grid',
              showLiveStockBadge: true,
              enableMixedCart: true,
            },
          },
          {
            id: 'w-slot-picker-03',
            widgetType: 'booking.slot-picker',
            widgetVersion: 1,
            placement: { desktop: { colStart: 8, colSpan: 5, rowStart: 8, rowSpan: 9 } },
            config: {
              heading: 'Instant Turf, Appointment & Class Slot Picker',
              bookingModel: 'exclusive_resource',
              showPricingSummary: true,
              dateHorizonDays: 14,
            },
          },
        ],
      },
      {
        id: 'sec-master-matrix-02',
        name: 'Courses, Subscriptions & Master Data Ledger',
        sortOrder: 1,
        compactMode: 'vertical',
        rowUnitPx: 48,
        gapPx: 16,
        style: { backgroundVariant: 'muted', paddingY: 'md', fullBleed: false },
        widgets: [
          {
            id: 'w-courses-04',
            widgetType: 'content.course-catalog',
            widgetVersion: 1,
            placement: { desktop: { colStart: 1, colSpan: 6, rowStart: 1, rowSpan: 7 } },
            config: {
              heading: 'Time-Limited Courses & Digital Catalogue (90-Day Access)',
              showDurationBadge: true,
              showUpgradeOption: true,
            },
          },
          {
            id: 'w-subs-05',
            widgetType: 'commerce.subscription-plans',
            widgetVersion: 1,
            placement: { desktop: { colStart: 7, colSpan: 6, rowStart: 1, rowSpan: 7 } },
            config: {
              heading: 'Recurring Memberships & Entitlement Plans',
              highlightReadyToUpgrade: true,
            },
          },
          {
            id: 'w-master-ledger-06',
            widgetType: 'commerce.master-ledger-slot',
            widgetVersion: 1,
            placement: { desktop: { colStart: 1, colSpan: 12, rowStart: 8, rowSpan: 7 } },
            config: {
              heading: 'Universal Master Inventory & Permission Timeslot Matrix',
              showFlags: true,
              showPermissionWindow: true,
            },
          },
        ],
      },
    ];
  }

  // Default Model A: Sports Turf / Racquet Court / Exclusive Resource
  const isKickoff = tenant.id === 't-kickoff-01';
  return [
    {
      id: 'sec-hero-booking-01',
      name: 'Hero Banner & Instant Turf Booking',
      sortOrder: 0,
      compactMode: 'vertical',
      rowUnitPx: 48,
      gapPx: 16,
      style: { backgroundVariant: 'default', paddingY: 'md', fullBleed: false },
      widgets: [
        {
          id: 'w-hero-01',
          widgetType: 'hero.banner',
          widgetVersion: 1,
          placement: { desktop: { colStart: 1, colSpan: 12, rowStart: 1, rowSpan: 7 } },
          config: {
            eyebrow: isKickoff
              ? 'FIFA Quality Pro Synthetic Turf • Indiranagar, Bengaluru'
              : `${tenant.location.name} • ${tenant.location.city}`,
            headline: isKickoff
              ? 'Floodlit 5v5 & 7v7 Football Turfs — Book Online in Seconds'
              : `${tenant.name} — Instant Online Court & Slot Booking`,
            subheadline:
              'Real-time availability, instant slot locking, and seamless UPI checkout with zero double bookings.',
            primaryCtaLabel: 'Select Date & Slot',
            primaryCtaHref: '#book',
            alignment: 'left',
          },
        },
        {
          id: 'w-turf-grid-02',
          widgetType: 'catalog.resource-grid',
          widgetVersion: 1,
          placement: { desktop: { colStart: 1, colSpan: 6, rowStart: 8, rowSpan: 8 } },
          config: {
            heading: 'Our Arenas & Courts',
            columnsDesktop: '2',
            showInstantBookButton: true,
          },
        },
        {
          id: 'w-slot-picker-03',
          widgetType: 'booking.slot-picker',
          widgetVersion: 1,
          placement: { desktop: { colStart: 7, colSpan: 6, rowStart: 8, rowSpan: 8 } },
          config: {
            heading: 'Reserve Your Game Slot',
            bookingModel: 'exclusive_resource',
            showPricingSummary: true,
            dateHorizonDays: 14,
          },
        },
      ],
    },
    {
      id: 'sec-universal-inventory-02',
      name: 'Universal Inventory, Courses, Memberships & Location',
      sortOrder: 1,
      compactMode: 'vertical',
      rowUnitPx: 48,
      gapPx: 16,
      style: { backgroundVariant: 'muted', paddingY: 'md', fullBleed: false },
      widgets: [
        {
          id: 'w-uni-inv-slot-04',
          widgetType: 'commerce.inventory-slot',
          widgetVersion: 1,
          placement: { desktop: { colStart: 1, colSpan: 12, rowStart: 1, rowSpan: 8 } },
          config: {
            heading: 'Available Inventory, Pro Gear, Courses & Memberships (Single-Slot View)',
            filterItemType: 'all',
            displayStyle: 'cards_grid',
            showLiveStockBadge: true,
            enableMixedCart: true,
          },
        },
        {
          id: 'w-loc-05',
          widgetType: 'location.map-hours',
          widgetVersion: 1,
          placement: { desktop: { colStart: 1, colSpan: 12, rowStart: 9, rowSpan: 5 } },
          config: {
            heading: `${tenant.location.name} • Open 6:00 AM – 1:00 AM`,
            showGoogleMapEmbed: true,
            showWhatsappButton: true,
          },
        },
      ],
    },
  ];
}

function createSeededSnapshot(): PlatformRuntimeSnapshot {
  const tenants: MockTenant[] = JSON.parse(JSON.stringify(MOCK_TENANTS));

  const websites: Record<string, TenantWebsiteState> = {};
  for (const tenant of tenants) {
    const sections = buildStarterSectionsForTenant(tenant);
    const theme = buildDefaultThemeForVertical(tenant.vertical);
    websites[tenant.id] = {
      websiteId: `web-${tenant.slug}`,
      tenantId: tenant.id,
      pageId: `page-home-${tenant.slug}`,
      draftRevision: 1,
      draftSections: JSON.parse(JSON.stringify(sections)),
      draftTheme: JSON.parse(JSON.stringify(theme)),
      publishedVersion: tenant.publishedVersion,
      publishedSections: JSON.parse(JSON.stringify(sections)),
      publishedTheme: JSON.parse(JSON.stringify(theme)),
      versions: [
        {
          versionId: `ver-v${tenant.publishedVersion}`,
          versionNumber: tenant.publishedVersion,
          releaseNotes: 'Initial seeded release',
          publishedAtIso: tenant.createdAt,
          sections: JSON.parse(JSON.stringify(sections)),
          theme: JSON.parse(JSON.stringify(theme)),
        },
      ],
      updatedAtIso: tenant.createdAt,
    };
  }

  // Model A Resources
  const resources: CatalogResourceEntity[] = [
    ...MOCK_RESOURCES.map((r) => ({
      id: r.id,
      tenantId: 't-kickoff-01',
      name: r.name,
      type: r.type,
      slotDurationMinutes: r.slotDurationMinutes,
      slotStepMinutes: r.slotStepMinutes,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      basePriceMinor: r.basePriceMinor,
      peakPriceMinor: r.peakPriceMinor,
      description: r.description,
      operatingStartHour: 6,
      operatingEndHour: 24,
      operatingHoursLabel: r.operatingHours,
      isActive: r.isActive,
    })),
    {
      id: 'res-turf-inactive-04',
      tenantId: 't-kickoff-01',
      name: 'Training Pitch 4 (Under Turf Re-laying)',
      type: 'football_turf',
      slotDurationMinutes: 60,
      slotStepMinutes: 30,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      basePriceMinor: 90000,
      peakPriceMinor: 120000,
      description: 'Temporarily closed for maintenance.',
      operatingStartHour: 6,
      operatingEndHour: 22,
      operatingHoursLabel: 'Closed for Maintenance',
      isActive: false,
    },
    {
      id: 'res-apex-court-01',
      tenantId: 't-apex-02',
      name: 'BWF Synthetic Badminton Court 1',
      type: 'badminton_court',
      slotDurationMinutes: 60,
      slotStepMinutes: 60,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      basePriceMinor: 50000,
      peakPriceMinor: 75000,
      description: 'BWF-approved anti-slip synthetic mat with glare-free side lighting.',
      operatingStartHour: 6,
      operatingEndHour: 23,
      operatingHoursLabel: '06:00 AM – 11:00 PM',
      isActive: true,
    },
    {
      id: 'res-apex-court-02',
      tenantId: 't-apex-02',
      name: 'Floodlit Hard Tennis Court',
      type: 'tennis_court',
      slotDurationMinutes: 60,
      slotStepMinutes: 60,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      basePriceMinor: 80000,
      peakPriceMinor: 110000,
      description: 'Championship acrylic cushion surface with coaching ball machine option.',
      operatingStartHour: 6,
      operatingEndHour: 22,
      operatingHoursLabel: '06:00 AM – 10:00 PM',
      isActive: true,
    },
    {
      id: 'res-demo-turf-01',
      tenantId: 't-demo-01',
      name: 'FIFA Pro 7v7 Floodlit Football Turf',
      type: 'football_turf',
      slotDurationMinutes: 60,
      slotStepMinutes: 60,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      basePriceMinor: 150000,
      peakPriceMinor: 220000,
      description: 'FIFA Quality synthetic grass with 1000W LED floodlights, bibs, balls, and changing rooms.',
      operatingStartHour: 6,
      operatingEndHour: 24,
      operatingHoursLabel: '06:00 AM – 12:00 Midnight',
      isActive: true,
    },
    {
      id: 'res-demo-box-02',
      tenantId: 't-demo-01',
      name: 'High-Net Box Cricket Arena',
      type: 'box_cricket',
      slotDurationMinutes: 60,
      slotStepMinutes: 60,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      basePriceMinor: 120000,
      peakPriceMinor: 180000,
      description: 'Enclosed 360-degree turf arena with spring stumps, leather/tennis balls, and umpire stands.',
      operatingStartHour: 6,
      operatingEndHour: 24,
      operatingHoursLabel: '06:00 AM – 12:00 Midnight',
      isActive: true,
    },
    {
      id: 'res-demo-badminton-03',
      tenantId: 't-demo-01',
      name: 'BWF Professional Badminton Court',
      type: 'badminton_court',
      slotDurationMinutes: 60,
      slotStepMinutes: 60,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      basePriceMinor: 60000,
      peakPriceMinor: 90000,
      description: 'Anti-skid synthetic mat court with shadowless side lighting and non-marking shoe rental.',
      operatingStartHour: 6,
      operatingEndHour: 23,
      operatingHoursLabel: '06:00 AM – 11:00 PM',
      isActive: true,
    },
  ];

  // Model B Services & Staff (SmileCraft Clinic & Aura Salon)
  const services: CatalogServiceEntity[] = [
    {
      id: 'srv-dental-consult',
      tenantId: 't-smilecraft-03',
      name: 'Dental Consultation & Digital X-Ray',
      description: 'Comprehensive oral checkup, intraoral scan, and personalised treatment plan.',
      durationMinutes: 30,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 15, // 15-min chair sterilization buffer!
      priceMinor: 80000, // ₹800
      isActive: true,
    },
    {
      id: 'srv-root-canal',
      tenantId: 't-smilecraft-03',
      name: 'Microscopic Root Canal Therapy',
      description: 'Single-sitting painless endodontic session under dental loupes.',
      durationMinutes: 60,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 15,
      priceMinor: 450000, // ₹4,500
      isActive: true,
    },
    {
      id: 'srv-teeth-whitening',
      tenantId: 't-smilecraft-03',
      name: 'Laser Teeth Scaling & Whitening',
      description: 'Ultrasonic scaling, polishing, and enamel-safe shade brightening.',
      durationMinutes: 45,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 15,
      priceMinor: 320000, // ₹3,200
      isActive: true,
    },
    {
      id: 'srv-salon-haircut',
      tenantId: 't-aura-04',
      name: 'Creative Director Haircut & Blowdry',
      description: 'Consultation, Kerastase wash, precision cut, and signature styling.',
      durationMinutes: 45,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 15,
      priceMinor: 150000, // ₹1,500
      isActive: true,
    },
    {
      id: 'srv-salon-spa',
      tenantId: 't-aura-04',
      name: 'Aromatherapy Deep Tissue Spa (60m)',
      description: 'Full-body Swedish & Balinese therapeutic massage.',
      durationMinutes: 60,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 15,
      priceMinor: 280000, // ₹2,800
      isActive: true,
    },
  ];

  const staffMembers: CatalogStaffEntity[] = [
    {
      id: 'st-doctor-01',
      tenantId: 't-smilecraft-03',
      displayName: 'Dr. Ananya Iyer (MDS Endodontist)',
      specialty: 'Chief Dental Surgeon • 12 yrs exp',
      serviceIds: ['srv-dental-consult', 'srv-root-canal', 'srv-teeth-whitening'],
      workingStartHour: 10,
      workingEndHour: 19,
      breakHour: 13,
      exceptions: [],
      isActive: true,
    },
    {
      id: 'st-doctor-02',
      tenantId: 't-smilecraft-03',
      displayName: 'Dr. Rajesh Menon (BDS Implantologist)',
      specialty: 'Cosmetic & Implant Specialist • 9 yrs exp',
      serviceIds: ['srv-dental-consult', 'srv-teeth-whitening'],
      workingStartHour: 10,
      workingEndHour: 19,
      breakHour: 13,
      exceptions: [
        {
          id: 'exc-conf-01',
          dateLocal: '2026-11-08',
          isUnavailable: true,
          reason: 'Attending IDA National Dental Conference',
        },
      ],
      isActive: true,
    },
    {
      id: 'st-stylist-01',
      tenantId: 't-aura-04',
      displayName: 'Kabir Malhotra (Creative Director)',
      specialty: 'Senior Hair & Color Specialist',
      serviceIds: ['srv-salon-haircut', 'srv-salon-spa'],
      workingStartHour: 10,
      workingEndHour: 20,
      breakHour: 14,
      exceptions: [],
      isActive: true,
    },
  ];

  // Model C Capacity Sessions
  const sessions: CatalogSessionEntity[] = [
    {
      id: 'sess-morning-yoga-01',
      tenantId: 't-prana-05',
      name: 'Morning Ashtanga Vinyasa Flow',
      instructorName: 'Meera Krishnan',
      description: 'Energising breath-synchronised flow suitable for all levels.',
      dateLocal: '*',
      startTime: '07:00',
      endTime: '08:00',
      maxCapacity: 20,
      bookedCount: 8,
      heldCount: 0,
      priceMinor: 49900, // ₹499
      isActive: true,
    },
    {
      id: 'sess-evening-strength-02',
      tenantId: 't-prana-05',
      name: 'Evening Power Yoga & Core Conditioning',
      instructorName: 'Arjun Rao',
      description: 'High-intensity mobility and isometric strength conditioning.',
      dateLocal: '*',
      startTime: '18:30',
      endTime: '19:30',
      maxCapacity: 15,
      bookedCount: 9,
      heldCount: 0,
      priceMinor: 59900, // ₹599
      isActive: true,
    },
    {
      id: 'sess-final-seat-04',
      tenantId: 't-prana-05',
      name: 'Sunset Pranayama & Sound Healing',
      instructorName: 'Meera Krishnan',
      description: 'Guided breathwork and Tibetan singing bowl relaxation (almost full!).',
      dateLocal: '*',
      startTime: '19:45',
      endTime: '20:45',
      maxCapacity: 20,
      bookedCount: 19, // Only 1 seat remaining!
      heldCount: 0,
      priceMinor: 49900, // ₹499
      isActive: true,
    },
    {
      id: 'sess-limited-03',
      tenantId: 't-aura-04',
      name: 'Sound Bath & Breathwork Workshop',
      instructorName: 'Kabir Malhotra',
      description: 'Group wellness workshop.',
      dateLocal: '*',
      startTime: '17:00',
      endTime: '18:00',
      maxCapacity: 20,
      bookedCount: 0,
      heldCount: 0,
      priceMinor: 49900,
      isActive: true,
    },
  ];

  // Convert MOCK_BOOKINGS into RuntimeBookingRecord + RuntimeAllocation
  const bookings: RuntimeBookingRecord[] = [];
  const allocations: RuntimeAllocation[] = [];

  const resourceNameMap: Record<string, string> = {
    'FIFA Synthetic Turf 1 (7v7)': 'res-turf-01',
    'FIFA Pro Synthetic Turf 1 (7v7)': 'res-turf-01',
    'Floodlit Turf 2 (5v5)': 'res-turf-02',
    'Floodlit Fast Turf 2 (5v5)': 'res-turf-02',
    'Box Cricket Arena': 'res-cricket-03',
    'Enclosed Box Cricket Arena': 'res-cricket-03',
  };

  for (const mb of MOCK_BOOKINGS) {
    const resourceId = resourceNameMap[mb.resourceOrServiceName] ?? 'res-turf-01';
    const canonicalRes = resources.find((r) => r.id === resourceId);
    const startsAtIso = `${mb.date}T${mb.startTime}:00.000+05:30`;
    const endsAtIso = `${mb.date}T${mb.endTime}:00.000+05:30`;
    const startsAtMs = new Date(startsAtIso).getTime();
    const endsAtMs = new Date(endsAtIso).getTime();
    const allocId = `alloc-seed-${mb.id}`;
    const expiresAtMs = Date.now() + 8 * 60 * 1000;

    const allocStatus: RuntimeAllocation['status'] =
      mb.status === 'cancelled'
        ? 'released'
        : mb.status === 'temporarily_held'
        ? 'held'
        : 'confirmed';

    allocations.push({
      id: allocId,
      tenantId: mb.tenantId,
      bookingId: mb.id,
      bookingModel: mb.bookingModel,
      resourceId,
      quantity: 1,
      startsAtMs,
      endsAtMs,
      bufferStartsAtMs: startsAtMs,
      bufferEndsAtMs: endsAtMs,
      expiresAtMs,
      status: allocStatus,
    });

    bookings.push({
      bookingId: mb.id,
      bookingNumber: mb.bookingNumber,
      tenantId: mb.tenantId,
      locationId: 'loc-kickoff-01',
      bookingModel: mb.bookingModel,
      idempotencyKey: `seed-idem-${mb.id}`,
      payloadFingerprint: `seed-fp-${mb.id}`,
      holdId: `hold-${mb.id}`,
      holdToken: `ht_seed_${mb.id}`,
      status: mb.status,
      paymentStatus: mb.paymentStatus,
      paymentMethod: mb.paymentMethod,
      expiresAtIso: new Date(expiresAtMs).toISOString(),
      totalMinor: mb.amountMinor,
      currency: 'INR',
      customerName: mb.customerName,
      customerPhone: mb.customerPhone,
      customerEmail: mb.customerEmail,
      notes: mb.notes,
      resourceOrServiceName: canonicalRes?.name ?? mb.resourceOrServiceName,
      courtOrRoom: mb.courtOrRoom,
      dateLocal: mb.date,
      startTime: mb.startTime,
      endTime: mb.endTime,
      startsAtIso,
      endsAtIso,
      resourceId,
      quantity: 1,
      allocationId: allocId,
      createdAtIso: mb.createdAt,
    });
  }

  // Seed Universal Commerce & Entitlement Layer (Entity -> Sub_entity -> Category -> CatalogueItems -> Inventory -> Entitlements)
  const businessUnits: RuntimeBusinessUnit[] = [
    {
      id: 'bu-omni-retail-01',
      tenantId: 't-uni-06',
      name: 'OmniFresh Dairy & Tech Retail',
      slug: 'omnifresh-retail',
      domainVertical: 'retail_electronics',
      flag1: 'instant_fulfilment',
      flag2: 'verified_stock',
      status: 'active',
    },
    {
      id: 'bu-omni-arena-02',
      tenantId: 't-uni-06',
      name: 'OmniSports Turf & Fitness Arena',
      slug: 'omnisports-arena',
      domainVertical: 'sports_fitness',
      flag1: 'gist_protected',
      flag2: 'peak_floodlit',
      status: 'active',
    },
    {
      id: 'bu-omni-academy-03',
      tenantId: 't-uni-06',
      name: 'OmniLearn Digital Academy',
      slug: 'omnilearn-academy',
      domainVertical: 'edtech_courses',
      flag1: 'time_bounded_access',
      flag2: '90_day_window',
      status: 'active',
    },
    {
      id: 'bu-kickoff-proshop-01',
      tenantId: 't-kickoff-01',
      name: 'Kickoff Arena & Pro Store',
      slug: 'kickoff-proshop',
      domainVertical: 'sports_turf',
      flag1: 'fifa_certified',
      flag2: 'instant_slot',
      status: 'active',
    },
    {
      id: 'bu-demo-velocity-01',
      tenantId: 't-demo-01',
      name: 'Velocity Turf, Dairy, Tech & Academy Hub',
      slug: 'velocity-hub',
      domainVertical: 'universal_commerce',
      flag1: 'multi_vertical',
      flag2: 'showcase_ready',
      status: 'active',
    },
  ];

  const categories: RuntimeCategory[] = [
    {
      id: 'cat-dairy-grocery',
      tenantId: 't-uni-06',
      businessUnitId: 'bu-omni-retail-01',
      name: 'Dairy & Daily Essentials',
      slug: 'dairy-daily-essentials',
      sortOrder: 1,
      isActive: true,
    },
    {
      id: 'cat-electronics-laptops',
      tenantId: 't-uni-06',
      businessUnitId: 'bu-omni-retail-01',
      name: 'Laptops & Electronics',
      slug: 'laptops-electronics',
      sortOrder: 2,
      isActive: true,
    },
    {
      id: 'cat-turf-slots',
      tenantId: 't-uni-06',
      businessUnitId: 'bu-omni-arena-02',
      name: 'Turf, Doctor & Yoga Slots',
      slug: 'turf-doctor-yoga-slots',
      sortOrder: 3,
      isActive: true,
    },
    {
      id: 'cat-digital-courses',
      tenantId: 't-uni-06',
      businessUnitId: 'bu-omni-academy-03',
      name: 'Courses & Digital Content (90-Day Access)',
      slug: 'digital-courses',
      sortOrder: 4,
      isActive: true,
    },
    {
      id: 'cat-memberships',
      tenantId: 't-uni-06',
      businessUnitId: 'bu-omni-academy-03',
      name: 'Subscriptions & Recurring Entitlements',
      slug: 'subscriptions-memberships',
      sortOrder: 5,
      isActive: true,
    },
  ];

  // Add universal resources & sessions for OmniMarket (t-uni-06) and Velocity (t-demo-01)
  resources.push({
    id: 'res-omni-turf-01',
    tenantId: 't-uni-06',
    name: 'Cricket Turf 1 (Floodlit 7v7 & Box Cricket)',
    type: 'cricket_turf',
    slotDurationMinutes: 60,
    slotStepMinutes: 60,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
    basePriceMinor: 120000,
    peakPriceMinor: 160000,
    description: 'Exclusive floodlit cricket & football turf with electronic scoreboard.',
    operatingStartHour: 6,
    operatingEndHour: 24,
    operatingHoursLabel: '06:00 AM – 12:00 Midnight',
    isActive: true,
  });

  sessions.push({
    id: 'sess-omni-yoga-20',
    tenantId: 't-uni-06',
    name: 'Morning Hatha Yoga Class (20-Seat Studio)',
    instructorName: 'Acharya Kavya',
    description: '20-person capacity group yoga session with live seat ceiling enforcement.',
    dateLocal: '*',
    startTime: '07:00',
    endTime: '08:00',
    maxCapacity: 20,
    bookedCount: 18,
    heldCount: 0,
    priceMinor: 49900,
    isActive: true,
  });

  // Helper to seed universal catalogue items for a target tenant
  const seedCatalogueForTenant = (
    targetTenantId: string,
    domainName: string,
    turfResourceId: string,
    yogaSessionId: string,
  ): { items: RuntimeCatalogueItem[]; inv: RuntimeInventoryItem[] } => {
    const suffix = targetTenantId.replace(/[^a-z0-9]/gi, '');
    const items: RuntimeCatalogueItem[] = [
      {
        id: `ci-milk-1l-${suffix}`,
        tenantId: targetTenantId,
        businessUnitId: 'bu-omni-retail-01',
        categoryId: 'cat-dairy-grocery',
        categoryName: 'Dairy & Daily Essentials',
        subEntityName: 'Fresh Dairy Division',
        domainName,
        itemType: 'physical_product',
        fulfilmentType: 'physical_delivery',
        billingModel: 'one_time',
        name: 'Farm Fresh A2 Organic Cow Milk (1 Litre)',
        slug: `farm-fresh-milk-1l-${suffix}`,
        sku: `MILK-1L-${suffix.toUpperCase()}`,
        shortDescription: 'Chilled farm-to-door A2 cow milk pouch. Order 1L, 2L, or more with instant stock lock.',
        description:
          'Pasteurized organic A2 cow milk delivered chilled in eco-pouches. Stock is reserved during checkout and dispatched via local morning delivery.',
        flag1: 'perishable_daily',
        flag2: 'cold_chain_delivery',
        status: 'active',
        priceMinor: 7500, // ₹75 per litre
        compareAtPriceMinor: 8500,
        currency: 'INR',
        unitLabel: 'litre',
        badgeText: '50 Litres In Stock',
      },
      {
        id: `ci-laptop-pro15-${suffix}`,
        tenantId: targetTenantId,
        businessUnitId: 'bu-omni-retail-01',
        categoryId: 'cat-electronics-laptops',
        categoryName: 'Laptops & Electronics',
        subEntityName: 'TechNova Electronics Division',
        domainName,
        itemType: 'physical_product',
        fulfilmentType: 'physical_delivery',
        billingModel: 'one_time',
        name: 'ProBook Ultra 15 Laptop (16GB RAM / 512GB NVMe)',
        slug: `probook-ultra-15-laptop-${suffix}`,
        sku: `LAPTOP-PRO15-${suffix.toUpperCase()}`,
        shortDescription: 'High-performance developer & creator laptop with 8-min checkout stock reservation.',
        description:
          '15.6-inch 120Hz OLED display, 16GB LPDDR5X RAM, 512GB PCIe Gen4 SSD. Supports home courier delivery or instant store pickup.',
        flag1: 'electronics_serialised',
        flag2: 'warranty_1yr',
        status: 'active',
        priceMinor: 7499900, // ₹74,999
        compareAtPriceMinor: 8299900,
        currency: 'INR',
        unitLabel: 'unit',
        badgeText: '5 Units Available',
      },
      {
        id: `ci-turf-slot-${suffix}`,
        tenantId: targetTenantId,
        businessUnitId: 'bu-omni-arena-02',
        categoryId: 'cat-turf-slots',
        categoryName: 'Sports Turf & Court Slots',
        subEntityName: 'Sports Arena Division',
        domainName,
        itemType: 'bookable_resource',
        fulfilmentType: 'time_slot_reservation',
        billingModel: 'time_slot',
        name: 'Cricket Turf 1 — Exclusive 1-Hour Floodlit Slot',
        slug: `cricket-turf-1-slot-${suffix}`,
        sku: `TURF-1-SLOT-${suffix.toUpperCase()}`,
        shortDescription: 'Permission to use Cricket Turf 1 for an exclusive 60-min time slot (e.g., 7:00 PM – 8:00 PM).',
        description:
          'Protected by PostgreSQL GiST exclusion locks so two customers can never overlap on the same turf interval.',
        flag1: 'exclusive_resource',
        flag2: 'gist_overlap_guard',
        status: 'active',
        priceMinor: 150000, // ₹1,500/hr
        currency: 'INR',
        unitLabel: 'hour slot',
        resourceId: turfResourceId,
        badgeText: 'Live GiST Slot Lock',
      },
      {
        id: `ci-doctor-appt-${suffix}`,
        tenantId: targetTenantId,
        businessUnitId: 'bu-omni-arena-02',
        categoryId: 'cat-turf-slots',
        categoryName: 'Clinical & Specialist Appointments',
        subEntityName: 'Health & Wellness Clinic',
        domainName,
        itemType: 'service_appointment',
        fulfilmentType: 'time_slot_reservation',
        billingModel: 'time_slot',
        name: 'Specialist Doctor Consultation (30-Min Slot)',
        slug: `specialist-doctor-consultation-${suffix}`,
        sku: `DOC-APPT-30-${suffix.toUpperCase()}`,
        shortDescription: '1-on-1 clinical consultation slot with automatic 15-min sterilization buffer.',
        description: 'Book a verified practitioner appointment slot with instant calendar confirmation.',
        flag1: 'staff_appointment',
        flag2: 'buffer_15m',
        status: 'active',
        priceMinor: 80000, // ₹800
        currency: 'INR',
        unitLabel: 'appointment',
        serviceId: 'srv-dental-consult',
        badgeText: 'Practitioner Slot',
      },
      {
        id: `ci-yoga-class-${suffix}`,
        tenantId: targetTenantId,
        businessUnitId: 'bu-omni-arena-02',
        categoryId: 'cat-turf-slots',
        categoryName: 'Fitness & Group Batches',
        subEntityName: 'Mindfulness & Fitness Studio',
        domainName,
        itemType: 'capacity_session',
        fulfilmentType: 'session_seat',
        billingModel: 'time_slot',
        name: 'Morning Hatha Yoga Class (20-Person Capacity)',
        slug: `morning-yoga-class-20-${suffix}`,
        sku: `YOGA-BATCH-20-${suffix.toUpperCase()}`,
        shortDescription: 'Reserve your mat in our 20-seat yoga batch. Hard capacity ceiling prevents overbooking.',
        description: 'Scheduled group session with real-time remaining seat counter.',
        flag1: 'capacity_session',
        flag2: 'max_20_seats',
        status: 'active',
        priceMinor: 49900, // ₹499
        currency: 'INR',
        unitLabel: 'seat',
        sessionId: yogaSessionId,
         badgeText: '20-Seat Capacity Cap',
      },
      {
        id: `ci-course-python90-${suffix}`,
        tenantId: targetTenantId,
        businessUnitId: 'bu-omni-academy-03',
        categoryId: 'cat-digital-courses',
        categoryName: 'Courses & Digital Content (90-Day Access)',
        subEntityName: 'Digital Learning Academy',
        domainName,
        itemType: 'digital_content',
        fulfilmentType: 'digital_instant_access',
        billingModel: 'fixed_duration_access',
        name: 'Full-Stack AI & Python Masterclass (90-Day Viewing Permission)',
        slug: `fullstack-ai-python-90d-${suffix}`,
        sku: `COURSE-PY-90D-${suffix.toUpperCase()}`,
        shortDescription: 'Instant permission to view 42 HD modules & labs for 90 days from purchase.',
        description:
          'Grants an immediate time-bounded digital entitlement (permission_timeslot_start = now, permission_timeslot_end = now + 90 days) that automatically expires after 90 days.',
        flag1: 'digital_course',
        flag2: '90_day_permission',
        status: 'active',
        priceMinor: 299900, // ₹2,999
        compareAtPriceMinor: 499900,
        currency: 'INR',
        unitLabel: '90-day access',
        accessDurationDays: 90,
        badgeText: '90-Day Viewing Right',
      },
      {
        id: `ci-sub-pro-monthly-${suffix}`,
        tenantId: targetTenantId,
        businessUnitId: 'bu-omni-academy-03',
        categoryId: 'cat-memberships',
        categoryName: 'Subscriptions & Recurring Entitlements',
        subEntityName: 'All-Access Membership Club',
        domainName,
        itemType: 'subscription_plan',
        fulfilmentType: 'recurring_entitlement',
        billingModel: 'recurring_subscription',
        name: 'OmniPass Pro Monthly Membership (Unlimited Courses + Priority Turf)',
        slug: `omnipass-pro-monthly-${suffix}`,
        sku: `SUB-PRO-MO-${suffix.toUpperCase()}`,
        shortDescription: 'Recurring monthly entitlement. Auto-renews on payment; retains access until paid-through date on cancel.',
        description:
          'Includes unlimited digital catalogue viewing and 4 priority turf/class credits every billing cycle.',
        flag1: 'recurring_monthly',
        flag2: 'ready_to_upgrade_tier',
        status: 'active',
        priceMinor: 199900, // ₹1,999/month
        currency: 'INR',
        unitLabel: 'month',
        billingInterval: 'monthly',
        accessDurationDays: 30,
        includedUsageUnits: 30,
        badgeText: 'Recurring Entitlement',
      },
      {
        id: `ci-dormant-drone-${suffix}`,
        tenantId: targetTenantId,
        businessUnitId: 'bu-omni-retail-01',
        categoryId: 'cat-electronics-laptops',
        categoryName: 'Laptops & Electronics',
        subEntityName: 'TechNova Electronics Division',
        domainName,
        itemType: 'physical_product',
        fulfilmentType: 'physical_delivery',
        billingModel: 'one_time',
        name: 'Autonomous 4K Sports Tracking Drone (Next-Gen)',
        slug: `autonomous-sports-drone-${suffix}`,
        sku: `DRONE-4K-${suffix.toUpperCase()}`,
        shortDescription: 'Pre-configured seasonal catalogue item currently in dormant status.',
        description: 'Demonstrates dormant status in the Master Data Table before public activation.',
        flag1: 'seasonal_launch',
        flag2: 'pre_order_soon',
        status: 'dormant',
        priceMinor: 4599900,
        currency: 'INR',
        unitLabel: 'unit',
        badgeText: 'Dormant (Upcoming)',
      },
    ];

    const inv: RuntimeInventoryItem[] = [
      {
        id: `inv-milk-${suffix}`,
        tenantId: targetTenantId,
        catalogueItemId: `ci-milk-1l-${suffix}`,
        sku: `MILK-1L-${suffix.toUpperCase()}`,
        unitLabel: 'litre',
        quantityOnHand: 50,
        quantityReserved: 0,
        lowStockThreshold: 10,
        allowBackorder: false,
        updatedAtIso: new Date().toISOString(),
      },
      {
        id: `inv-laptop-${suffix}`,
        tenantId: targetTenantId,
        catalogueItemId: `ci-laptop-pro15-${suffix}`,
        sku: `LAPTOP-PRO15-${suffix.toUpperCase()}`,
        unitLabel: 'unit',
        quantityOnHand: 5,
        quantityReserved: 0,
        lowStockThreshold: 2,
        allowBackorder: false,
        updatedAtIso: new Date().toISOString(),
      },
    ];

    return { items, inv };
  };

  const catalogueItems: RuntimeCatalogueItem[] = [];
  const inventoryItems: RuntimeInventoryItem[] = [];

  for (const t of tenants) {
    const turfRes =
      t.id === 't-demo-01'
        ? 'res-demo-turf-01'
        : t.id === 't-uni-06'
        ? 'res-omni-turf-01'
        : t.id === 't-apex-02'
        ? 'res-apex-court-01'
        : 'res-turf-01';
    const yogaSess =
      t.id === 't-uni-06' ? 'sess-omni-yoga-20' : 'sess-morning-yoga-01';

    const seeded = seedCatalogueForTenant(
      t.id,
      t.customDomain ?? `${t.slug}.build-any-website.vercel.app`,
      turfRes,
      yogaSess,
    );
    catalogueItems.push(...seeded.items);
    inventoryItems.push(...seeded.inv);
  }

  // Seed representative customer entitlements demonstrating `active`, `ready_to_upgrade`, and `expired` states
  const nowMs = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const entitlements: RuntimeEntitlementRecord[] = [
    {
      id: 'ent-seed-course-active-01',
      tenantId: 't-uni-06',
      businessUnitId: 'bu-omni-academy-03',
      catalogueItemId: 'ci-course-python90-tuni06',
      itemName: 'Full-Stack AI & Python Masterclass (90-Day Viewing Permission)',
      customerName: 'Aarav Sharma',
      customerPhone: '+91 98450 11223',
      customerEmail: 'aarav.sharma@example.com',
      entitlementType: 'digital_content_access',
      permissionTimeslotStartIso: new Date(nowMs - 10 * dayMs).toISOString(),
      permissionTimeslotEndIso: new Date(nowMs + 80 * dayMs).toISOString(),
      maxUsageCount: null,
      consumedUsageCount: 14,
      status: 'active',
      flag1: 'digital_course',
      flag2: '90_day_permission',
      createdAtIso: new Date(nowMs - 10 * dayMs).toISOString(),
      updatedAtIso: new Date(nowMs - 1 * dayMs).toISOString(),
    },
    {
      id: 'ent-seed-upgrade-ready-02',
      tenantId: 't-uni-06',
      businessUnitId: 'bu-omni-academy-03',
      catalogueItemId: 'ci-sub-pro-monthly-tuni06',
      itemName: 'OmniPass Pro Monthly Membership (Unlimited Courses + Priority Turf)',
      customerName: 'Divya Nair',
      customerPhone: '+91 98801 44556',
      customerEmail: 'divya.nair@example.com',
      entitlementType: 'membership_access',
      permissionTimeslotStartIso: new Date(nowMs - 26 * dayMs).toISOString(),
      permissionTimeslotEndIso: new Date(nowMs + 4 * dayMs).toISOString(),
      maxUsageCount: 30,
      consumedUsageCount: 28,
      status: 'ready_to_upgrade',
      flag1: 'annual_upgrade_discount_20pct',
      flag2: 'near_usage_threshold',
      createdAtIso: new Date(nowMs - 26 * dayMs).toISOString(),
      updatedAtIso: new Date(nowMs).toISOString(),
    },
    {
      id: 'ent-seed-kickoff-course-03',
      tenantId: 't-kickoff-01',
      businessUnitId: 'bu-kickoff-proshop-01',
      catalogueItemId: 'ci-course-python90-tkickoff01',
      itemName: 'Full-Stack AI & Python Masterclass (90-Day Viewing Permission)',
      customerName: 'Vikramaditya Rao',
      customerPhone: '+91 98450 99001',
      entitlementType: 'digital_content_access',
      permissionTimeslotStartIso: new Date(nowMs - 5 * dayMs).toISOString(),
      permissionTimeslotEndIso: new Date(nowMs + 85 * dayMs).toISOString(),
      maxUsageCount: null,
      consumedUsageCount: 6,
      status: 'active',
      flag1: 'digital_course',
      flag2: '90_day_permission',
      createdAtIso: new Date(nowMs - 5 * dayMs).toISOString(),
      updatedAtIso: new Date(nowMs).toISOString(),
    },
  ];

  const customerSubscriptions: RuntimeCustomerSubscription[] = [
    {
      id: 'sub-seed-omni-01',
      tenantId: 't-uni-06',
      catalogueItemId: 'ci-sub-pro-monthly-tuni06',
      planName: 'OmniPass Pro Monthly Membership',
      customerName: 'Divya Nair',
      customerPhone: '+91 98801 44556',
      customerEmail: 'divya.nair@example.com',
      priceMinor: 199900,
      currency: 'INR',
      billingInterval: 'monthly',
      status: 'active',
      currentPeriodStartIso: new Date(nowMs - 26 * dayMs).toISOString(),
      currentPeriodEndIso: new Date(nowMs + 4 * dayMs).toISOString(),
      cancelAtPeriodEnd: false,
      linkedEntitlementId: 'ent-seed-upgrade-ready-02',
      createdAtIso: new Date(nowMs - 26 * dayMs).toISOString(),
      updatedAtIso: new Date(nowMs).toISOString(),
    },
  ];

  return {
    tenants,
    websites,
    resources,
    services,
    staffMembers,
    sessions,
    bookings,
    allocations,
    payments: [],
    refunds: [],
    processedWebhookKeys: [],
    notifications: [],
    auditLogs: [],
    businessUnits,
    categories,
    catalogueItems,
    inventoryItems,
    inventoryReservations: [],
    inventoryMovements: [],
    orders: [],
    fulfilments: [],
    entitlements,
    customerSubscriptions,
  };
}

function isVitestEnvironment(): boolean {
  return Boolean(process.env.VITEST);
}

function ensureUniversalCommerceCollections(snapshot: PlatformRuntimeSnapshot): PlatformRuntimeSnapshot {
  if (
    !Array.isArray(snapshot.catalogueItems) ||
    snapshot.catalogueItems.length === 0 ||
    !snapshot.tenants.some((t) => t.id === 't-uni-06')
  ) {
    const fresh = createSeededSnapshot();
    snapshot.businessUnits = snapshot.businessUnits?.length ? snapshot.businessUnits : fresh.businessUnits;
    snapshot.categories = snapshot.categories?.length ? snapshot.categories : fresh.categories;
    snapshot.catalogueItems = snapshot.catalogueItems?.length ? snapshot.catalogueItems : fresh.catalogueItems;
    snapshot.inventoryItems = snapshot.inventoryItems?.length ? snapshot.inventoryItems : fresh.inventoryItems;
    snapshot.inventoryReservations = snapshot.inventoryReservations ?? [];
    snapshot.inventoryMovements = snapshot.inventoryMovements ?? [];
    snapshot.orders = snapshot.orders ?? [];
    snapshot.fulfilments = snapshot.fulfilments ?? [];
    snapshot.entitlements = snapshot.entitlements?.length ? snapshot.entitlements : fresh.entitlements;
    snapshot.customerSubscriptions = snapshot.customerSubscriptions?.length
      ? snapshot.customerSubscriptions
      : fresh.customerSubscriptions;

    for (const ft of fresh.tenants) {
      if (!snapshot.tenants.some((et) => et.id === ft.id)) {
        snapshot.tenants.push(ft);
      }
      if (!snapshot.websites[ft.id] && fresh.websites[ft.id]) {
        snapshot.websites[ft.id] = fresh.websites[ft.id]!;
      }
    }
    for (const fr of fresh.resources) {
      if (!snapshot.resources.some((er) => er.id === fr.id)) {
        snapshot.resources.push(fr);
      }
    }
    for (const fs of fresh.sessions) {
      if (!snapshot.sessions.some((es) => es.id === fs.id)) {
        snapshot.sessions.push(fs);
      }
    }
  }
  return snapshot;
}

export function seedStarterWebsiteAndCatalogForNewTenant(
  state: PlatformRuntimeSnapshot,
  tenant: MockTenant,
): void {
  const sections = buildStarterSectionsForTenant(tenant);
  const theme = buildDefaultThemeForVertical(tenant.vertical);
  state.websites[tenant.id] = {
    websiteId: `web-${tenant.slug}`,
    tenantId: tenant.id,
    pageId: `page-home-${tenant.slug}`,
    draftRevision: 1,
    draftSections: JSON.parse(JSON.stringify(sections)),
    draftTheme: JSON.parse(JSON.stringify(theme)),
    publishedVersion: tenant.publishedVersion,
    publishedSections: JSON.parse(JSON.stringify(sections)),
    publishedTheme: JSON.parse(JSON.stringify(theme)),
    versions: [
      {
        versionId: `ver-v${tenant.publishedVersion}`,
        versionNumber: tenant.publishedVersion,
        releaseNotes: 'Initial provisioned starter layout',
        publishedAtIso: tenant.createdAt,
        sections: JSON.parse(JSON.stringify(sections)),
        theme: JSON.parse(JSON.stringify(theme)),
      },
    ],
    updatedAtIso: tenant.createdAt,
  };

  if (tenant.vertical === 'clinic_healthcare' || tenant.vertical === 'salon_beauty') {
    const srvId = `srv-${tenant.slug}-01`;
    const stId = `st-${tenant.slug}-01`;
    state.services.push({
      id: srvId,
      tenantId: tenant.id,
      name:
        tenant.vertical === 'clinic_healthcare'
          ? 'Specialist Consultation (30m)'
          : 'Signature Service & Styling (45m)',
      description: 'Standard appointment consultation and treatment.',
      durationMinutes: tenant.vertical === 'clinic_healthcare' ? 30 : 45,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 15,
      priceMinor: 90000,
      isActive: true,
    });
    state.staffMembers.push({
      id: stId,
      tenantId: tenant.id,
      displayName:
        tenant.vertical === 'clinic_healthcare'
          ? 'Dr. Lead Specialist'
          : 'Senior Lead Stylist',
      specialty: 'Primary Practitioner',
      serviceIds: [srvId],
      workingStartHour: 10,
      workingEndHour: 19,
      breakHour: 13,
      exceptions: [],
      isActive: true,
    });
  } else if (tenant.vertical === 'fitness_yoga') {
    state.sessions.push({
      id: `sess-${tenant.slug}-01`,
      tenantId: tenant.id,
      name: 'Signature Group Batch',
      instructorName: 'Lead Studio Coach',
      description: 'Daily group fitness & mindfulness session.',
      dateLocal: '*',
      startTime: '07:30',
      endTime: '08:30',
      maxCapacity: 20,
      bookedCount: 0,
      heldCount: 0,
      priceMinor: 49900,
      isActive: true,
    });
  } else {
    state.resources.push({
      id: `res-${tenant.slug}-01`,
      tenantId: tenant.id,
      name: `${tenant.name} — Arena 1`,
      type: tenant.vertical,
      slotDurationMinutes: 60,
      slotStepMinutes: 60,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      basePriceMinor: 100000,
      peakPriceMinor: 150000,
      description: 'Primary floodlit arena configured during onboarding.',
      operatingStartHour: 6,
      operatingEndHour: 23,
      operatingHoursLabel: '06:00 AM – 11:00 PM',
      isActive: true,
    });
  }
}

export class RuntimeStateRepository {
  private static persistTimer: NodeJS.Timeout | null = null;
  private static isWriting = false;

  public static getState(): PlatformRuntimeSnapshot {
    if (isVitestEnvironment()) {
      if (!globalThis.__smbRuntimeSnapshot) {
        globalThis.__smbRuntimeSnapshot = createSeededSnapshot();
      }
      return globalThis.__smbRuntimeSnapshot;
    }

    // In Next.js dev/prod server, synchronize across RSC and API workers via .runtime-state.json
    try {
      if (existsSync(RUNTIME_FILE_PATH)) {
        const stat = statSync(RUNTIME_FILE_PATH);
        if (
          !globalThis.__smbRuntimeSnapshot ||
          globalThis.__smbRuntimeMtimeMs !== stat.mtimeMs
        ) {
          const raw = readFileSync(RUNTIME_FILE_PATH, 'utf8');
          globalThis.__smbRuntimeSnapshot = ensureUniversalCommerceCollections(
            JSON.parse(raw) as PlatformRuntimeSnapshot,
          );
          globalThis.__smbRuntimeMtimeMs = stat.mtimeMs;
        }
        return globalThis.__smbRuntimeSnapshot;
      }
    } catch {
      // Fallback to in-memory snapshot if file is unreadable
    }

    if (!globalThis.__smbRuntimeSnapshot) {
      globalThis.__smbRuntimeSnapshot = createSeededSnapshot();
      RuntimeStateRepository.persist(true);
    }
    return globalThis.__smbRuntimeSnapshot;
  }

  public static persist(immediate = false): void {
    if (isVitestEnvironment() || !globalThis.__smbRuntimeSnapshot) {
      return;
    }

    if (immediate) {
      if (RuntimeStateRepository.persistTimer) {
        clearTimeout(RuntimeStateRepository.persistTimer);
        RuntimeStateRepository.persistTimer = null;
      }
      RuntimeStateRepository.flushSync();
      return;
    }

    if (!RuntimeStateRepository.persistTimer) {
      RuntimeStateRepository.persistTimer = setTimeout(() => {
        RuntimeStateRepository.persistTimer = null;
        RuntimeStateRepository.flushSync();
      }, 50);
    }
  }

  private static flushSync(): void {
    if (RuntimeStateRepository.isWriting || !globalThis.__smbRuntimeSnapshot) {
      return;
    }
    RuntimeStateRepository.isWriting = true;
    try {
      const payload = JSON.stringify(globalThis.__smbRuntimeSnapshot, null, 2);
      writeFileSync(RUNTIME_FILE_PATH, payload, 'utf8');
      const stat = statSync(RUNTIME_FILE_PATH);
      globalThis.__smbRuntimeMtimeMs = stat.mtimeMs;
    } catch {
      // Ignore write failures in read-only / serverless environments
    } finally {
      RuntimeStateRepository.isWriting = false;
    }
  }

  /**
   * Resets state for deterministic unit/concurrency tests.
   * When `cleanBookings` is true, clears seeded bookings/allocations so tests start on an empty calendar.
   */
  public static resetForTests(cleanBookings = true): void {
    if (RuntimeStateRepository.persistTimer) {
      clearTimeout(RuntimeStateRepository.persistTimer);
      RuntimeStateRepository.persistTimer = null;
    }
    const fresh = createSeededSnapshot();
    if (cleanBookings) {
      fresh.bookings = [];
      fresh.allocations = [];
    }
    globalThis.__smbRuntimeSnapshot = fresh;
    globalThis.__smbRuntimeMtimeMs = undefined;
  }
}
