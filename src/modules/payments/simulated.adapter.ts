import 'server-only';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { getServerEnv } from '@/lib/env';
import { AppError } from '@/lib/errors';
import type {
  CreateGatewayOrderInput,
  CreateGatewayRefundInput,
  GatewayOrderCreated,
  PaymentGatewayPort,
  VerifyCheckoutSignatureInput,
} from './payment-gateway.port';

export function isMockPaymentsAllowed(): boolean {
  if (process.env.NODE_ENV === 'test') return true;
  return process.env.ENABLE_MOCK_PAYMENTS === 'true';
}

function assertMockPaymentsAllowed(): void {
  if (!isMockPaymentsAllowed()) {
    throw new AppError(
      'FORBIDDEN',
      'Simulated mock payments are disabled. Set ENABLE_MOCK_PAYMENTS=true for local development.',
      403,
    );
  }
}

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
    assertMockPaymentsAllowed();
    const secret =
      process.env.NODE_ENV === 'production'
        ? getServerEnv().CRON_SECRET
        : process.env.CRON_SECRET && process.env.CRON_SECRET.length >= 32
        ? process.env.CRON_SECRET
        : 'development_cron_secret_minimum_32_characters_string';
    return createHmac('sha256', secret).update(data).digest('hex');
  }

  private constantTimeEquals(a: string, b: string): boolean {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
  }

  public async createOrder(input: CreateGatewayOrderInput): Promise<GatewayOrderCreated> {
    assertMockPaymentsAllowed();
    const providerOrderId = `sim_ord_${randomUUID().replace(/-/g, '')}`;
    const simulatedPaymentId = `sim_pay_${randomUUID().replace(/-/g, '')}`;
    const simulatedSignature = this.computeDigest(`${providerOrderId}|${simulatedPaymentId}`);
    return {
      provider: 'simulated',
      providerOrderId,
      amountMinor: input.amountMinor,
      currency: input.currency,
      clientCheckoutPayload: {
        mode: 'simulated',
        bookingNumber: input.bookingNumber,
        providerOrderId,
        simulatedPaymentId,
        simulatedSignature,
      },
    };
  }

  public computeWebhookSignatureForTest(rawBody: string): string {
    return this.computeDigest(rawBody);
  }

  public computeCallbackSignatureForTest(
    providerOrderId: string,
    providerPaymentId: string,
  ): string {
    return this.computeDigest(`${providerOrderId}|${providerPaymentId}`);
  }

  public verifyClientCallbackSignature(input: VerifyCheckoutSignatureInput): boolean {
    if (!isMockPaymentsAllowed()) return false;
    const expected = this.computeDigest(`${input.providerOrderId}|${input.providerPaymentId}`);
    return this.constantTimeEquals(expected, input.providerSignature);
  }

  public verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
    if (!signatureHeader || !isMockPaymentsAllowed()) return false;
    const expected = this.computeDigest(rawBody);
    return this.constantTimeEquals(expected, signatureHeader);
  }

  public async initiateRefund(
    _input: CreateGatewayRefundInput,
  ): Promise<{ providerRefundId: string }> {
    assertMockPaymentsAllowed();
    return { providerRefundId: `sim_rfnd_${randomUUID().replace(/-/g, '')}` };
  }
}
