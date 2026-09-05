import Stripe from 'stripe';
export type VerifiedPayment = {
  provider: string;
  eventId: string;
  purchaseId: string;
  paymentId: string;
  amountCents: number;
  currency: string;
  verified: boolean;
  refundedCents: number;
  disputed: boolean;
  kind: string;
};
export interface PaymentProvider {
  createCheckout(input: {
    purchaseId: string;
    amountCents: number;
    account: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ id: string; url: string }>;
  verifyWebhook(
    body: string,
    signature: string,
  ): Promise<VerifiedPayment | null>;
  retrievePayment(
    id: string,
  ): Promise<{ amountCents: number; currency: string; paid: boolean }>;
  createRefund(id: string, amountCents: number, key: string): Promise<string>;
}
export class StripeProvider implements PaymentProvider {
  private stripe: Stripe;
  constructor(
    private secret: string,
    private webhookSecret: string,
  ) {
    if (!secret.startsWith('sk_test_'))
      throw new Error('Stripe test-mode configuration is required.');
    this.stripe = new Stripe(secret, {
      httpClient: Stripe.createFetchHttpClient(),
    });
  }
  async createCheckout(input: {
    purchaseId: string;
    amountCents: number;
    account: string;
    successUrl: string;
    cancelUrl: string;
  }) {
    const s = await this.stripe.checkout.sessions.create(
      {
        mode: 'payment',
        client_reference_id: input.purchaseId,
        metadata: { purchase_id: input.purchaseId },
        payment_intent_data: { metadata: { purchase_id: input.purchaseId } },
        line_items: [
          {
            price_data: {
              currency: 'usd',
              unit_amount: input.amountCents,
              product_data: {
                name: `Promotional placement for @${input.account}`,
                description:
                  'Cumulative sponsored social-profile ranking value. Position may change.',
              },
            },
            quantity: 1,
          },
        ],
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
      },
      { idempotencyKey: input.purchaseId },
    );
    if (!s.url) throw new Error('Checkout unavailable.');
    return { id: s.id, url: s.url };
  }
  async retrievePayment(id: string) {
    const p = await this.stripe.paymentIntents.retrieve(id);
    return {
      amountCents: p.amount,
      currency: p.currency.toUpperCase(),
      paid: p.status === 'succeeded',
    };
  }
  async createRefund(id: string, amountCents: number, key: string) {
    const r = await this.stripe.refunds.create(
      { payment_intent: id, amount: amountCents },
      { idempotencyKey: key },
    );
    return r.id;
  }
  async verifyWebhook(
    body: string,
    signature: string,
  ): Promise<VerifiedPayment | null> {
    const e = await this.stripe.webhooks.constructEventAsync(
      body,
      signature,
      this.webhookSecret,
      300,
      Stripe.createSubtleCryptoProvider(),
    );
    if (e.livemode) throw new Error('Live payment events are disabled.');
    let paymentId: string | null = null;
    let disputed = false;
    if (
      e.type === 'payment_intent.succeeded' ||
      e.type === 'payment_intent.payment_failed'
    )
      paymentId = e.data.object.id;
    else if (e.type === 'charge.refunded') {
      const p = e.data.object.payment_intent;
      paymentId = typeof p === 'string' ? p : p?.id || null;
    } else if (e.type === 'charge.dispute.created') {
      const p = e.data.object.payment_intent;
      paymentId = typeof p === 'string' ? p : p?.id || null;
      disputed = true;
    } else return null;
    if (!paymentId) throw new Error('Missing payment reference');
    const p = await this.stripe.paymentIntents.retrieve(paymentId, {
      expand: ['latest_charge'],
    });
    const charge = typeof p.latest_charge === 'object' ? p.latest_charge : null;
    if (!p.metadata.purchase_id) throw new Error('Missing purchase reference');
    return {
      provider: 'stripe',
      eventId: e.id,
      purchaseId: p.metadata.purchase_id,
      paymentId: p.id,
      amountCents: p.amount,
      currency: p.currency.toUpperCase(),
      verified: p.status === 'succeeded',
      refundedCents: charge?.amount_refunded || 0,
      disputed: disputed || Boolean(charge?.disputed),
      kind: e.type === 'payment_intent.payment_failed' ? 'failed' : e.type,
    };
  }
}
export function paymentProvider(): PaymentProvider {
  if (
    process.env.PAYMENT_PROVIDER !== 'stripe' ||
    !process.env.STRIPE_SECRET_KEY ||
    !process.env.STRIPE_WEBHOOK_SECRET
  )
    throw new Error('Payments are not configured yet.');
  return new StripeProvider(
    process.env.STRIPE_SECRET_KEY,
    process.env.STRIPE_WEBHOOK_SECRET,
  );
}
