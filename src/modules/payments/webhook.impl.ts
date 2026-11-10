import { AppError } from '@/lib/errors';
import type {
  IncomingWebhookEnvelope,
  PaymentWebhookProcessorPort,
  WebhookProcessResult,
} from './webhook.processor';
import { RazorpayGatewayAdapter } from './razorpay.adapter';
import { StripeGatewayAdapter } from './stripe.adapter';
import { SimulatedPaymentGatewayAdapter } from './simulated.adapter';
import { BookingServiceImpl } from '@/modules/booking/booking.impl';
import { RuntimeStateRepository } from '@/modules/persistence/runtime-store';
import { db } from '@/db';
import { paymentWebhookEvents } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import type { UUID } from '@/types/domain';

export class PaymentWebhookProcessorImpl implements PaymentWebhookProcessorPort {
  private razorpayGateway = new RazorpayGatewayAdapter();
  private stripeGateway = new StripeGatewayAdapter();
  private simulatedGateway = new SimulatedPaymentGatewayAdapter();
  private bookingService = new BookingServiceImpl();

  public async processIncomingWebhook(
    envelope: IncomingWebhookEnvelope,
  ): Promise<WebhookProcessResult> {
    const { provider, providerEventId, signatureHeader, rawBody } = envelope;

    // 1. Cryptographic HMAC Signature Verification BEFORE JSON parsing
    let isValid = false;
    if (provider === 'razorpay') {
      isValid = this.razorpayGateway.verifyWebhookSignature(rawBody, signatureHeader);
    } else if (provider === 'stripe') {
      isValid = this.stripeGateway.verifyWebhookSignature(rawBody, signatureHeader);
    } else if (provider === 'simulated') {
      isValid = this.simulatedGateway.verifyWebhookSignature(rawBody, signatureHeader);
    }

    if (!isValid) {
      throw new AppError(
        'PAYMENT_SIGNATURE_INVALID',
        'Invalid webhook HMAC signature.',
        401,
      );
    }

    // 2. Idempotent Deduplication (Postgres table or in-memory fallback)
    const state = RuntimeStateRepository.getState();
    const eventKey = `${provider}:${providerEventId}`;

    if (state.processedWebhookKeys.includes(eventKey)) {
      return {
        status: 'duplicate_ignored',
        eventType: 'payment.captured',
      };
    }

    if (process.env.DATABASE_URL) {
      try {
        const [existing] = await db
          .select()
          .from(paymentWebhookEvents)
          .where(
            and(
              eq(paymentWebhookEvents.provider, provider),
              eq(paymentWebhookEvents.providerEventId, providerEventId),
            ),
          )
          .limit(1);

        if (existing && existing.processingStatus === 'processed') {
          return {
            status: 'duplicate_ignored',
            eventType: existing.eventType,
          };
        }
      } catch {
        // Fall back gracefully to memory state if DB is offline during tests
      }
    }

    // 3. Parse JSON Body safely after signature verification
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      throw new AppError('VALIDATION_ERROR', 'Malformed webhook JSON payload.', 400);
    }

    const eventType = (parsed.event as string) || (parsed.type as string) || 'payment.captured';

    // 4. Process Payment Capture / Failure
    if (
      eventType === 'payment.captured' ||
      eventType === 'order.paid' ||
      eventType === 'payment_intent.succeeded'
    ) {
      const payload = (parsed.payload as Record<string, unknown>) ?? (parsed.data as Record<string, unknown>) ?? {};
      const paymentEntity =
        ((payload.payment as Record<string, unknown>)?.entity as Record<string, unknown>) ??
        ((payload.object as Record<string, unknown>) ?? {});
      const notes =
        (paymentEntity.notes as Record<string, unknown>) ??
        (paymentEntity.metadata as Record<string, unknown>) ??
        (parsed.notes as Record<string, unknown>) ??
        {};

      const tenantId = String(notes.tenantId ?? '');
      const bookingId = String(notes.bookingId ?? '');
      const paymentId = String(paymentEntity.id ?? providerEventId);

      if (!tenantId || !bookingId) {
        throw new AppError(
          'VALIDATION_ERROR',
          'Webhook payload missing tenantId or bookingId in payment notes.',
          400,
        );
      }

      await this.bookingService.confirmBookingFromVerifiedPayment({
        tenantId,
        bookingId,
        paymentId,
      });

      if (process.env.DATABASE_URL) {
        try {
          await db
            .insert(paymentWebhookEvents)
            .values({
              provider,
              providerEventId,
              eventType,
              tenantId: tenantId as UUID,
              signatureVerified: true,
              payload: parsed,
              processingStatus: 'processed',
              processedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [paymentWebhookEvents.provider, paymentWebhookEvents.providerEventId],
              set: {
                processingStatus: 'processed',
                processedAt: new Date(),
              },
            });
        } catch {
          // Non-fatal logging
        }
      }
    } else if (
      eventType === 'payment.failed' ||
      eventType === 'payment_intent.payment_failed'
    ) {
      const payload = (parsed.payload as Record<string, unknown>) ?? (parsed.data as Record<string, unknown>) ?? {};
      const paymentEntity =
        ((payload.payment as Record<string, unknown>)?.entity as Record<string, unknown>) ??
        ((payload.object as Record<string, unknown>) ?? {});
      const notes =
        (paymentEntity.notes as Record<string, unknown>) ??
        (paymentEntity.metadata as Record<string, unknown>) ??
        (parsed.notes as Record<string, unknown>) ??
        {};
      const tenantId = String(notes.tenantId ?? '');
      const bookingId = String(notes.bookingId ?? '');
      const orderId = String(paymentEntity.order_id ?? paymentEntity.id ?? '');

      if (tenantId && bookingId && orderId) {
        await this.bookingService.recordPaymentFailure({
          tenantId,
          bookingId,
          providerOrderId: orderId,
          reason: `Gateway ${eventType} webhook`,
        });
      }
    }

    state.processedWebhookKeys.push(eventKey);
    RuntimeStateRepository.persist();

    return {
      status: 'processed',
      eventType,
    };
  }

  public static resetForTests(): void {
    const state = RuntimeStateRepository.getState();
    state.processedWebhookKeys = [];
  }
}
