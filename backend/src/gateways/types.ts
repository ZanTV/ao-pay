export interface CreatePaymentParams {
  amount: number;
  currency: string;
  description?: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  transactionId: string;
  returnUrl: string;
  cancelUrl: string;
  metadata?: Record<string, unknown>;
}

export interface CreatePaymentResult {
  success: boolean;
  paymentUrl?: string;
  externalId?: string;
  clientSecret?: string;
  error?: string;
}

export interface VerifyPaymentParams {
  externalId: string;
  transactionId: string;
}

export interface VerifyPaymentResult {
  success: boolean;
  status: 'completed' | 'pending' | 'failed';
  amount?: number;
  currency?: string;
  error?: string;
}

export interface RefundParams {
  externalId: string;
  amount: number;
  currency: string;
  reason?: string;
}

export interface RefundResult {
  success: boolean;
  externalId?: string;
  error?: string;
}

export interface WebhookResult {
  success: boolean;
  transactionId?: string;
  status?: 'completed' | 'failed' | 'refunded';
  externalId?: string;
  error?: string;
}

export interface StatusCheckResult {
  success: boolean;
  status: 'completed' | 'pending' | 'failed' | 'unknown';
  amount?: number;
  error?: string;
}

export interface PaymentGateway {
  readonly slug: string;
  readonly displayName: string;

  createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult>;
  verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult>;
  refund(params: RefundParams): Promise<RefundResult>;
  handleWebhook(payload: unknown, signature?: string): Promise<WebhookResult>;
  checkStatus(externalId: string): Promise<StatusCheckResult>;
}

export interface GatewayConfig {
  isTestMode?: boolean;
  [key: string]: unknown;
}
