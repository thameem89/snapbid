import { z } from 'zod';
import { db, checked, admin } from '@/lib/server/db';
import { sameOrigin, limit, failure } from '@/lib/server/http';
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const u = await admin();
    await limit(req, 'admin', 20, u.id);
    const b = z
      .object({
        accountId: z.uuid(),
        action: z.enum([
          'approve',
          'suspend',
          'reject',
          'approve_claim',
          'reject_claim',
          'verify_location',
          'resolve_report',
        ]),
        note: z.string().min(3).max(2000),
        claimId: z.uuid().optional(),
        location: z.string().optional(),
        reportId: z.uuid().optional(),
      })
      .parse(await req.json());
    checked(
      await db().rpc('moderate', {
        p_admin: u.id,
        p_account: b.accountId,
        p_action: b.action,
        p_note: b.note,
        p_claim: b.claimId || null,
        p_location: b.location || null,
        p_report: b.reportId || null,
      }),
    );
    return Response.json({ message: 'Moderation action recorded.' });
  } catch (e) {
    return failure(e, 403);
  }
}
