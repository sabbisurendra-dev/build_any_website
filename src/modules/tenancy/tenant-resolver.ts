import type { NextRequest } from 'next/server';
import { AppError } from '@/lib/errors';
import { RuntimeStateRepository } from '@/modules/persistence/runtime-store';
import { canonicalizeTenantId } from '@/modules/auth/resolve-actor';
import type { AuthenticatedActor } from '@/modules/auth/session.types';

/**
 * Derives and verifies the authoritative tenantId for public API requests.
 *
 * Security Invariants:
 * 1. Derives tenant from request hostname / subdomain / custom domain or x-site-key / x-tenant-id headers.
 * 2. If a tenant is derived from the host/domain and the client passes a conflicting tenantId in
 *    body/query, rejects with 403 FORBIDDEN.
 * 3. On root/development domains (localhost:3000, 127.0.0.1, etc.), allows explicit client-supplied tenantId
 *    provided it is a valid active tenant.
 */
export function resolvePublicRequestTenantId(
  request: NextRequest,
  clientSuppliedTenantId?: string,
): string {
  const rawHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '';
  const hostname = rawHost.toLowerCase().trim();
  const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000').toLowerCase();

  const siteKeyHeader = request.headers.get('x-site-key')?.trim().toLowerCase();
  const tenantIdHeader = request.headers.get('x-tenant-id')?.trim().toLowerCase();

  const state = RuntimeStateRepository.getState();

  // 1. Resolve host-derived siteKey
  let hostSiteKey: string | null = null;
  if (siteKeyHeader) {
    hostSiteKey = siteKeyHeader;
  } else if (tenantIdHeader) {
    hostSiteKey = tenantIdHeader;
  } else if (hostname && hostname !== rootDomain) {
    const hostWithoutPort = hostname.replace(/:\d+$/, '');
    const rootWithoutPort = rootDomain.replace(/:\d+$/, '');

    const isLocalOrInternal =
      hostWithoutPort === rootWithoutPort ||
      hostWithoutPort === 'localhost' ||
      hostWithoutPort === '127.0.0.1' ||
      hostWithoutPort === '[::1]' ||
      hostWithoutPort.endsWith('.vercel.app');

    if (!isLocalOrInternal) {
      if (hostname.endsWith(`.${rootDomain}`)) {
        hostSiteKey = hostname.slice(0, -(rootDomain.length + 1));
      } else {
        hostSiteKey = hostWithoutPort;
      }
    }
  }

  // 2. If a host-specific siteKey was derived, look up the authoritative tenant
  if (hostSiteKey && hostSiteKey !== 'platform' && hostSiteKey !== 'app' && hostSiteKey !== 'api') {
    const matched = state.tenants.find(
      (t) =>
        t.id.toLowerCase() === hostSiteKey!.toLowerCase() ||
        t.slug.toLowerCase() === hostSiteKey!.toLowerCase() ||
        t.customDomain?.toLowerCase() === hostSiteKey!.toLowerCase() ||
        hostSiteKey!.startsWith(`${t.slug.toLowerCase()}.`),
    );

    if (matched) {
      if (matched.status !== 'active') {
        throw new AppError('NOT_FOUND', 'Tenant is inactive.', 404);
      }

      // If client supplied a tenantId, verify it does NOT conflict with the host tenant!
      if (clientSuppliedTenantId) {
        const canonicalSupplied = canonicalizeTenantId(clientSuppliedTenantId);
        if (canonicalSupplied.toLowerCase() !== matched.id.toLowerCase()) {
          throw new AppError(
            'FORBIDDEN',
            `Cross-tenant mismatch: requested tenantId '${clientSuppliedTenantId}' does not match host tenant '${matched.slug}'.`,
            403,
          );
        }
      }
      return matched.id;
    }
  }

  // 3. Root/Dev fallback: clientSuppliedTenantId must be resolved and active
  if (clientSuppliedTenantId) {
    const canonicalId = canonicalizeTenantId(clientSuppliedTenantId);
    const tenant = state.tenants.find(
      (t) =>
        t.id.toLowerCase() === canonicalId.toLowerCase() ||
        t.slug.toLowerCase() === canonicalId.toLowerCase(),
    );
    if (!tenant || tenant.status !== 'active') {
      throw new AppError('NOT_FOUND', `Tenant '${clientSuppliedTenantId}' not found.`, 404);
    }
    return tenant.id;
  }

  throw new AppError('VALIDATION_ERROR', 'Missing tenant context.', 400);
}

/**
 * Derives and verifies the authoritative tenantId for dashboard operations from the actor's session.
 *
 * Security Invariants:
 * 1. Business owners and staff can only access tenants where they possess active tenant memberships.
 * 2. Cross-tenant access attempts return 403 FORBIDDEN.
 * 3. Platform Super Admin can inspect any tenant or default to the requested one.
 */
export function resolveAuthorizedDashboardTenant(
  actor: AuthenticatedActor,
  clientRequestedTenant?: string,
): string {
  if (actor.platformRole === 'platform_super_admin') {
    if (clientRequestedTenant) {
      return canonicalizeTenantId(clientRequestedTenant);
    }
    return actor.tenantMemberships[0]?.tenantId ?? 't-kickoff-01';
  }

  const authorizedTenants = actor.tenantMemberships.map((m) => m.tenantId);
  if (authorizedTenants.length === 0) {
    throw new AppError('FORBIDDEN', 'User has no active tenant memberships.', 403);
  }

  if (clientRequestedTenant) {
    const canonical = canonicalizeTenantId(clientRequestedTenant);
    if (!authorizedTenants.includes(canonical)) {
      throw new AppError(
        'FORBIDDEN',
        `Access denied: You do not have permission to access tenant '${clientRequestedTenant}'.`,
        403,
      );
    }
    return canonical;
  }

  return authorizedTenants[0]!;
}
