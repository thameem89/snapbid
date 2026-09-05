import { db, checked } from '@/lib/server/db';
import { hash, failure, limit } from '@/lib/server/http';
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await limit(req, 'payment-status', 60);
    const token = new URL(req.url).searchParams.get('token');
    if (!token || token.length > 100) throw new Error('Invalid status link.');
    const p = checked(
      await db()
        .from('promotion_purchases')
        .select('status,credited_cents,social_account_id')
        .eq('id', (await params).id)
        .eq('status_token_hash', await hash(token))
        .maybeSingle(),
    );
    if (!p) throw new Error('Purchase not found.');
    const a = checked(
      await db()
        .from('social_accounts')
        .select('slug,total_verified_promotion_cents,account_status')
        .eq('id', p.social_account_id)
        .single(),
    );
    if (!a) throw new Error('Account unavailable.');
    return Response.json(
      {
        status: p.status,
        creditedCents: p.credited_cents,
        slug: a.slug,
        totalCents: a.total_verified_promotion_cents,
        accountStatus: a.account_status,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
          'Referrer-Policy': 'no-referrer',
        },
      },
    );
  } catch (e) {
    return failure(e);
  }
}
