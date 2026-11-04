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
  const queryClient = postgres(env.DATABASE_URL, {
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
