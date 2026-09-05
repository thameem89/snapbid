import { z } from 'zod';
import { config, requireConfig } from '@/lib/server/config';
import { db, checked, authClient } from '@/lib/server/db';
import { getAccount } from '@/lib/server/ranking';
import { amountCents } from '@/lib/domain/ranking';
import { paymentProvider } from '@/lib/server/payment';
import { sameOrigin, limit, failure, hash } from '@/lib/server/http';
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    requireConfig();
    await limit(req, 'checkout', 8);
    const body = z
      .object({ slug: z.string().max(80), amount: z.string().max(20) })
      .parse(await req.json());
    const c = config();
    const cents = amountCents(body.amount, c.max);
    const account = await getAccount(body.slug);
    if (!account) throw new Error('This account is unavailable or suspended.');
    const provider = paymentProvider();
    const client = await authClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    const id = crypto.randomUUID();
    const token = crypto.randomUUID() + crypto.randomUUID();
    checked(
      await db()
        .from('promotion_purchases')
        .insert({
          id,
          social_account_id: account.id,
          payer_user_id: user?.id || null,
          amount_cents: cents,
          payment_provider: 'stripe',
          status_token_hash: await hash(token),
        }),
    );
    const session = await provider.createCheckout({
      purchaseId: id,
      amountCents: cents,
      account: account.username,
      successUrl: `${c.url}/payment?id=${id}&token=${token}`,
      cancelUrl: `${c.url}/payment?cancelled=1`,
    });
    checked(
      await db()
        .from('promotion_purchases')
        .update({ provider_session_id: session.id })
        .eq('id', id),
    );
    checked(
      await db()
        .from('payment_sessions')
        .insert({ purchase_id: id, provider_session_id: session.id }),
    );
    checked(
      await db()
        .from('analytics_events')
        .insert({
          event_name: 'checkout_start',
          social_account_id: account.id,
          purchase_id: id,
          user_id: user?.id || null,
        }),
    );
    return Response.json({ url: session.url });
  } catch (e) {
    return failure(e);
  }
}
