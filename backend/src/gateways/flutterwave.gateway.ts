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

abstract class BaseGateway implements PaymentGateway {
  abstract readonly slug: string;
  abstract readonly displayName: string;

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    return this.simulatePayment(params);
  }

  async verifyPayment(_params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
    return { success: true, status: 'completed' };
  }

  async refund(_params: RefundParams): Promise<RefundResult> {
    return { success: true, externalId: `sim_ref_${generateRandomString(8)}` };
  }

  async handleWebhook(_payload: unknown, _signature?: string): Promise<WebhookResult> {
    return { success: false, error: 'Webhook not configured' };
  }

  async checkStatus(_externalId: string): Promise<StatusCheckResult> {
    return { success: true, status: 'completed' };
  }

  protected simulatePayment(params: CreatePaymentParams): CreatePaymentResult {
    const externalId = `sim_${this.slug}_${generateRandomString(12)}`;
    const paymentUrl = `${params.returnUrl}?simulated=true&externalId=${externalId}&transactionId=${params.transactionId}&gateway=${this.slug}`;
    return { success: true, paymentUrl, externalId };
  }
}

export class FlutterwaveGateway extends BaseGateway {
  readonly slug = 'flutterwave';
  readonly displayName = 'Flutterwave';

  override async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    if (!config.gateways.flutterwave.secretKey) {
      return this.simulatePayment(params);
    }

    try {
      const response = await fetch('https://api.flutterwave.com/v3/payments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.gateways.flutterwave.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tx_ref: params.transactionId,
          amount: params.amount,
          currency: params.currency,
          redirect_url: params.returnUrl,
          customer: {
            email: params.customerEmail,
            name: params.customerName,
            phonenumber: params.customerPhone,
          },
          customizations: { title: 'AO PAY', description: params.description },
        }),
      });

      const data = await response.json() as {
        status: string;
        data?: { link?: string };
        message?: string;
      };

      if (data.status !== 'success') {
        return { success: false, error: data.message || 'Flutterwave payment failed' };
      }

      return { success: true, paymentUrl: data.data?.link, externalId: params.transactionId };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Flutterwave error' };
    }
  }
}

export class SelcomGateway extends BaseGateway {
  readonly slug = 'selcom';
  readonly displayName = 'Selcom';
}

export class DpoGateway extends BaseGateway {
  readonly slug = 'dpo';
  readonly displayName = 'DPO Pay';
}
