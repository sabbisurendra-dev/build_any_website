import { z } from 'zod';
import { BOOKING_MODELS } from '@/types/domain';

/**
 * Declarative Widget Registry & Property Schema Contract.
 *
 * Adding a new widget to the platform requires ONLY registering its metadata,
 * Zod configuration schema, and server/editor presentation component—zero custom
 * per-tenant page code.
 */

export type WidgetDataRequirement =
  | 'none'
  | 'business_profile'
  | 'resources_catalog'
  | 'services_catalog'
  | 'staff_catalog'
  | 'live_booking_engine';

export interface InspectorFieldDescriptor {
  readonly name: string;
  readonly label: string;
  readonly control:
    | 'text'
    | 'textarea'
    | 'number'
    | 'select'
    | 'toggle'
    | 'color'
    | 'image_upload'
    | 'entity_picker';
  readonly options?: ReadonlyArray<{ readonly label: string; readonly value: string }>;
}

export interface WidgetRegistryDefinition<TSchema extends z.ZodTypeAny = z.ZodTypeAny> {
  readonly type: string;
  readonly name: string;
  readonly category: 'layout' | 'marketing' | 'catalog' | 'booking' | 'trust' | 'location';
  readonly version: number;
  readonly sizing: {
    readonly defaultColSpan: number;
    readonly defaultRowSpan: number;
    readonly minColSpan: number;
    readonly maxColSpan: number;
    readonly minRowSpan: number;
  };
  readonly dataRequirement: WidgetDataRequirement;
  readonly configSchema: TSchema;
  readonly defaultConfig: z.infer<TSchema>;
  readonly inspectorFields: readonly InspectorFieldDescriptor[];
}

export const heroBannerSchema = z.object({
  eyebrow: z.string().max(80).optional(),
  headline: z.string().min(2).max(140),
  subheadline: z.string().max(280).optional(),
  primaryCtaLabel: z.string().min(1).max(40),
  primaryCtaHref: z.string().min(1).max(200),
  mediaImageUrl: z.string().url().optional(),
  alignment: z.enum(['left', 'center']).default('left'),
});

export const bookingSlotPickerSchema = z.object({
  heading: z.string().min(1).max(100).default('Book Your Slot'),
  bookingModel: z.enum(BOOKING_MODELS),
  defaultLocationId: z.string().uuid().optional(),
  preselectedResourceId: z.string().uuid().optional(),
  preselectedServiceId: z.string().uuid().optional(),
  showPricingSummary: z.boolean().default(true),
  dateHorizonDays: z.number().int().min(1).max(60).default(14),
});

export const resourceGridSchema = z.object({
  heading: z.string().min(1).max(100).default('Our Facilities & Courts'),
  columnsDesktop: z.enum(['2', '3']).default('3'),
  showInstantBookButton: z.boolean().default(true),
});

export const serviceListSchema = z.object({
  heading: z.string().min(1).max(100).default('Services & Consultations'),
  groupByCategory: z.boolean().default(true),
  showDuration: z.boolean().default(true),
  showPrice: z.boolean().default(true),
});

export const locationMapHoursSchema = z.object({
  heading: z.string().min(1).max(100).default('Visit Us & Timings'),
  showGoogleMapEmbed: z.boolean().default(true),
  showWhatsappButton: z.boolean().default(true),
});

export const composableBookingCalendarSchema = z.object({
  heading: z.string().min(1).max(100).default('Select a Date'),
  bookingModel: z.enum(BOOKING_MODELS).default('exclusive_resource'),
  dateHorizonDays: z.number().int().min(1).max(90).default(14),
});

export const composableTimeSlotsSchema = z.object({
  heading: z.string().min(1).max(100).default('Available Time Slots'),
  showRemainingCapacity: z.boolean().default(true),
  showSlotPricing: z.boolean().default(true),
});

export const CORE_WIDGET_REGISTRY: ReadonlyMap<string, WidgetRegistryDefinition> = new Map<
  string,
  WidgetRegistryDefinition
