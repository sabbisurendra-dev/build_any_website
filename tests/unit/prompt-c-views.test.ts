import { describe, it, expect } from 'vitest';
import { MOCK_TENANTS } from '@/lib/mock-data/mock-tenants';
import { MOCK_BOOKINGS } from '@/lib/mock-data/mock-bookings';
import { MOCK_RESOURCES } from '@/lib/mock-data/mock-resources';
import { resolveWidgetsForBreakpoint } from '@/modules/website-builder/grid-engine';
import type { PlacedWidgetInstance } from '@/modules/website-builder/layout.types';

describe('Prompt C - Primary Landing Pages & Product Views', () => {
  it('validates mock tenants dataset conforms to multi-tenant SLA and INR currency', () => {
    expect(MOCK_TENANTS.length).toBeGreaterThanOrEqual(4);
    for (const tenant of MOCK_TENANTS) {
      expect(tenant.defaultCurrency).toBe('INR');
      expect(tenant.onboardingTimeHours).toBeLessThanOrEqual(48); // 1-2 day turnaround SLA
      expect(tenant.slug).toBeTruthy();
      expect(tenant.location.city).toBeTruthy();
    }
  });

  it('validates mock bookings dataset has valid minor currency amounts and status', () => {
    expect(MOCK_BOOKINGS.length).toBeGreaterThanOrEqual(7);
    for (const booking of MOCK_BOOKINGS) {
      expect(booking.amountMinor).toBeGreaterThan(0);
      expect(Number.isInteger(booking.amountMinor)).toBe(true);
      expect(['confirmed', 'temporarily_held', 'completed', 'cancelled']).toContain(booking.status);
      expect(['upi', 'card', 'cash', 'unknown']).toContain(booking.paymentMethod);
    }
  });

  it('validates mock resources have valid pricing and operating hours', () => {
    expect(MOCK_RESOURCES.length).toBeGreaterThanOrEqual(3);
    for (const res of MOCK_RESOURCES) {
      expect(res.peakPriceMinor).toBeGreaterThanOrEqual(res.basePriceMinor);
      expect(res.slotStepMinutes).toBe(30);
      expect(res.slotDurationMinutes).toBe(60);
    }
  });

  it('verifies responsive grid engine adapts 12-column desktop placements to mobile 4-columns', () => {
    const desktopWidget: PlacedWidgetInstance = {
      id: 'test-w1',
      widgetType: 'hero.banner',
      widgetVersion: 1,
      placement: {
        desktop: { colStart: 7, colSpan: 6, rowStart: 1, rowSpan: 4 },
      },
      config: { headline: 'Test' },
    };

    const resolvedMobile = resolveWidgetsForBreakpoint([desktopWidget], 'mobile');
    expect(resolvedMobile).toHaveLength(1);
    expect(resolvedMobile[0]!.box.colStart).toBe(1);
    expect(resolvedMobile[0]!.box.colSpan).toBe(4); // clamped to mobile max 4 columns
  });
});
