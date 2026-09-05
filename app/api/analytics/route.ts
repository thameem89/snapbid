import { z } from 'zod';
import { db, checked } from '@/lib/server/db';
import { sameOrigin, limit, failure } from '@/lib/server/http';
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    await limit(req, 'analytics', 30);
    const b = z
      .object({
        event: z.enum([
          'profile_view',
          'outbound_click',
          'boost_click',
          'share',
          'referral_visit',
        ]),
        accountId: z.uuid(),
      })
      .parse(await req.json());
    checked(
      await db()
        .from('analytics_events')
        .insert({ event_name: b.event, social_account_id: b.accountId }),
    );
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
