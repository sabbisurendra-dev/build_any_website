import { NextRequest } from 'next/server';
import type { SystemRoleKey, UUID } from '@/types/domain';
import { USER_ROLES } from '@/types/domain';
import type { AuthenticatedActor, PermissionKey } from './session.types';
import { ROLE_PERMISSION_MATRIX } from './rbac';
import { RuntimeStateRepository } from '@/modules/persistence/runtime-store';
import { getSessionProvider } from './session-provider';

export function canonicalizeTenantId(tenantIdOrSlug: string): UUID {
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
 * Security Invariants:
 * 1. Simulation headers (`x-actor-*`) are strictly rejected in production (`NODE_ENV === 'production'`).
 * 2. Simulation headers are ONLY permitted when `NODE_ENV === 'test'` or (`TEST_ACTOR_HEADERS === '1'` and non-production).
 * 3. Never falls back to hardcoded admin/owner actors outside simulated tests. Unauthenticated requests return `null`.
 * 4. Resolves verified sessions via the configured `SessionProvider` (Supabase Auth / JWT).
 */
export async function resolveRequestActor(
  request: NextRequest,
  defaultContext?:
    | { scope: 'platform'; defaultRole?: 'platform_super_admin' | 'internal_configurator' }
    | { scope: 'dashboard'; fallbackTenantId?: UUID },
): Promise<AuthenticatedActor | null> {
  const isProduction = process.env.NODE_ENV === 'production';
  const allowSimulationHeaders =
    !isProduction &&
    (process.env.NODE_ENV === 'test' || process.env.TEST_ACTOR_HEADERS === '1');

  if (allowSimulationHeaders) {
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
        (defaultContext?.scope === 'dashboard' ? defaultContext.fallbackTenantId : '');
      const membershipTenantId = canonicalizeTenantId(rawMembershipTenant ?? '');

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
  }

  // Check verified session provider (Supabase Auth / verified JWT)
  const sessionProvider = getSessionProvider();
  const sessionActor = await sessionProvider.resolveActor(request);
  if (sessionActor) {
    return sessionActor;
  }

  // Outside simulated tests, unauthenticated requests strictly return null
  return null;
}

export function extractClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip')?.trim() ??
    '127.0.0.1'
  );
}

/**
 * Enforces that the request is made by a verified Founder / Platform Super Admin.
 * Used to guard AI-COS control planes and platform super-admin endpoints.
 */
export async function requireFounder(request: Request | NextRequest): Promise<AuthenticatedActor> {
  const nextReq =
    request instanceof NextRequest
      ? request
      : new NextRequest(request.url, {
          method: request.method,
          headers: request.headers,
        });

  const actor = await resolveRequestActor(nextReq, {
    scope: 'platform',
    defaultRole: 'platform_super_admin',
  });

  if (!actor) {
    const { AppError } = await import('@/lib/errors');
    throw new AppError('UNAUTHENTICATED', 'Founder authentication required.', 401);
  }

  if (actor.platformRole !== 'platform_super_admin') {
    const { AppError } = await import('@/lib/errors');
    throw new AppError(
      'FORBIDDEN',
      'Forbidden: Only the Founder/Platform Super Admin can access AI-COS control planes.',
      403,
    );
  }

  return actor;
}
