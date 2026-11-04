import type { CurrencyCode, MinorCurrencyAmount, PaymentProvider, UUID } from '@/types/domain';

/**
 * Gateway-agnostic payment port enabling Razorpay (Primary) and Cashfree (Secondary)
 * without leaking SDK specifics into booking domain logic.
 *
 * PCI-DSS Boundary: Card PAN/CVV never transit platform servers; checkout happens via
 * hosted/inline gateway SDK tokens and server-verified HMAC signatures.
 */

export interface CreateGatewayOrderInput {
  readonly tenantId: UUID;
  readonly bookingId: UUID;
  readonly bookingNumber: string;
  readonly amountMinor: MinorCurrencyAmount; // INR paise
  readonly currency: CurrencyCode;
  readonly idempotencyKey: string;
  readonly customer: {
    readonly name: string;
    readonly phone: string;
    readonly email?: string;
  };
}

export interface GatewayOrderCreated {
  readonly provider: Exclude<PaymentProvider, 'manual'>;
  readonly providerOrderId: string;
  readonly amountMinor: MinorCurrencyAmount;
  readonly currency: CurrencyCode;
  readonly clientCheckoutPayload: Record<string, unknown>;
}

export interface VerifyCheckoutSignatureInput {
  readonly providerOrderId: string;
  readonly providerPaymentId: string;
  readonly providerSignature: string;
}

export interface CreateGatewayRefundInput {
  readonly providerPaymentId: string;
  readonly amountMinor: MinorCurrencyAmount;
  readonly idempotencyKey: string;
  readonly notes?: Record<string, string>;
}

export interface PaymentGatewayPort {
  readonly provider: Exclude<PaymentProvider, 'manual'>;

  createOrder(input: CreateGatewayOrderInput): Promise<GatewayOrderCreated>;

  verifyClientCallbackSignature(input: VerifyCheckoutSignatureInput): boolean;

  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean;

  initiateRefund(input: CreateGatewayRefundInput): Promise<{ providerRefundId: string }>;
}
