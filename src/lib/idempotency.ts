import { createHash } from 'node:crypto';
import { AppError } from '@/lib/errors';

/**
 * Idempotency key validation and deterministic payload fingerprinting.
 *
 * Every state-mutating booking, hold, payment, or refund endpoint requires
 * an `Idempotency-Key` header (UUID or opaque 16..128 char token).
 * Replaying the same key with a different request payload raises HTTP 422/409.
 */

const IDEMPOTENCY_KEY_REGEX = /^[A-Za-z0-9._:-]{16,128}$/;

export function requireIdempotencyKey(headerValue: string | null | undefined): string {
  const trimmed = headerValue?.trim();
  if (!trimmed || !IDEMPOTENCY_KEY_REGEX.test(trimmed)) {
    throw new AppError(
      'VALIDATION_ERROR',
      'A valid Idempotency-Key header (16-128 alphanumeric characters) is required.',
      400,
    );
  }
  return trimmed;
}

export function computePayloadFingerprint(payload: unknown): string {
  const canonicalJson = JSON.stringify(payload, Object.keys(payload as object).sort());
  return createHash('sha256').update(canonicalJson).digest('hex');
}
