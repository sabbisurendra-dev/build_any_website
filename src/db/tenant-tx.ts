import 'server-only';
import { sql } from 'drizzle-orm';
import { getDb, type AppDatabase } from './index';
import type { UUID } from '@/types/domain';

export type DbTransaction = Parameters<Parameters<AppDatabase['transaction']>[0]>[0];

/**
 * Executes a callback inside an ACID PostgreSQL transaction with session-local
 * tenant isolation context (`SET LOCAL app.current_tenant_id = <uuid>`).
 *
 * Defense-in-depth:
 * 1. Application services explicitly include `eq(table.tenantId, tenantId)` in every query.
 * 2. PostgreSQL RLS policies (when using non-superuser app role) enforce
 *    `tenant_id = current_setting('app.current_tenant_id', true)::uuid` automatically.
 * 3. `SET LOCAL` guarantees context never leaks across pooled PgBouncer connections.
 */
export async function withTenantTransaction<T>(
  tenantId: UUID,
  work: (tx: DbTransaction) => Promise<T>,
): Promise<T> {
  const db = getDb();
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`);
    return work(tx);
  });
}

/**
 * Platform-level transaction wrapper reserved strictly for cross-tenant
 * Super Admin operations and verified payment webhook intake.
 */
export async function withPlatformTransaction<T>(
  work: (tx: DbTransaction) => Promise<T>,
): Promise<T> {
  const db = getDb();
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.is_platform_context', 'true', true)`);
    return work(tx);
  });
}
