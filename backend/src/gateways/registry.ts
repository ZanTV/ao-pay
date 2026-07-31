import { PaymentGateway } from './types.js';
import { StripeGateway } from './stripe.gateway.js';
import { PayPalGateway } from './paypal.gateway.js';
import { FlutterwaveGateway, SelcomGateway, DpoGateway } from './flutterwave.gateway.js';
import { PesapalGateway } from './pesapal.gateway.js';

class GatewayRegistry {
  private gateways = new Map<string, PaymentGateway>();

  constructor() {
    this.register(new StripeGateway());
    this.register(new PayPalGateway());
    this.register(new FlutterwaveGateway());
    this.register(new PesapalGateway());
    this.register(new SelcomGateway());
    this.register(new DpoGateway());
  }

  register(gateway: PaymentGateway): void {
    this.gateways.set(gateway.slug, gateway);
  }

  get(slug: string): PaymentGateway | undefined {
    return this.gateways.get(slug);
  }

  getAll(): PaymentGateway[] {
    return Array.from(this.gateways.values());
  }

  has(slug: string): boolean {
    return this.gateways.has(slug);
  }
}

export const gatewayRegistry = new GatewayRegistry();
