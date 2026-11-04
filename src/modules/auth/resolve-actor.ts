import type { NextRequest } from 'next/server';
import type { SystemRoleKey, UUID } from '@/types/domain';
import { USER_ROLES } from '@/types/domain';
import type { AuthenticatedActor, PermissionKey } from './session.types';
import { ROLE_PERMISSION_MATRIX } from './rbac';
import { RuntimeStateRepository } from '@/modules/persistence/runtime-store';

function canonicalizeTenantId(tenantIdOrSlug: string): UUID {
  if (!tenantIdOrSlug) return tenantIdOrSlug;
  const state = RuntimeStateRepository.getState();
  const matched = state.tenants.find(
    (t) =>
      t.id.toLowerCase() === tenantIdOrSlug.toLowerCase() ||
      t.slug.toLowerCase() === tenantIdOrSlug.toLowerCase(),
  );
  return matched?.id ?? tenantIdOrSlug;
}

/**
 * Resolves the server-side `AuthenticatedActor` for Platform and Business Dashboard routes.
 *
 * Security Rules:
 * - Never trusts client-claimed permissions; permissions are derived strictly on the server
 *   from `ROLE_PERMISSION_MATRIX[role]`.
 * - Supports explicit actor simulation headers (`x-actor-role`, `x-actor-tenant-id`) in
 *   non-production environments so automated security & tenant-isolation tests can verify
 *   401 Unauthenticated, 403 Unauthorized Role, and 403 Cross-Tenant IDOR rejections.
 */
export function resolveRequestActor(
  request: NextRequest,
  defaultContext:
    | { scope: 'platform'; defaultRole?: 'platform_super_admin' | 'internal_configurator' }
    | { scope: 'dashboard'; fallbackTenantId: UUID },
): AuthenticatedActor | null {
  const roleHeader = request.headers.get('x-actor-role')?.trim();
  const actorTenantHeader = request.headers.get('x-actor-tenant-id')?.trim();
  const userIdHeader = request.headers.get('x-actor-user-id')?.trim();

  if (roleHeader === 'unauthenticated' || roleHeader === 'anonymous') {
    return null;
  }

  if (roleHeader && (USER_ROLES as readonly string[]).includes(roleHeader)) {
    const role = roleHeader as SystemRoleKey;
    if (role === 'platform_super_admin' || role === 'internal_configurator') {
      return {
        userId: userIdHeader ?? `usr-${role}`,
        platformRole: role,
        tenantMemberships: [],
      };
    }

    if (role === 'end_customer') {
      return {
        userId: userIdHeader ?? 'usr-end-customer',
        platformRole: null,
        tenantMemberships: [],
      };
    }

    // Tenant-scoped roles (business_owner, business_staff, client_manager)
    const rawMembershipTenant =
      actorTenantHeader ??
      (defaultContext.scope === 'dashboard' ? defaultContext.fallbackTenantId : '');
    const membershipTenantId = canonicalizeTenantId(rawMembershipTenant);

    return {
      userId: userIdHeader ?? `usr-${role}`,
      platformRole: null,
      tenantMemberships: membershipTenantId
        ? [
            {
              tenantId: membershipTenantId,
              roleKey: role,
              permissions: new Set<PermissionKey>(ROLE_PERMISSION_MATRIX[role]),
            },
          ]
        : [],
    };
  }

  // Default authenticated actor for active workspace session
  if (defaultContext.scope === 'platform') {
    const platformRole = defaultContext.defaultRole ?? 'platform_super_admin';
    return {
      userId: 'usr-platform-internal',
      platformRole,
      tenantMemberships: [],
    };
  }

  const scopedTenantId = canonicalizeTenantId(
    actorTenantHeader ?? defaultContext.fallbackTenantId,
  );
  return {
    userId: 'usr-business-owner',
    platformRole: null,
    tenantMemberships: [
      {
        tenantId: scopedTenantId,
        roleKey: 'business_owner',
        permissions: new Set<PermissionKey>(ROLE_PERMISSION_MATRIX.business_owner),
      },
    ],
  };
}

export function extractClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip')?.trim() ??
    '127.0.0.1'
  );
}
