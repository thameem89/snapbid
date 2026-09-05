import { z } from 'zod';
import { db, checked, user } from '@/lib/server/db';
import { sameOrigin, limit, failure } from '@/lib/server/http';
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const u = await user();
    await limit(req, 'preferences', 10, u.id);
    const b = z
      .object({ promotionUpdates: z.boolean() })
      .parse(await req.json());
    checked(
      await db()
        .from('notification_preferences')
        .upsert({ user_id: u.id, promotion_updates: b.promotionUpdates }),
    );
    return Response.json({
      message: 'Preference saved. Notification delivery is not enabled yet.',
    });
  } catch (e) {
    return failure(e);
  }
}
