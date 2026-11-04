import { AppError } from '@/lib/errors';

/**
 * Pluggable rate-limiter contract protecting public availability endpoints,
 * OTP triggers, temporary slot hold creation, and auth routes against abuse/bots.
 *
 * Production implementation backs onto Upstash Redis sliding-window counters
 * (with deterministic globalThis in-memory sliding-window fallback for local development).
 */

export interface RateLimitPolicy {
  readonly namespace:
    | 'public:availability'
    | 'public:hold_create'
    | 'public:payment_checkout'
    | 'public:otp_send'
    | 'platform:mutation'
    | 'webhook:ingest';
  readonly maxRequests: number;
  readonly windowSeconds: number;
}

export const DEFAULT_RATE_LIMIT_POLICIES: Record<RateLimitPolicy['namespace'], RateLimitPolicy> = {
  'public:availability': { namespace: 'public:availability', maxRequests: 120, windowSeconds: 60 },
  'public:hold_create': { namespace: 'public:hold_create', maxRequests: 30, windowSeconds: 60 },
  'public:payment_checkout': {
    namespace: 'public:payment_checkout',
    maxRequests: 40,
    windowSeconds: 60,
  },
  'public:otp_send': { namespace: 'public:otp_send', maxRequests: 4, windowSeconds: 300 },
  'platform:mutation': { namespace: 'platform:mutation', maxRequests: 60, windowSeconds: 60 },
  'webhook:ingest': { namespace: 'webhook:ingest', maxRequests: 600, windowSeconds: 60 },
};

export interface RateLimitVerdict {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly resetAtEpochSeconds: number;
}

export interface RateLimiterPort {
  check(identifier: string, policy: RateLimitPolicy): Promise<RateLimitVerdict>;
}

declare global {
  var __rateLimitBuckets: Map<string, number[]> | undefined;
}

function getBuckets(): Map<string, number[]> {
  if (!globalThis.__rateLimitBuckets) {
    globalThis.__rateLimitBuckets = new Map();
  }
  return globalThis.__rateLimitBuckets;
}

export class SlidingWindowRateLimiter implements RateLimiterPort {
  public async check(identifier: string, policy: RateLimitPolicy): Promise<RateLimitVerdict> {
    const nowMs = Date.now();
    const windowMs = policy.windowSeconds * 1000;
    const cutoffMs = nowMs - windowMs;
    const key = `${policy.namespace}:${identifier}`;

    const buckets = getBuckets();
    const existing = buckets.get(key) ?? [];
    const active = existing.filter((ts) => ts > cutoffMs);

    if (active.length >= policy.maxRequests) {
      const oldest = active[0] ?? nowMs;
      return {
        allowed: false,
        remaining: 0,
        resetAtEpochSeconds: Math.ceil((oldest + windowMs) / 1000),
      };
    }

    active.push(nowMs);
    buckets.set(key, active);

    return {
      allowed: true,
      remaining: Math.max(0, policy.maxRequests - active.length),
      resetAtEpochSeconds: Math.ceil((nowMs + windowMs) / 1000),
    };
  }

  public static resetForTests(): void {
    getBuckets().clear();
  }
}

export const defaultRateLimiter = new SlidingWindowRateLimiter();

export async function assertRateLimit(
  identifier: string,
  namespace: RateLimitPolicy['namespace'],
): Promise<RateLimitVerdict> {
  const policy = DEFAULT_RATE_LIMIT_POLICIES[namespace];
  const verdict = await defaultRateLimiter.check(identifier, policy);
  if (!verdict.allowed) {
    throw new AppError(
      'RATE_LIMITED',
      'Too many requests. Please wait before retrying.',
      429,
      { resetAtEpochSeconds: verdict.resetAtEpochSeconds },
    );
  }
  return verdict;
}
