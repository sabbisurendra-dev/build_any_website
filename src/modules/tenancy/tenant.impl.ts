import { randomUUID } from 'node:crypto';
import type { AuthenticatedActor } from '@/modules/auth/session.types';
import { assertPlatformPermission } from '@/modules/auth/rbac';
import type { UUID } from '@/types/domain';
import { AppError } from '@/lib/errors';
import type {
  CreateTenantInput,
  AuditLogEntryInput,
  TenantServicePort,
} from './tenant.service';
import type { MockTenant } from '@/lib/mock-data/mock-tenants';
import {
  RuntimeStateRepository,
  seedStarterWebsiteAndCatalogForNewTenant,
} from '@/modules/persistence/runtime-store';

export class TenantServiceImpl implements TenantServicePort {
  public async provisionTenant(
    actor: AuthenticatedActor,
    input: CreateTenantInput,
  ): Promise<{ tenantId: UUID; websiteId: UUID; primaryLocationId: UUID }> {
    assertPlatformPermission(actor, 'platform:tenants:manage');

    const state = RuntimeStateRepository.getState();
    const normalizedSlug = input.slug.trim().toLowerCase();

    if (state.tenants.some((t) => t.slug.toLowerCase() === normalizedSlug)) {
      throw new AppError(
        'VALIDATION_ERROR',
        `A tenant with slug '${normalizedSlug}' already exists.`,
        409,
      );
    }

    const tenantId = `t-${normalizedSlug}-${randomUUID().slice(0, 6)}`;
    const websiteId = `web-${normalizedSlug}`;
    const primaryLocationId = `loc-${randomUUID().slice(0, 8)}`;

    const newTenant: MockTenant = {
      id: tenantId,
      name: input.name.trim(),
      slug: normalizedSlug,
      vertical: input.vertical,
      status: 'active',
      defaultCurrency: input.defaultCurrency ?? 'INR',
      plan: 'growth',
      domain: `${normalizedSlug}.localhost:3000`,
      websiteStatus: 'published',
      publishedVersion: 1,
      location: {
        name: input.primaryLocation.name,
        city: input.primaryLocation.city,
        state: input.primaryLocation.state,
        address: input.primaryLocation.addressLine1,
        phone: input.primaryLocation.phone ?? '+91 98765 43210',
        timezone: input.primaryLocation.timezone ?? 'Asia/Kolkata',
      },
      stats: {
        totalBookings: 0,
        monthlyRevenueMinor: 0,
        utilizationRate: 0,
      },
      createdAt: new Date().toISOString(),
      onboardingTimeHours: 1,
    };

    state.tenants.unshift(newTenant);
    seedStarterWebsiteAndCatalogForNewTenant(state, newTenant);

    await this.recordAuditLog({
      tenantId,
      actorUserId: actor.userId,
      actorRole: actor.platformRole ?? 'platform_super_admin',
      action: 'tenant.provisioned',
      entityType: 'tenant',
      entityId: tenantId,
      changes: {
        after: { slug: normalizedSlug, vertical: input.vertical },
      },
    });

    RuntimeStateRepository.persist();
    return { tenantId, websiteId, primaryLocationId };
  }

  public async resolveTenantByHostname(hostname: string): Promise<{
    tenantId: UUID;
    websiteId: UUID;
    publishedVersionId: UUID | null;
  } | null> {
    const cleanHost = hostname.split(':')[0]?.toLowerCase() ?? '';
    const state = RuntimeStateRepository.getState();

    const match = state.tenants.find((t) => {
      const sub = t.slug.toLowerCase();
      return (
        cleanHost === sub ||
        cleanHost.startsWith(`${sub}.`) ||
        t.domain.toLowerCase().split(':')[0] === cleanHost ||
        (t.customDomain && t.customDomain.toLowerCase() === cleanHost)
      );
    });

    if (!match) return null;

    return {
      tenantId: match.id,
      websiteId: `web-${match.slug}`,
      publishedVersionId: `ver-v${match.publishedVersion}`,
    };
  }

  public async recordAuditLog(entry: AuditLogEntryInput): Promise<void> {
    const state = RuntimeStateRepository.getState();
    state.auditLogs.unshift(entry);
    RuntimeStateRepository.persist();
  }

  public static listTenants(): MockTenant[] {
    const state = RuntimeStateRepository.getState();
    // Dynamically enrich booking counts & revenue from live runtime bookings
    return state.tenants.map((tenant) => {
      const confirmed = state.bookings.filter(
        (b) =>
          b.tenantId === tenant.id &&
          (b.status === 'confirmed' || b.status === 'completed'),
      );
      const liveRev = confirmed.reduce((sum, b) => sum + b.totalMinor, 0);
      const web = state.websites[tenant.id];
      return {
        ...tenant,
        publishedVersion: web?.publishedVersion ?? tenant.publishedVersion,
        stats: {
          ...tenant.stats,
          totalBookings: Math.max(tenant.stats.totalBookings, confirmed.length),
          monthlyRevenueMinor: Math.max(tenant.stats.monthlyRevenueMinor, liveRev),
        },
      };
    });
  }
}
