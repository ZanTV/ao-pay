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

interface PesapalTokenResponse {
  token?: string;
  error?: { message: string };
}

interface PesapalOrderResponse {
  order_tracking_id?: string;
  redirect_url?: string;
  error?: { message: string };
  message?: string;
}

interface PesapalStatusResponse {
  payment_status_description?: string;
  status?: string;
  amount?: number;
  currency?: string;
}

export class PesapalGateway implements PaymentGateway {
  readonly slug = 'pesapal';
  readonly displayName = 'Pesapal';

  private baseUrl(): string {
    return config.gateways.pesapal.environment === 'live'
      ? 'https://pay.pesapal.com/v3'
      : 'https://cybqa.pesapal.com/pesapalv3';
  }

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    const { consumerKey, consumerSecret } = config.gateways.pesapal;

    if (!consumerKey || !consumerSecret) {
      return this.simulatePayment(params);
    }

    try {
      const token = await this.getAccessToken();
      if (!token) {
        return { success: false, error: 'Failed to authenticate with Pesapal' };
      }

      const nameParts = params.customerName.trim().split(' ');
      const firstName = nameParts[0] || params.customerName;
      const lastName = nameParts.slice(1).join(' ') || firstName;

      const response = await fetch(`${this.baseUrl()}/api/Transactions/SubmitOrderRequest`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          id: params.transactionId,
          currency: params.currency,
          amount: params.amount,
          description: params.description || 'AO PAY Payment',
          callback_url: params.returnUrl,
          notification_id: config.gateways.pesapal.ipnId || undefined,
          billing_address: {
            email_address: params.customerEmail,
            phone_number: params.customerPhone || '',
            country_code: this.currencyToCountry(params.currency),
            first_name: firstName,
            last_name: lastName,
          },
        }),
      });

      const data = (await response.json()) as PesapalOrderResponse;

      if (!response.ok || !data.redirect_url) {
        return {
          success: false,
          error: data.error?.message || data.message || 'Pesapal order creation failed',
        };
      }

      return {
        success: true,
        paymentUrl: data.redirect_url,
        externalId: data.order_tracking_id || params.transactionId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Pesapal error',
      };
    }
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
    const result = await this.checkStatus(params.externalId);
    const statusMap: Record<string, VerifyPaymentResult['status']> = {
      COMPLETED: 'completed',
      INVALID: 'failed',
      FAILED: 'failed',
    };
    return {
      success: result.success,
      status: statusMap[result.status?.toUpperCase() || ''] || 'pending',
      amount: result.amount,
      error: result.error,
    };
  }

  async refund(_params: RefundParams): Promise<RefundResult> {
    return { success: false, error: 'Pesapal refunds are processed via Pesapal merchant dashboard' };
  }

  async handleWebhook(payload: unknown, _signature?: string): Promise<WebhookResult> {
    const data = payload as Record<string, string>;
    const orderTrackingId = data.OrderTrackingId || data.orderTrackingId;
    const merchantReference = data.OrderMerchantReference || data.orderMerchantReference;

    if (!orderTrackingId || !merchantReference) {
      return { success: false, error: 'Missing Pesapal IPN parameters' };
    }

    const status = await this.checkStatus(orderTrackingId);
    if (status.status === 'completed') {
      return {
        success: true,
        transactionId: merchantReference,
        status: 'completed',
        externalId: orderTrackingId,
      };
    }

    return { success: true, transactionId: merchantReference, status: 'failed', externalId: orderTrackingId };
  }

  async checkStatus(externalId: string): Promise<StatusCheckResult> {
    const { consumerKey, consumerSecret } = config.gateways.pesapal;

    if (!consumerKey || !consumerSecret) {
      return { success: true, status: 'completed' };
    }

    try {
      const token = await this.getAccessToken();
      if (!token) {
        return { success: false, status: 'unknown', error: 'Authentication failed' };
      }

      const response = await fetch(
        `${this.baseUrl()}/api/Transactions/GetTransactionStatus?orderTrackingId=${externalId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );

      const data = (await response.json()) as PesapalStatusResponse;
      const status = data.payment_status_description || data.status || 'PENDING';

      return {
        success: true,
        status: status.toUpperCase() === 'COMPLETED' ? 'completed' : status.toUpperCase() === 'FAILED' ? 'failed' : 'pending',
        amount: data.amount,
      };
    } catch {
      return { success: false, status: 'unknown', error: 'Status check failed' };
    }
  }

  private async getAccessToken(): Promise<string | null> {
    const { consumerKey, consumerSecret } = config.gateways.pesapal;

    const response = await fetch(`${this.baseUrl()}/api/Auth/RequestToken`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        consumer_key: consumerKey,
        consumer_secret: consumerSecret,
      }),
    });

    const data = (await response.json()) as PesapalTokenResponse;
    return data.token || null;
  }

  private currencyToCountry(currency: string): string {
    const map: Record<string, string> = {
      TZS: 'TZ',
      KES: 'KE',
      UGX: 'UG',
      USD: 'TZ',
    };
    return map[currency.toUpperCase()] || 'TZ';
  }

  private simulatePayment(params: CreatePaymentParams): CreatePaymentResult {
    const externalId = `sim_pesapal_${generateRandomString(12)}`;
    const paymentUrl = `${params.returnUrl}?simulated=true&externalId=${externalId}&transactionId=${params.transactionId}&gateway=pesapal`;
    return { success: true, paymentUrl, externalId };
  }
}
