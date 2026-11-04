import { NextResponse, type NextRequest } from 'next/server';
import { RazorpayGatewayAdapter } from '@/modules/payments/razorpay.adapter';

/**
 * Razorpay Webhook Endpoint (`POST /api/webhooks/razorpay`).
 *
 * Security Invariants:
 * 1. Reads raw unparsed body (`request.text()`) to compute exact HMAC-SHA256 digest.
 * 2. Verifies `x-razorpay-signature` in constant time BEFORE JSON parsing.
 * 3. Uses `x-razorpay-event-id` for idempotent deduplication in `payment_webhook_events`.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const signature = request.headers.get('x-razorpay-signature') ?? '';
  const eventId = request.headers.get('x-razorpay-event-id') ?? '';

  if (!signature || !eventId) {
    return NextResponse.json(
      { error: { code: 'PAYMENT_SIGNATURE_INVALID', message: 'Missing webhook headers.' } },
      { status: 401 },
    );
  }

  const rawBody = await request.text();
  const gateway = new RazorpayGatewayAdapter();

  if (!gateway.verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json(
      { error: { code: 'PAYMENT_SIGNATURE_INVALID', message: 'Invalid webhook signature.' } },
      { status: 401 },
    );
  }

  return NextResponse.json({ received: true, eventId }, { status: 200 });
}
