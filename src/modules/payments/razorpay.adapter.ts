import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { getServerEnv } from '@/lib/env';
import { AppError } from '@/lib/errors';
import type {
  CreateGatewayOrderInput,
  CreateGatewayRefundInput,
  GatewayOrderCreated,
  PaymentGatewayPort,
  VerifyCheckoutSignatureInput,
} from './payment-gateway.port';

/**
 * Razorpay Gateway Adapter (Primary Indian Payment Provider: UPI Intent/QR, Cards, Netbanking).
 * Implements constant-time HMAC-SHA256 verification to prevent timing side-channel attacks.
 */

function constantTimeHexEquals(expectedHex: string, candidateHex: string): boolean {
  const expectedBuf = Buffer.from(expectedHex, 'utf8');
  const candidateBuf = Buffer.from(candidateHex, 'utf8');
  if (expectedBuf.length !== candidateBuf.length) {
    return false;
  }
  return timingSafeEqual(expectedBuf, candidateBuf);
}

export class RazorpayGatewayAdapter implements PaymentGatewayPort {
  public readonly provider = 'razorpay' as const;

  public verifyClientCallbackSignature(input: VerifyCheckoutSignatureInput): boolean {
    const { RAZORPAY_KEY_SECRET } = getServerEnv();
    if (!RAZORPAY_KEY_SECRET) {
      throw new AppError('INTERNAL_ERROR', 'Razorpay secret is not configured.', 500);
    }
    const payload = `${input.providerOrderId}|${input.providerPaymentId}`;
    const expectedSignature = createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(payload)
      .digest('hex');

    return constantTimeHexEquals(expectedSignature, input.providerSignature);
  }

  public verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
    const { RAZORPAY_WEBHOOK_SECRET } = getServerEnv();
    if (!RAZORPAY_WEBHOOK_SECRET || !signatureHeader) {
      return false;
    }
    const expectedSignature = createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    return constantTimeHexEquals(expectedSignature, signatureHeader);
  }

  public async createOrder(_input: CreateGatewayOrderInput): Promise<GatewayOrderCreated> {
    throw new Error('Not implemented in foundation phase: wire Razorpay Orders REST API in MVP Sprint 3.');
  }

  public async initiateRefund(
    _input: CreateGatewayRefundInput,
  ): Promise<{ providerRefundId: string }> {
    throw new Error('Not implemented in foundation phase: wire Razorpay Refunds REST API in MVP Sprint 3.');
  }
}
