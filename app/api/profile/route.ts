import { z } from 'zod';
import { db, checked, user } from '@/lib/server/db';
import { sameOrigin, limit, failure } from '@/lib/server/http';
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const u = await user();
    await limit(req, 'profile-edit', 10, u.id);
    const b = z
      .object({
        accountId: z.uuid(),
        displayName: z.string().min(1).max(80),
        bio: z.string().max(500),
      })
      .parse(await req.json());
    const owner = checked(
      await db()
        .from('social_account_owners')
        .select('social_account_id')
        .eq('social_account_id', b.accountId)
        .eq('user_id', u.id)
        .maybeSingle(),
    );
    if (!owner) throw new Error('Verified ownership required.');
    checked(
      await db()
        .from('social_accounts')
        .update({
          display_name: b.displayName,
          bio: b.bio,
          updated_at: new Date().toISOString(),
        })
        .eq('id', b.accountId)
        .eq('account_status', 'approved'),
    );
    return Response.json({ message: 'Profile updated.' });
  } catch (e) {
    return failure(e, 403);
  }
}
