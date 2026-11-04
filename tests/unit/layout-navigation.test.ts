import { describe, expect, it } from 'vitest';
import { PLATFORM_NAV_ITEMS } from '@/components/layout/platform/platform-sidebar';
import { DASHBOARD_NAV_ITEMS } from '@/components/layout/dashboard/dashboard-sidebar';

describe('Application Layout Navigation Config', () => {
  it('platform navigation contains expected primary destinations with valid hrefs', () => {
    const hrefs = PLATFORM_NAV_ITEMS.map((item) => item.href);
    expect(hrefs).toContain('/platform');
    expect(hrefs).toContain('/platform/tenants');
    expect(hrefs).toContain('/platform/builder');
    expect(hrefs).toContain('/platform/templates');
    expect(hrefs).toContain('/platform/analytics');
    expect(hrefs).toContain('/platform/settings');
  });

  it('dashboard navigation items declare expected route destinations', () => {
    const hrefs = DASHBOARD_NAV_ITEMS.map((item) => item.href);
    expect(hrefs).toContain('/dashboard');
    expect(hrefs).toContain('/dashboard/bookings');
    expect(hrefs).toContain('/dashboard/services');
    expect(hrefs).toContain('/dashboard/resources');
    expect(hrefs).toContain('/dashboard/staff');
    expect(hrefs).toContain('/dashboard/customers');
    expect(hrefs).toContain('/dashboard/reports');
    expect(hrefs).toContain('/dashboard/settings');
  });

  it('restricts business_staff from seeing financial reports and settings', () => {
    const staffVisible = DASHBOARD_NAV_ITEMS.filter((item) => {
      if (!item.allowedRoles) return true;
      return item.allowedRoles.includes('business_staff');
    });

    const staffHrefs = staffVisible.map((i) => i.href);
    expect(staffHrefs).toContain('/dashboard');
    expect(staffHrefs).toContain('/dashboard/bookings');
    expect(staffHrefs).toContain('/dashboard/services');
    expect(staffHrefs).not.toContain('/dashboard/reports');
    expect(staffHrefs).not.toContain('/dashboard/settings');
  });
});
