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

function constantTimeHexEquals(expectedHex: string, candidateHex: string): boolean {
  const expectedBuf = Buffer.from(expectedHex, 'utf8');
  const candidateBuf = Buffer.from(candidateHex, 'utf8');
  if (expectedBuf.length !== candidateBuf.length) {
    return false;
  }
  return timingSafeEqual(expectedBuf, candidateBuf);
}

/**
 * Stripe Gateway Adapter (International Cards / Apple Pay / Google Pay).
 * Implements strict Stripe signature parsing (t=timestamp,v1=signature) and HMAC-SHA256 verification.
 */
export class StripeGatewayAdapter implements PaymentGatewayPort {
  public readonly provider = 'stripe' as const;

  public verifyClientCallbackSignature(input: VerifyCheckoutSignatureInput): boolean {
    const { STRIPE_SECRET_KEY } = getServerEnv();
    if (!STRIPE_SECRET_KEY) {
      throw new AppError('INTERNAL_ERROR', 'Stripe secret key is not configured.', 500);
    }
    const payload = `${input.providerOrderId}|${input.providerPaymentId}`;
    const expectedSignature = createHmac('sha256', STRIPE_SECRET_KEY)
      .update(payload)
      .digest('hex');

    return constantTimeHexEquals(expectedSignature, input.providerSignature);
  }

  public verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
    const { STRIPE_WEBHOOK_SECRET } = getServerEnv();
    if (!STRIPE_WEBHOOK_SECRET || !signatureHeader) {
      return false;
    }

    // Parse Stripe signature header format: "t=1492774577,v1=5257a869e7ecebeda32affa62cdca3fa51cad7e77a0e56ff536d0ce8e108d8bd"
    const items = signatureHeader.split(',');
    let timestamp = '';
    const signatures: string[] = [];

    for (const item of items) {
      const [key, value] = item.trim().split('=');
      if (key === 't' && value) {
        timestamp = value;
      } else if (key === 'v1' && value) {
        signatures.push(value);
      }
    }

    if (!timestamp || signatures.length === 0) {
      return false;
    }

    // Optional 5-minute replay attack check
    const nowSec = Math.floor(Date.now() / 1000);
    const headerSec = parseInt(timestamp, 10);
    if (isNaN(headerSec) || Math.abs(nowSec - headerSec) > 300) {
      return false;
    }

    const payload = `${timestamp}.${rawBody}`;
    const expectedSignature = createHmac('sha256', STRIPE_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    return signatures.some((sig) => constantTimeHexEquals(expectedSignature, sig));
  }

  public async createOrder(_input: CreateGatewayOrderInput): Promise<GatewayOrderCreated> {
    throw new Error('Stripe PaymentIntents integration available when configured.');
  }

  public async initiateRefund(
    _input: CreateGatewayRefundInput,
  ): Promise<{ providerRefundId: string }> {
    throw new Error('Stripe Refunds integration available when configured.');
  }
}
