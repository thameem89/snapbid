import { z } from 'zod';
import { db, checked, user } from '@/lib/server/db';
import { sameOrigin, limit, failure } from '@/lib/server/http';
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const u = await user();
    await limit(req, 'claim', 3, u.id);
    const b = z
      .object({ accountId: z.uuid(), evidence: z.string().min(10).max(3000) })
      .parse(await req.json());
    const a = checked(
      await db()
        .from('social_accounts')
        .select('id')
        .eq('id', b.accountId)
        .eq('account_status', 'approved')
        .maybeSingle(),
    );
    if (!a) throw new Error('Account unavailable.');
    const result = await db()
      .from('account_claims')
      .insert({ social_account_id: a.id, user_id: u.id, evidence: b.evidence });
    if (result.error?.code === '23505')
      throw new Error('You already have a pending claim.');
    checked(result);
    return Response.json({
      message:
        'Claim submitted for private administrator review. A promotion purchase does not establish ownership.',
    });
  } catch (e) {
    return failure(e);
  }
}
