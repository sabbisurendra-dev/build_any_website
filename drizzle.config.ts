import { defineConfig } from 'drizzle-kit';

const migrationUrl = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL ?? '';

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: migrationUrl,
  },
  strict: true,
  verbose: true,
});
