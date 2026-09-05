import Link from 'next/link';
import { config } from '@/lib/server/config';
import { db, checked } from '@/lib/server/db';
import { money } from '@/lib/domain/ranking';
export async function RecentActivity() {
  if (config().demo) return null;
  const rows =
    checked(
      await db()
        .from('public_activity')
        .select(
          'id,amount_cents,kind,social_accounts!inner(slug,username,account_status)',
        )
        .eq('social_accounts.account_status', 'approved')
        .order('created_at', { ascending: false })
        .limit(5),
    ) ?? [];
  if (!rows.length) return null;
  return (
    <section className="panel">
      <div className="eyebrow">RECENT VERIFIED ACTIVITY</div>
      {rows.map((row) => {
        const a = row.social_accounts as unknown as {
          slug: string;
          username: string;
        };
        return (
          <p key={row.id}>
            <Link href={`/account/${a.slug}`}>@{a.username}</Link>{' '}
            {row.amount_cents > 0 ? 'received' : 'had an adjustment of'}{' '}
            {money(row.amount_cents)}{' '}
            {row.amount_cents > 0 ? 'in promotional value' : ''}
          </p>
        );
      })}
    </section>
  );
}
