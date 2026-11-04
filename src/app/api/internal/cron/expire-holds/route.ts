import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { getServerEnv } from '@/lib/env';
import { BookingServiceImpl } from '@/modules/booking/booking.impl';

const bookingService = new BookingServiceImpl();

/**
 * Scheduled Housekeeping Endpoint (`POST /api/internal/cron/expire-holds`).
 * Sweeps expired `booking_holds` (`expires_at <= now()`), releasing `booking_items`
 * and decrementing `booking_sessions.held_count`.
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

  const { releasedCount } = await bookingService.sweepExpiredHolds();

  return NextResponse.json({ ok: true, releasedCount });
}
