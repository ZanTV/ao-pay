import {
  PaymentGateway,
  CreatePaymentParams,
  CreatePaymentResult,
  VerifyPaymentParams,
  VerifyPaymentResult,
  RefundParams,
  RefundResult,
  WebhookResult,
  StatusCheckResult,
} from './types.js';
import { config } from '../config/index.js';
import { generateRandomString } from '../utils/crypto.js';

export class StripeGateway implements PaymentGateway {
  readonly slug = 'stripe';
  readonly displayName = 'Stripe';

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    if (!config.gateways.stripe.secretKey) {
      return this.simulatePayment(params);
    }

    try {
      const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.gateways.stripe.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'mode': 'payment',
          'success_url': params.returnUrl,
          'cancel_url': params.cancelUrl,
          'customer_email': params.customerEmail,
          'line_items[0][price_data][currency]': params.currency.toLowerCase(),
          'line_items[0][price_data][product_data][name]': params.description || 'Payment',
          'line_items[0][price_data][unit_amount]': String(Math.round(params.amount * 100)),
          'line_items[0][quantity]': '1',
          'metadata[transactionId]': params.transactionId,
        }),
      });

      const data = await response.json() as { url?: string; id?: string; error?: { message: string } };

      if (!response.ok) {
        return { success: false, error: data.error?.message || 'Stripe payment creation failed' };
      }

      return { success: true, paymentUrl: data.url, externalId: data.id };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Stripe error' };
    }
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
    if (!config.gateways.stripe.secretKey) {
      return { success: true, status: 'completed' };
    }

    try {
      const response = await fetch(
        `https://api.stripe.com/v1/checkout/sessions/${params.externalId}`,
        {
          headers: { Authorization: `Bearer ${config.gateways.stripe.secretKey}` },
        }
      );
      const data = await response.json() as { payment_status?: string; amount_total?: number; currency?: string };

      return {
        success: true,
        status: data.payment_status === 'paid' ? 'completed' : 'pending',
        amount: data.amount_total ? data.amount_total / 100 : undefined,
        currency: data.currency?.toUpperCase(),
      };
    } catch {
      return { success: false, status: 'failed', error: 'Verification failed' };
    }
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    if (!config.gateways.stripe.secretKey) {
      return { success: true, externalId: `sim_ref_${generateRandomString(8)}` };
    }

    try {
      const response = await fetch('https://api.stripe.com/v1/refunds', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.gateways.stripe.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          payment_intent: params.externalId,
          amount: String(Math.round(params.amount * 100)),
        }),
      });

      const data = await response.json() as { id?: string; error?: { message: string } };
      if (!response.ok) {
        return { success: false, error: data.error?.message };
      }
      return { success: true, externalId: data.id };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Refund failed' };
    }
  }

  async handleWebhook(payload: unknown, signature?: string): Promise<WebhookResult> {
    const event = payload as { type?: string; data?: { object?: { metadata?: { transactionId?: string }; id?: string } } };

    if (event.type === 'checkout.session.completed') {
      return {
        success: true,
        transactionId: event.data?.object?.metadata?.transactionId,
        status: 'completed',
        externalId: event.data?.object?.id,
      };
    }

    return { success: false, error: 'Unhandled webhook event' };
  }

  async checkStatus(externalId: string): Promise<StatusCheckResult> {
    const result = await this.verifyPayment({ externalId, transactionId: '' });
    return { success: result.success, status: result.status, amount: result.amount, error: result.error };
  }

  private simulatePayment(params: CreatePaymentParams): CreatePaymentResult {
    const externalId = `sim_stripe_${generateRandomString(12)}`;
    const paymentUrl = `${params.returnUrl}?simulated=true&externalId=${externalId}&transactionId=${params.transactionId}`;
    return { success: true, paymentUrl, externalId, clientSecret: generateRandomString(16) };
  }
}
