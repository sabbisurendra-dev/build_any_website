/**
 * Pluggable rate-limiter contract protecting public availability endpoints,
 * OTP triggers, temporary slot hold creation, and auth routes against abuse/bots.
 *
 * Production implementation backs onto Upstash Redis sliding-window counters
 * (with in-memory LRU fallback for local development).
 */

export interface RateLimitPolicy {
  readonly namespace:
    | 'public:availability'
    | 'public:hold_create'
    | 'public:otp_send'
    | 'platform:mutation'
    | 'webhook:ingest';
  readonly maxRequests: number;
  readonly windowSeconds: number;
}

export const DEFAULT_RATE_LIMIT_POLICIES: Record<RateLimitPolicy['namespace'], RateLimitPolicy> = {
  'public:availability': { namespace: 'public:availability', maxRequests: 120, windowSeconds: 60 },
  'public:hold_create': { namespace: 'public:hold_create', maxRequests: 10, windowSeconds: 60 },
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
