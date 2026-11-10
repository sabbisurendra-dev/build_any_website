import 'server-only';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { getServerEnv } from '@/lib/env';

/**
 * Singleton Drizzle PostgreSQL client configured for Supabase PgBouncer
 * transaction pooler (`prepare: false` required in transaction pooling mode).
 */

export type AppDatabase = PostgresJsDatabase<typeof schema>;

declare global {
  var __appDbInstance: AppDatabase | undefined;
}

export function getDb(): AppDatabase {
  if (globalThis.__appDbInstance) {
    return globalThis.__appDbInstance;
  }

  const env = getServerEnv();
  const connectionString = env.APP_RUNTIME_DATABASE_URL || env.DATABASE_URL;
  const queryClient = postgres(connectionString, {
    prepare: false,
    max: env.NODE_ENV === 'production' ? 10 : 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  const instance = drizzle(queryClient, { schema });
  if (env.NODE_ENV !== 'production') {
    globalThis.__appDbInstance = instance;
  }
  return instance;
}

/**
 * Lazy proxy exporting `db` instance so callers can use standard `db.select()` / `db.transaction()`
 * without manually calling `getDb()`.
 */
export const db = new Proxy({} as AppDatabase, {
  get(_target, prop) {
    const client = getDb();
    const val = (client as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof val === 'function') {
      return (val as (...args: unknown[]) => unknown).bind(client);
    }
    return val;
  },
});
