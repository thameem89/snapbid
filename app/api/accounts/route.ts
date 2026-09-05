import { z } from 'zod';
import { normalizeUsername } from '@/lib/domain/ranking';
import { config } from '@/lib/server/config';
import { db, checked, user } from '@/lib/server/db';
import { sameOrigin, limit, failure } from '@/lib/server/http';
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const u = await user();
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
        .select('slug,account_status')
        .eq('platform_id', 'snapchat')
        .eq('normalized_username', name)
        .maybeSingle(),
    );
    if (existing)
      return Response.json({
        slug: existing.slug,
        status: existing.account_status,
        existing: true,
      });
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
        account_status: config().review,
      })
      .select('slug,account_status')
      .single();
    if (result.error?.code === '23505')
      return Response.json({ slug: name, existing: true });
    const data = checked(result);
    if (!data) throw new Error('Account creation failed.');
    return Response.json({ slug: data.slug, status: data.account_status });
  } catch (e) {
    return failure(e);
  }
}
