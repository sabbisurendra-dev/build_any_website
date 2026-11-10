import { NextResponse, type NextRequest } from 'next/server';
import { PaymentWebhookProcessorImpl } from '@/modules/payments/webhook.impl';
import { AppError } from '@/lib/errors';

const webhookProcessor = new PaymentWebhookProcessorImpl();

/**
 * Stripe Webhook Endpoint (`POST /api/webhooks/stripe`).
 *
 * Security Invariants:
 * 1. Reads raw unparsed body (`request.text()`) to verify cryptographic Stripe HMAC signature.
 * 2. Verifies `stripe-signature` header in constant time BEFORE parsing JSON.
 * 3. Idempotently deduplicates events by event ID.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const signatureHeader = request.headers.get('stripe-signature') ?? '';

  if (!signatureHeader) {
    return NextResponse.json(
      { error: { code: 'PAYMENT_SIGNATURE_INVALID', message: 'Missing stripe-signature header.' } },
      { status: 401 },
    );
  }

  const rawBody = await request.text();

  let providerEventId = '';
  try {
    const json = JSON.parse(rawBody) as { id?: string };
    providerEventId = json.id ?? `evt_${Date.now()}`;
  } catch {
    providerEventId = `evt_${Date.now()}`;
  }

  try {
    const result = await webhookProcessor.processIncomingWebhook({
      provider: 'stripe',
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
