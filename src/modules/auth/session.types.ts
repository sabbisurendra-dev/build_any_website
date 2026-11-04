import type { SystemRoleKey, UUID } from '@/types/domain';

export const PERMISSIONS = [
  // Platform administration
  'platform:tenants:manage',
  'platform:users:manage',
  'platform:plans:manage',
  'platform:templates:manage',
  'platform:audit:read',
  // Website builder & configurator
  'websites:read',
  'websites:write_draft',
  'websites:publish',
  'websites:domains:manage',
  // Business configuration
  'business:profile:manage',
  'business:locations:manage',
  'catalog:resources:manage',
  'catalog:services:manage',
  'catalog:staff:manage',
  'schedules:manage',
  'schedules:own:manage',
  // Booking operations
  'bookings:read:all',
  'bookings:read:assigned',
  'bookings:create:internal',
  'bookings:update:status',
  'bookings:cancel',
  'bookings:reschedule',
  // Payments & analytics
  'payments:read',
  'payments:refund',
  'analytics:read',
  'customers:read',
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number];

export interface AuthenticatedActor {
  readonly userId: UUID;
  readonly email?: string;
  readonly phone?: string;
  readonly platformRole: 'platform_super_admin' | 'internal_configurator' | null;
  readonly tenantMemberships: ReadonlyArray<{
    readonly tenantId: UUID;
    readonly roleKey: SystemRoleKey;
    readonly permissions: ReadonlySet<PermissionKey>;
  }>;
}
