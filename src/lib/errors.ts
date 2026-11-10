/**
 * Structured domain error hierarchy mapped deterministically to HTTP status codes
 * and safe client error envelopes without leaking SQL internals or stack traces.
 */

export type ErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'TENANT_NOT_FOUND'
  | 'TENANT_MISMATCH'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'SLOT_UNAVAILABLE'
  | 'SESSION_CAPACITY_EXCEEDED'
  | 'OUT_OF_STOCK'
  | 'ITEM_UNAVAILABLE'
  | 'ENTITLEMENT_EXPIRED'
  | 'HOLD_EXPIRED'
  | 'IDEMPOTENCY_CONFLICT'
  | 'PAYMENT_SIGNATURE_INVALID'
  | 'RATE_LIMITED'
  | 'POLICY_SCOPE_VIOLATION'
  | 'FOUNDER_APPROVAL_REQUIRED'
  | 'KILL_SWITCH_ACTIVE'
  | 'INVALID_STATE_TRANSITION'
  | 'CONFLICT'
  | 'BUDGET_EXCEEDED'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly httpStatus: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    httpStatus: number,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
  }
}

export class SlotUnavailableError extends AppError {
  constructor(message = 'The selected time slot is no longer available.') {
    super('SLOT_UNAVAILABLE', message, 409);
    this.name = 'SlotUnavailableError';
  }
}

export class SessionCapacityExceededError extends AppError {
  constructor(message = 'This session has reached its maximum booking capacity.') {
    super('SESSION_CAPACITY_EXCEEDED', message, 409);
    this.name = 'SessionCapacityExceededError';
  }
}

export class HoldExpiredError extends AppError {
  constructor(message = 'Your temporary booking hold expired before payment completed.') {
    super('HOLD_EXPIRED', message, 410);
    this.name = 'HoldExpiredError';
  }
}

export class InsufficientStockError extends AppError {
  constructor(message = 'Requested quantity exceeds available inventory stock.') {
    super('OUT_OF_STOCK', message, 409);
    this.name = 'InsufficientStockError';
  }
}

export class ItemUnavailableError extends AppError {
  constructor(message = 'This catalogue item is currently dormant or unavailable.') {
    super('ITEM_UNAVAILABLE', message, 409);
    this.name = 'ItemUnavailableError';
  }
}

export class EntitlementExpiredError extends AppError {
  constructor(message = 'Your viewing or usage permission timeslot has expired.') {
    super('ENTITLEMENT_EXPIRED', message, 403);
    this.name = 'EntitlementExpiredError';
  }
}

/**
 * PostgreSQL SQLSTATE codes critical to booking concurrency & idempotency:
 * - 23P01: exclusion_violation (GiST tstzrange overlap on resource or staff)
 * - 23505: unique_violation (duplicate idempotency_key or webhook event)
 * - 23514: check_violation (capacity <= max_capacity or time range ordering)
 */
export const PG_ERROR_CODES = {
  EXCLUSION_VIOLATION: '23P01',
  UNIQUE_VIOLATION: '23505',
  CHECK_VIOLATION: '23514',
  SERIALIZATION_FAILURE: '40001',
  DEADLOCK_DETECTED: '40P01',
} as const;

export function extractPgErrorCode(error: unknown): string | null {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : null;
  }
  return null;
}
