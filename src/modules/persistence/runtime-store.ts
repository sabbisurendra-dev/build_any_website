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
      id: 'sec-location-02',
      name: 'Location, Parking & Timings',
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
  };
}

function isVitestEnvironment(): boolean {
  return Boolean(process.env.VITEST);
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
          globalThis.__smbRuntimeSnapshot = JSON.parse(raw) as PlatformRuntimeSnapshot;
          globalThis.__smbRuntimeMtimeMs = stat.mtimeMs;
        }
        return globalThis.__smbRuntimeSnapshot;
      }
    } catch {
      // Fallback to in-memory snapshot if file is unreadable
    }

    if (!globalThis.__smbRuntimeSnapshot) {
      globalThis.__smbRuntimeSnapshot = createSeededSnapshot();
      RuntimeStateRepository.persist();
    }
    return globalThis.__smbRuntimeSnapshot;
  }

  public static persist(): void {
    if (isVitestEnvironment() || !globalThis.__smbRuntimeSnapshot) {
      return;
    }
    try {
      writeFileSync(
        RUNTIME_FILE_PATH,
        JSON.stringify(globalThis.__smbRuntimeSnapshot, null, 2),
        'utf8',
      );
      const stat = statSync(RUNTIME_FILE_PATH);
      globalThis.__smbRuntimeMtimeMs = stat.mtimeMs;
    } catch {
      // Ignore write failures in read-only environments
    }
  }

  /**
   * Resets state for deterministic unit/concurrency tests.
   * When `cleanBookings` is true, clears seeded bookings/allocations so tests start on an empty calendar.
   */
  public static resetForTests(cleanBookings = true): void {
    const fresh = createSeededSnapshot();
    if (cleanBookings) {
      fresh.bookings = [];
      fresh.allocations = [];
    }
    globalThis.__smbRuntimeSnapshot = fresh;
    globalThis.__smbRuntimeMtimeMs = undefined;
  }
}
