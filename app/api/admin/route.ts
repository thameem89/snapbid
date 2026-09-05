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
          'approve_verification',
          'reject_verification',
        ]),
        note: z.string().min(3).max(2000),
        claimId: z.uuid().optional(),
        location: z.string().optional(),
        reportId: z.uuid().optional(),
        verificationId: z.uuid().optional(),
      })
      .parse(await req.json());
    if (b.action === 'approve_verification' || b.action === 'reject_verification') {
      if (!b.verificationId) throw new Error('Verification ID required.');
      const challenge = checked(await db().from('social_verification_challenges').select('id,social_account_id,user_id,status,expires_at').eq('id', b.verificationId).maybeSingle());
      if (!challenge || challenge.status !== 'submitted') throw new Error('Submitted verification required.');
      if (new Date(challenge.expires_at) <= new Date()) throw new Error('Verification challenge expired.');
      const approved = b.action === 'approve_verification';
      checked(await db().from('social_verification_challenges').update({ status: approved ? 'verified' : 'rejected', verified_at: approved ? new Date().toISOString() : null, reviewed_by: u.id, reviewed_at: new Date().toISOString(), review_note: b.note }).eq('id', challenge.id));
      checked(await db().from('social_accounts').update({ owner_user_id: challenge.user_id, ownership_status: approved ? 'verified' : 'rejected', account_status: approved ? 'approved' : 'pending' }).eq('id', challenge.social_account_id));
      if (approved) checked(await db().from('social_account_owners').upsert({ social_account_id: challenge.social_account_id, user_id: challenge.user_id }));
      checked(await db().from('admin_audit_log').insert({ admin_user_id: u.id, action: b.action, target_id: challenge.id }));
      return Response.json({ message: 'Social verification decision recorded.' });
    }
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
