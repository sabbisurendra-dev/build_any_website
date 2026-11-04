/**
 * Structured JSON logger with automatic PII & credential redaction.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const REDACTED_KEYS = new Set([
  'password',
  'token',
  'secret',
  'authorization',
  'cookie',
  'razorpay_signature',
  'card',
  'cvv',
  'pan',
]);

function sanitizeMeta(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (REDACTED_KEYS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function emit(level: LogLevel, event: string, meta?: Record<string, unknown>): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...sanitizeMeta(meta),
  };
  const serialized = JSON.stringify(entry);
  if (level === 'error') {
    console.error(serialized);
  } else if (level === 'warn') {
    console.warn(serialized);
  } else {
    console.info(serialized);
  }
}

export const logger = {
  debug: (event: string, meta?: Record<string, unknown>) => emit('debug', event, meta),
  info: (event: string, meta?: Record<string, unknown>) => emit('info', event, meta),
  warn: (event: string, meta?: Record<string, unknown>) => emit('warn', event, meta),
  error: (event: string, meta?: Record<string, unknown>) => emit('error', event, meta),
};
