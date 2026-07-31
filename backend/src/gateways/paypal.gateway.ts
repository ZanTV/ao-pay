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

export class PayPalGateway implements PaymentGateway {
  readonly slug = 'paypal';
  readonly displayName = 'PayPal';

  private baseUrl(): string {
    return config.gateways.paypal.mode === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';
  }

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    if (!config.gateways.paypal.clientId) {
      return this.simulatePayment(params);
    }

    try {
      const token = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl()}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{
            amount: { currency_code: params.currency, value: params.amount.toFixed(2) },
            description: params.description,
            custom_id: params.transactionId,
          }],
          application_context: {
            return_url: params.returnUrl,
            cancel_url: params.cancelUrl,
          },
        }),
      });

      const data = await response.json() as {
        id?: string;
        links?: Array<{ rel: string; href: string }>;
        message?: string;
      };

      if (!response.ok) {
        return { success: false, error: data.message || 'PayPal order creation failed' };
      }

      const approveLink = data.links?.find((l) => l.rel === 'approve');
      return { success: true, paymentUrl: approveLink?.href, externalId: data.id };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'PayPal error' };
    }
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
    if (!config.gateways.paypal.clientId) {
      return { success: true, status: 'completed' };
    }

    try {
      const token = await this.getAccessToken();
      const response = await fetch(
        `${this.baseUrl()}/v2/checkout/orders/${params.externalId}/capture`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        }
      );
      const data = await response.json() as { status?: string };

      return {
        success: true,
        status: data.status === 'COMPLETED' ? 'completed' : 'pending',
      };
    } catch {
      return { success: false, status: 'failed', error: 'PayPal verification failed' };
    }
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    if (!config.gateways.paypal.clientId) {
      return { success: true, externalId: `sim_ref_${generateRandomString(8)}` };
    }
    return { success: false, error: 'PayPal refund requires capture ID - implement via capture endpoint' };
  }

  async handleWebhook(_payload: unknown, _signature?: string): Promise<WebhookResult> {
    return { success: false, error: 'PayPal webhook handler not configured' };
  }

  async checkStatus(externalId: string): Promise<StatusCheckResult> {
    const result = await this.verifyPayment({ externalId, transactionId: '' });
    return { success: result.success, status: result.status, error: result.error };
  }

  private async getAccessToken(): Promise<string> {
    const credentials = Buffer.from(
      `${config.gateways.paypal.clientId}:${config.gateways.paypal.clientSecret}`
    ).toString('base64');

    const response = await fetch(`${this.baseUrl()}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const data = await response.json() as { access_token: string };
    return data.access_token;
  }

  private simulatePayment(params: CreatePaymentParams): CreatePaymentResult {
    const externalId = `sim_paypal_${generateRandomString(12)}`;
    const paymentUrl = `${params.returnUrl}?simulated=true&externalId=${externalId}&transactionId=${params.transactionId}`;
    return { success: true, paymentUrl, externalId };
  }
}
