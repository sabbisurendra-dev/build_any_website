import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { getServerEnv } from '@/lib/env';
import { HoldExpirationWorker } from '@/modules/booking/hold-expiration.worker';

const holdExpirationWorker = new HoldExpirationWorker();

/**
 * Scheduled Housekeeping Endpoint (`POST /api/internal/cron/expire-holds`).
 * Sweeps expired `booking_holds` and `inventory_reservations`, releasing allocations
 * and updating capacity counters.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const { CRON_SECRET } = getServerEnv();
  const authHeader = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${CRON_SECRET}`;

  const a = Buffer.from(authHeader, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  }

  const result = await holdExpirationWorker.sweepExpiredHolds();
  const releasedCount = result.releasedHoldsCount + result.releasedAllocationsCount + result.releasedInventoryCount;

  return NextResponse.json({ ok: true, releasedCount });
}
