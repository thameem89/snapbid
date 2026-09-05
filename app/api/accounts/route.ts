import { z } from 'zod';
import { normalizeUsername } from '@/lib/domain/ranking';
import { db, checked, user } from '@/lib/server/db';
import { sameOrigin, limit, failure } from '@/lib/server/http';
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const u = await user();
    if (!u.email_confirmed_at)
      throw new Error('Verify your Climbr email before adding a social profile.');
    await limit(req, 'account-create', 5, u.id);
    const b = z
      .object({
        username: z.string().max(200),
        displayName: z.string().min(1).max(80),
        location: z.string().max(80),
        bio: z.string().max(500).default(''),
      })
      .parse(await req.json());
    const name = normalizeUsername(b.username);
    const existing = checked(
      await db()
        .from('social_accounts')
        .select('slug,account_status,owner_user_id')
        .eq('platform_id', 'snapchat')
        .eq('normalized_username', name)
        .maybeSingle(),
    );
    if (existing) {
      if (existing.owner_user_id !== u.id)
        throw new Error('This social profile is already registered on Climbr. Contact support for an ownership review.');
      return Response.json({ slug: existing.slug, status: existing.account_status, existing: true });
    }
    const loc = checked(
      await db()
        .from('locations')
        .select('id')
        .eq('id', b.location)
        .eq('enabled', true)
        .maybeSingle(),
    );
    if (!loc) throw new Error('Location unavailable.');
    const enabled = checked(
      await db()
        .from('platforms')
        .select('id')
        .eq('id', 'snapchat')
        .eq('enabled', true)
        .maybeSingle(),
    );
    if (!enabled) throw new Error('Platform unavailable.');
    const result = await db()
      .from('social_accounts')
      .insert({
        platform_id: 'snapchat',
        username: name,
        display_name: b.displayName,
        slug: name,
        profile_url: `https://www.snapchat.com/add/${name}`,
        location_id: b.location,
        bio: b.bio,
        owner_user_id: u.id,
        ownership_status: 'unclaimed',
        account_status: 'pending',
      })
      .select('slug,account_status')
      .single();
    if (result.error?.code === '23505')
      return Response.json({ slug: name, existing: true });
    const data = checked(result);
    if (!data) throw new Error('Account creation failed.');
    return Response.json({ slug: data.slug, status: data.account_status, message: 'Profile saved as unverified. Verify ownership from your dashboard.' });
  } catch (e) {
    return failure(e);
  }
}