>([
  [
    'hero.banner',
    {
      type: 'hero.banner',
      name: 'Hero Banner',
      category: 'marketing',
      version: 1,
      sizing: {
        defaultColSpan: 12,
        defaultRowSpan: 8,
        minColSpan: 6,
        maxColSpan: 12,
        minRowSpan: 5,
      },
      dataRequirement: 'business_profile',
      configSchema: heroBannerSchema,
      defaultConfig: {
        headline: 'Book Your Slot Online in Seconds',
        subheadline: 'Real-time availability, instant confirmation, and seamless UPI checkout.',
        primaryCtaLabel: 'Book Now',
        primaryCtaHref: '#book',
        alignment: 'left',
      },
      inspectorFields: [
        { name: 'eyebrow', label: 'Eyebrow Badge', control: 'text' },
        { name: 'headline', label: 'Headline', control: 'text' },
        { name: 'subheadline', label: 'Subheadline', control: 'textarea' },
        { name: 'primaryCtaLabel', label: 'CTA Button Label', control: 'text' },
        { name: 'primaryCtaHref', label: 'CTA Target Link', control: 'text' },
        { name: 'mediaImageUrl', label: 'Hero Image', control: 'image_upload' },
      ],
    },
  ],
  [
    'booking.slot-picker',
    {
      type: 'booking.slot-picker',
      name: 'Live Slot Booking Engine',
      category: 'booking',
      version: 1,
      sizing: {
        defaultColSpan: 6,
        defaultRowSpan: 9,
        minColSpan: 5,
        maxColSpan: 12,
        minRowSpan: 7,
      },
      dataRequirement: 'live_booking_engine',
      configSchema: bookingSlotPickerSchema,
      defaultConfig: {
        heading: 'Select Date & Time Slot',
        bookingModel: 'exclusive_resource',
        showPricingSummary: true,
        dateHorizonDays: 14,
      },
      inspectorFields: [
        { name: 'heading', label: 'Widget Heading', control: 'text' },
        {
          name: 'bookingModel',
          label: 'Booking Mode',
          control: 'select',
          options: [
            { label: 'Exclusive Resource (Turf/Court)', value: 'exclusive_resource' },
            { label: 'Staff Appointment (Clinic/Salon)', value: 'staff_appointment' },
            { label: 'Capacity Session (Yoga/Class)', value: 'capacity_session' },
          ],
        },
        { name: 'showPricingSummary', label: 'Show Price Breakdown', control: 'toggle' },
      ],
    },
  ],
  [
    'catalog.resource-grid',
    {
      type: 'catalog.resource-grid',
      name: 'Turf / Facility Cards',
      category: 'catalog',
      version: 1,
      sizing: {
        defaultColSpan: 6,
        defaultRowSpan: 7,
        minColSpan: 4,
        maxColSpan: 12,
        minRowSpan: 5,
      },
      dataRequirement: 'resources_catalog',
      configSchema: resourceGridSchema,
      defaultConfig: {
        heading: 'Available Courts & Turfs',
        columnsDesktop: '2',
        showInstantBookButton: true,
      },
      inspectorFields: [
        { name: 'heading', label: 'Heading', control: 'text' },
        { name: 'showInstantBookButton', label: 'Show Book CTA', control: 'toggle' },
      ],
    },
  ],
  [
    'catalog.service-list',
    {
      type: 'catalog.service-list',
      name: 'Service & Treatment Menu',
      category: 'catalog',
      version: 1,
      sizing: {
        defaultColSpan: 6,
        defaultRowSpan: 7,
        minColSpan: 4,
        maxColSpan: 12,
        minRowSpan: 5,
      },
      dataRequirement: 'services_catalog',
      configSchema: serviceListSchema,
      defaultConfig: {
        heading: 'Our Services',
        groupByCategory: true,
        showDuration: true,
        showPrice: true,
      },
      inspectorFields: [
        { name: 'heading', label: 'Heading', control: 'text' },
        { name: 'groupByCategory', label: 'Group by Category', control: 'toggle' },
        { name: 'showDuration', label: 'Show Duration', control: 'toggle' },
        { name: 'showPrice', label: 'Show Price', control: 'toggle' },
      ],
    },
  ],
  [
    'location.map-hours',
    {
      type: 'location.map-hours',
      name: 'Location, Timings & WhatsApp Contact',
      category: 'location',
      version: 1,
      sizing: {
        defaultColSpan: 12,
        defaultRowSpan: 5,
        minColSpan: 4,
        maxColSpan: 12,
        minRowSpan: 4,
      },
      dataRequirement: 'business_profile',
      configSchema: locationMapHoursSchema,
      defaultConfig: {
        heading: 'Find Us',
        showGoogleMapEmbed: true,
        showWhatsappButton: true,
      },
      inspectorFields: [
        { name: 'heading', label: 'Heading', control: 'text' },
        { name: 'showGoogleMapEmbed', label: 'Show Map', control: 'toggle' },
        { name: 'showWhatsappButton', label: 'Show WhatsApp Button', control: 'toggle' },
      ],
    },
  ],
  [
    'booking.calendar',
    {
      type: 'booking.calendar',
      name: 'Booking Calendar (Composable)',
      category: 'booking',
      version: 1,
      sizing: {
        defaultColSpan: 6,
        defaultRowSpan: 6,
        minColSpan: 4,
        maxColSpan: 12,
        minRowSpan: 5,
      },
      dataRequirement: 'live_booking_engine',
      configSchema: composableBookingCalendarSchema,
      defaultConfig: {
        heading: 'Select a Date',
        bookingModel: 'exclusive_resource',
        dateHorizonDays: 14,
      },
      inspectorFields: [
        { name: 'heading', label: 'Calendar Heading', control: 'text' },
        { name: 'dateHorizonDays', label: 'Advance Days Shown', control: 'number' },
      ],
    },
  ],
  [
    'booking.time-slots',
    {
      type: 'booking.time-slots',
      name: 'Available Time Slots (Composable)',
      category: 'booking',
      version: 1,
      sizing: {
        defaultColSpan: 6,
        defaultRowSpan: 6,
        minColSpan: 4,
        maxColSpan: 12,
        minRowSpan: 5,
      },
      dataRequirement: 'live_booking_engine',
      configSchema: composableTimeSlotsSchema,
      defaultConfig: {
        heading: 'Available Time Slots',
        showRemainingCapacity: true,
        showSlotPricing: true,
      },
      inspectorFields: [
        { name: 'heading', label: 'Heading', control: 'text' },
        { name: 'showSlotPricing', label: 'Show Slot Price', control: 'toggle' },
      ],
    },
  ],
]);

export function validateWidgetConfig(widgetType: string, rawConfig: unknown): Record<string, unknown> {
  const definition = CORE_WIDGET_REGISTRY.get(widgetType);
  if (!definition) {
    throw new Error(`Unregistered widget type: '${widgetType}'.`);
  }
  return definition.configSchema.parse(rawConfig) as Record<string, unknown>;
}
