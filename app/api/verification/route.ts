import { z } from 'zod';
import { checked, db, user } from '@/lib/server/db';
import { failure, hash, limit, sameOrigin } from '@/lib/server/http';

export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const u = await user();
    if (!u.email_confirmed_at) throw new Error('Verify your Climbr email first.');
    await limit(req, 'social-verification', 5, u.id);
    const body = z.object({
      accountId: z.uuid(),
      action: z.enum(['create', 'submit']),
      method: z.enum(['public_code', 'story_post', 'manual_proof']).optional(),
      evidence: z.string().min(10).max(3000).optional(),
      challengeId: z.uuid().optional(),
    }).parse(await req.json());
    const profile = checked(await db().from('social_accounts').select('id,username,owner_user_id,ownership_status').eq('id', body.accountId).maybeSingle());
    if (!profile || profile.owner_user_id !== u.id) throw new Error('Profile ownership required.');
    if (profile.ownership_status === 'verified') throw new Error('This profile is already verified.');
    if (body.action === 'create') {
      const bytes = crypto.getRandomValues(new Uint8Array(6));
      const raw = Array.from(bytes, x => x.toString(36).padStart(2, '0')).join('').toUpperCase().slice(0, 8);
      const code = `CLIMBR-${raw}`;
      const created = checked(await db().from('social_verification_challenges').insert({
        social_account_id: profile.id, user_id: u.id,
        verification_method: body.method || 'public_code',
        challenge_code_hash: await hash(code), challenge_code_display: code,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }).select('id,challenge_code_display,expires_at').single());
      await db().from('social_accounts').update({ ownership_status: 'claim_pending' }).eq('id', profile.id);
      return Response.json({ message: `${created.challenge_code_display} · Expires ${new Date(created.expires_at).toLocaleString('en-US')}`, challengeId: created.id });
    }
    if (!body.challengeId || !body.evidence) throw new Error('Challenge and evidence are required.');
    const challenge = checked(await db().from('social_verification_challenges').select('id,expires_at,status').eq('id', body.challengeId).eq('social_account_id', profile.id).eq('user_id', u.id).maybeSingle());
    if (!challenge || challenge.status !== 'pending') throw new Error('Active verification challenge required.');
    if (new Date(challenge.expires_at) <= new Date()) {
      await db().from('social_verification_challenges').update({ status: 'expired' }).eq('id', challenge.id);
      throw new Error('Verification challenge expired. Request a new code.');
    }
    checked(await db().from('social_verification_challenges').update({ status: 'submitted', evidence_text: body.evidence, submitted_at: new Date().toISOString() }).eq('id', challenge.id));
    return Response.json({ message: 'Verification submitted for private administrator review.' });
  } catch (error) { return failure(error); }
}
