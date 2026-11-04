import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: false,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://test-project.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-supabase-anon-key',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/slotbooking_test',
      SUPABASE_SERVICE_ROLE_KEY: 'test-supabase-service-role-key',
      CRON_SECRET: 'development_cron_secret_minimum_32_characters_string',
      PAYMENT_DEFAULT_PROVIDER: 'simulated',
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      'server-only': resolve(__dirname, './tests/mocks/empty.ts'),
    },
  },
});
