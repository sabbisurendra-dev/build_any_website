import { z } from 'zod';

/**
 * Validated runtime environment configuration.
 * Server secrets are strictly separated from NEXT_PUBLIC_* browser variables.
 */

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  NEXT_PUBLIC_ROOT_DOMAIN: z.string().min(1).default('localhost:3000'),
  NEXT_PUBLIC_PLATFORM_HOST: z.string().min(1).default('platform.localhost:3000'),
  NEXT_PUBLIC_DASHBOARD_HOST: z.string().min(1).default('app.localhost:3000'),
  NEXT_PUBLIC_PROTOCOL: z.enum(['http', 'https']).default('http'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().optional(),
});

const serverEnvSchema = publicEnvSchema.extend({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1),
  DIRECT_DATABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_STORAGE_PUBLIC_BUCKET: z.string().min(1).default('website-media'),
  SUPABASE_STORAGE_PRIVATE_BUCKET: z.string().min(1).default('tenant-documents'),
  PAYMENT_DEFAULT_PROVIDER: z
    .enum(['simulated', 'razorpay', 'cashfree'])
    .default('simulated'),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  CASHFREE_APP_ID: z.string().optional(),
  CASHFREE_SECRET_KEY: z.string().optional(),
  CASHFREE_WEBHOOK_SECRET: z.string().optional(),
  EMAIL_FROM_ADDRESS: z.string().email().default('bookings@example.com'),
  RESEND_API_KEY: z.string().optional(),
  WHATSAPP_PROVIDER: z.enum(['disabled', 'gupshup', 'meta_cloud', 'msg91']).default('disabled'),
  WHATSAPP_API_KEY: z.string().optional(),
  SMS_PROVIDER: z.enum(['disabled', 'msg91', 'gupshup']).default('disabled'),
  SMS_API_KEY: z.string().optional(),
  CRON_SECRET: z.string().min(32),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  BOOKING_HOLD_TTL_SECONDS: z.coerce.number().int().min(120).max(1800).default(480),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedServerEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (typeof window !== 'undefined') {
    throw new Error('getServerEnv() cannot be invoked in browser bundles.');
  }
  if (!cachedServerEnv) {
    cachedServerEnv = serverEnvSchema.parse(process.env);
  }
  return cachedServerEnv;
}

export function getPublicEnv(): PublicEnv {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_ROOT_DOMAIN: process.env.NEXT_PUBLIC_ROOT_DOMAIN,
    NEXT_PUBLIC_PLATFORM_HOST: process.env.NEXT_PUBLIC_PLATFORM_HOST,
    NEXT_PUBLIC_DASHBOARD_HOST: process.env.NEXT_PUBLIC_DASHBOARD_HOST,
    NEXT_PUBLIC_PROTOCOL: process.env.NEXT_PUBLIC_PROTOCOL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  });
}
