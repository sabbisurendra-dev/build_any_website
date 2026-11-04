import { NextResponse, type NextRequest } from 'next/server';
import { PaymentWebhookProcessorImpl } from '@/modules/payments/webhook.impl';
import { AppError } from '@/lib/errors';

const webhookProcessor = new PaymentWebhookProcessorImpl();

/**
 * Razorpay Webhook Endpoint (`POST /api/webhooks/razorpay`).
 *
 * Security Invariants:
 * 1. Reads raw unparsed body (`request.text()`) to compute exact HMAC-SHA256 digest.
 * 2. Verifies `x-razorpay-signature` in constant time BEFORE JSON parsing.
 * 3. Uses `x-razorpay-event-id` for idempotent deduplication in `payment_webhook_events`.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const signatureHeader = request.headers.get('x-razorpay-signature') ?? '';
  const providerEventId = request.headers.get('x-razorpay-event-id') ?? '';

  if (!signatureHeader || !providerEventId) {
    return NextResponse.json(
      { error: { code: 'PAYMENT_SIGNATURE_INVALID', message: 'Missing webhook headers.' } },
      { status: 401 },
    );
  }

  const rawBody = await request.text();

  try {
    const result = await webhookProcessor.processIncomingWebhook({
      provider: 'razorpay',
      providerEventId,
      signatureHeader,
      rawBody,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.httpStatus },
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to process webhook.' } },
      { status: 500 },
    );
  }
}
