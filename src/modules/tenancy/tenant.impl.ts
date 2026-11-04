import { randomUUID } from 'node:crypto';
import type { AuthenticatedActor } from '@/modules/auth/session.types';
import { assertPlatformPermission } from '@/modules/auth/rbac';
import type { UUID } from '@/types/domain';
import type {
  CreateTenantInput,
  AuditLogEntryInput,
  TenantServicePort,
} from './tenant.service';
import { MOCK_TENANTS, type MockTenant } from '@/lib/mock-data/mock-tenants';

export class TenantServiceImpl implements TenantServicePort {
  private static mockTenantsList: MockTenant[] = [...MOCK_TENANTS];
  private static auditLogsList: AuditLogEntryInput[] = [];

  public async provisionTenant(
    actor: AuthenticatedActor,
    input: CreateTenantInput,
  ): Promise<{ tenantId: UUID; websiteId: UUID; primaryLocationId: UUID }> {
    // Assert platform role permissions
    assertPlatformPermission(actor, 'platform:tenants:manage');

    const tenantId = `t-${input.slug}-${randomUUID().slice(0, 6)}`;
    const websiteId = `web-${randomUUID().slice(0, 8)}`;
    const primaryLocationId = `loc-${randomUUID().slice(0, 8)}`;

    const newTenant: MockTenant = {
      id: tenantId,
      name: input.name,
      slug: input.slug,
      vertical: input.vertical,
      status: 'active',
      defaultCurrency: input.defaultCurrency ?? 'INR',
      plan: 'growth',
      domain: `${input.slug}.localhost:3000`,
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
      onboardingTimeHours: 12,
    };

    TenantServiceImpl.mockTenantsList.push(newTenant);

    await this.recordAuditLog({
      tenantId,
      actorUserId: actor.userId,
      actorRole: actor.platformRole ?? 'platform_super_admin',
      action: 'tenant.provisioned',
      entityType: 'tenant',
      entityId: tenantId,
      changes: {
        after: { slug: input.slug, vertical: input.vertical },
      },
    });

    return { tenantId, websiteId, primaryLocationId };
  }

  public async resolveTenantByHostname(hostname: string): Promise<{
    tenantId: UUID;
    websiteId: UUID;
    publishedVersionId: UUID | null;
  } | null> {
    const cleanHost = hostname.split(':')[0]?.toLowerCase() ?? '';

    // Match subdomain (e.g. kickoff-turf.localhost) or custom domain (e.g. kickoffturf.in)
    const match = TenantServiceImpl.mockTenantsList.find((t) => {
      const sub = t.slug.toLowerCase();
      return (
        cleanHost.startsWith(sub) ||
        t.domain.toLowerCase().includes(cleanHost) ||
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
    TenantServiceImpl.auditLogsList.push(entry);
  }

  public static listTenants(): MockTenant[] {
    return TenantServiceImpl.mockTenantsList;
  }
}
