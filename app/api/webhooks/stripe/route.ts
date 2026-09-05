import { paymentProvider } from '@/lib/server/payment';
import { db, checked } from '@/lib/server/db';
export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature');
  if (!signature)
    return Response.json({ error: 'Signature required' }, { status: 400 });
  let event;
  try {
    const raw = await req.text();
    if (raw.length > 1000000) throw new Error('Payload too large');
    event = await paymentProvider().verifyWebhook(raw, signature);
  } catch {
    return Response.json(
      { error: 'Webhook verification failed' },
      { status: 400 },
    );
  }
  if (!event) return Response.json({ received: true });
  try {
    const result = checked(
      await db().rpc('apply_payment_event', {
        p_provider: event.provider,
        p_event: event.eventId,
        p_purchase: event.purchaseId,
        p_payment: event.paymentId,
        p_amount: event.amountCents,
        p_currency: event.currency,
        p_verified: event.verified,
        p_refunded: event.refundedCents,
        p_disputed: event.disputed,
        p_kind: event.kind,
      }),
    );
    return Response.json({ received: true, result });
  } catch {
    return Response.json(
      { error: 'Event processing failed; retry required' },
      { status: 500 },
    );
  }
}
