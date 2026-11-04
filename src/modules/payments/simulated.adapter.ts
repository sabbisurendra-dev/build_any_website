import 'server-only';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { getServerEnv } from '@/lib/env';
import type {
  CreateGatewayOrderInput,
  CreateGatewayRefundInput,
  GatewayOrderCreated,
  PaymentGatewayPort,
  VerifyCheckoutSignatureInput,
} from './payment-gateway.port';

/**
 * Deterministic Server-Verified Simulated Payment Gateway Adapter (PRD §9 & §17 P0).
 *
 * Enables full end-to-end checkout, failure/timeout simulation, delayed webhook testing,
 * and hold-expiry refund flows in MVP without faking database/availability integrity.
 * Signatures are still HMAC-verified on the server using `CRON_SECRET` so client payloads
 * can never forge payment success.
 */
export class SimulatedPaymentGatewayAdapter implements PaymentGatewayPort {
  public readonly provider = 'simulated' as const;

  private computeDigest(data: string): string {
    const { CRON_SECRET } = getServerEnv();
    return createHmac('sha256', CRON_SECRET).update(data).digest('hex');
  }

  private constantTimeEquals(a: string, b: string): boolean {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
  }

  public async createOrder(input: CreateGatewayOrderInput): Promise<GatewayOrderCreated> {
    const providerOrderId = `sim_ord_${randomUUID().replace(/-/g, '')}`;
    return {
      provider: 'simulated',
      providerOrderId,
      amountMinor: input.amountMinor,
      currency: input.currency,
      clientCheckoutPayload: {
        mode: 'simulated',
        bookingNumber: input.bookingNumber,
        providerOrderId,
      },
    };
  }

  public verifyClientCallbackSignature(input: VerifyCheckoutSignatureInput): boolean {
    const expected = this.computeDigest(`${input.providerOrderId}|${input.providerPaymentId}`);
    return this.constantTimeEquals(expected, input.providerSignature);
  }

  public verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
    if (!signatureHeader) return false;
    const expected = this.computeDigest(rawBody);
    return this.constantTimeEquals(expected, signatureHeader);
  }

  public async initiateRefund(
    _input: CreateGatewayRefundInput,
  ): Promise<{ providerRefundId: string }> {
    return { providerRefundId: `sim_rfnd_${randomUUID().replace(/-/g, '')}` };
  }
}
