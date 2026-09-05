import { z } from 'zod';
import { config, requireConfig } from '@/lib/server/config';
import { db, checked, user } from '@/lib/server/db';
import { amountCents } from '@/lib/domain/ranking';
import { paymentProvider } from '@/lib/server/payment';
import { sameOrigin, limit, failure, hash } from '@/lib/server/http';
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    requireConfig();
    const u = await user();
    await limit(req, 'checkout', 8, u.id);
    const body = z
      .object({ slug: z.string().max(80), amount: z.string().max(20) })
      .parse(await req.json());
    const c = config();
    const cents = amountCents(body.amount, c.max);
    const account = checked(await db().from('social_accounts').select('*').eq('slug', body.slug).maybeSingle());
    if (!account || account.owner_user_id !== u.id || account.ownership_status !== 'verified' || account.account_status !== 'approved')
      throw new Error('Only the verified owner can boost this active profile.');
    const provider = paymentProvider();
    const id = crypto.randomUUID();
    const token = crypto.randomUUID() + crypto.randomUUID();
    checked(
      await db()
        .from('promotion_purchases')
        .insert({
          id,
          social_account_id: account.id,
          payer_user_id: u.id,
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
          user_id: u.id,
        }),
    );
    return Response.json({ url: session.url });
  } catch (e) {
    return failure(e);
  }
}
