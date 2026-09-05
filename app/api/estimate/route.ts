import { getAccount, estimate } from '@/lib/server/ranking';
import { amountCents } from '@/lib/domain/ranking';
import { config } from '@/lib/server/config';
import { failure, limit } from '@/lib/server/http';
export async function GET(req: Request) {
  try {
    if (!config().demo) await limit(req, 'estimate', 60);
    const u = new URL(req.url);
    const account = await getAccount(u.searchParams.get('account') || '');
    if (!account) throw new Error('Account unavailable.');
    const cents = amountCents(u.searchParams.get('amount') || '', config().max);
    return Response.json({
      rank: await estimate(account, account.location_id, cents),
      cents,
    });
  } catch (e) {
    return failure(e);
  }
}
