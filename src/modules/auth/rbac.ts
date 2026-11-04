import { AppError } from '@/lib/errors';
import type { SystemRoleKey, UUID } from '@/types/domain';
import {
  PERMISSIONS,
  type AuthenticatedActor,
  type PermissionKey,
} from './session.types';

/**
 * Canonical role-to-permission matrix across the 5 platform roles.
 * All authorization checks execute strictly on the server before any DB mutation.
 */
export const ROLE_PERMISSION_MATRIX: Record<SystemRoleKey, readonly PermissionKey[]> = {
  platform_super_admin: PERMISSIONS,

  internal_configurator: [
    'websites:read',
    'websites:write_draft',
    'websites:publish',
    'websites:domains:manage',
    'business:profile:manage',
    'business:locations:manage',
    'catalog:resources:manage',
    'catalog:services:manage',
    'catalog:staff:manage',
    'schedules:manage',
    'bookings:read:all',
  ],

  client_manager: [
    'platform:tenants:manage',
    'websites:read',
    'business:profile:manage',
    'bookings:read:all',
    'analytics:read',
  ],

  business_owner: [
    'websites:read',
    'business:profile:manage',
    'business:locations:manage',
    'catalog:resources:manage',
    'catalog:services:manage',
    'catalog:staff:manage',
    'schedules:manage',
    'bookings:read:all',
    'bookings:create:internal',
    'bookings:update:status',
    'bookings:cancel',
    'bookings:reschedule',
    'payments:read',
    'payments:refund',
    'analytics:read',
    'customers:read',
  ],

  business_staff: [
    'schedules:own:manage',
    'bookings:read:assigned',
    'bookings:update:status',
  ],

  end_customer: [],
};

const CONFIGURATOR_PERMISSION_SET = new Set<PermissionKey>(
  ROLE_PERMISSION_MATRIX.internal_configurator,
);

export function hasTenantPermission(
  actor: AuthenticatedActor,
  tenantId: UUID,
  permission: PermissionKey,
): boolean {
  if (actor.platformRole === 'platform_super_admin') {
    return true;
  }
  if (actor.platformRole === 'internal_configurator') {
    return CONFIGURATOR_PERMISSION_SET.has(permission);
  }
  const membership = actor.tenantMemberships.find((m) => m.tenantId === tenantId);
  if (!membership) {
    return false;
  }
  return membership.permissions.has(permission);
}

export function assertTenantPermission(
  actor: AuthenticatedActor | null,
  tenantId: UUID,
  permission: PermissionKey,
): AuthenticatedActor {
  if (!actor) {
    throw new AppError('UNAUTHENTICATED', 'Authentication required.', 401);
  }
  if (!hasTenantPermission(actor, tenantId, permission)) {
    throw new AppError(
      'FORBIDDEN',
      `Missing required permission '${permission}' for tenant '${tenantId}'.`,
      403,
    );
  }
  return actor;
}

export function assertPlatformPermission(
  actor: AuthenticatedActor | null,
  permission: PermissionKey,
): AuthenticatedActor {
  if (!actor) {
    throw new AppError('UNAUTHENTICATED', 'Authentication required.', 401);
  }
  if (actor.platformRole === 'platform_super_admin') {
    return actor;
  }
  if (
    actor.platformRole === 'internal_configurator' &&
    CONFIGURATOR_PERMISSION_SET.has(permission)
  ) {
    return actor;
  }
  throw new AppError('FORBIDDEN', `Platform permission '${permission}' denied.`, 403);
}
