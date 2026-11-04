import type { AuthenticatedActor } from '@/modules/auth/session.types';
import type { BusinessVertical, CurrencyCode, IanaTimezone, UUID } from '@/types/domain';

export interface CreateTenantInput {
  readonly name: string;
  readonly slug: string;
  readonly vertical: BusinessVertical;
  readonly defaultCurrency?: CurrencyCode;
  readonly primaryLocation: {
    readonly name: string;
    readonly addressLine1: string;
    readonly city: string;
    readonly state: string;
    readonly postalCode: string;
    readonly timezone?: IanaTimezone;
    readonly phone?: string;
  };
  readonly ownerEmail?: string;
  readonly ownerPhone?: string;
  readonly templateKey?: string;
}

export interface AuditLogEntryInput {
  readonly tenantId: UUID | null;
  readonly actorUserId: UUID | null;
  readonly actorRole: string;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly changes?: {
    readonly before?: Record<string, unknown>;
    readonly after?: Record<string, unknown>;
  };
}

export interface TenantServicePort {
  provisionTenant(
    actor: AuthenticatedActor,
    input: CreateTenantInput,
  ): Promise<{ tenantId: UUID; websiteId: UUID; primaryLocationId: UUID }>;

  resolveTenantByHostname(hostname: string): Promise<{
    tenantId: UUID;
    websiteId: UUID;
    publishedVersionId: UUID | null;
  } | null>;

  recordAuditLog(entry: AuditLogEntryInput): Promise<void>;
}
