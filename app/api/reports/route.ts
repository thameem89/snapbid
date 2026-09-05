import { z } from 'zod';
import { db, checked, user } from '@/lib/server/db';
import { sameOrigin, limit, failure } from '@/lib/server/http';
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const u = await user();
    await limit(req, 'report', 5, u.id);
    const b = z
      .object({ accountId: z.uuid(), reason: z.string().min(10).max(2000) })
      .parse(await req.json());
    checked(
      await db().from('reports').insert({
        social_account_id: b.accountId,
        reporter_user_id: u.id,
        reason: b.reason,
      }),
    );
    return Response.json({
      message: 'Report submitted. Thank you for helping keep Rally safe.',
    });
  } catch (e) {
    return failure(e);
  }
}
