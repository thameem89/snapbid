import {
  DownloadCard,
  OutboundProfile,
} from '@/components/rally/social-actions';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapPin, ArrowUpRight } from 'lucide-react';
import { getAccount, accountRanks, opportunities } from '@/lib/server/ranking';
import { config } from '@/lib/server/config';
import { db, checked, authClient } from '@/lib/server/db';
import { Avatar } from '@/components/rally/leaderboard';
import { AccountActions } from '@/components/rally/account-actions';
import { money } from '@/lib/domain/ranking';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const a = await getAccount((await params).slug);
  const title = a
    ? `${a.display_name} — Sponsored Snapchat Profile`
    : 'Profile unavailable';
  const url = `${config().url}/account/${a?.slug || ''}`;
  return {
    title,
    alternates: { canonical: url },
    openGraph: { title, url },
    twitter: { card: 'summary', title },
    robots: { index: !config().demo, follow: true },
  };
}
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ boost?: string }>;
}) {
  const a = await getAccount((await params).slug);
  if (!a) notFound();
  const c = config();
  let viewerId: string | undefined;
  if (!c.demo) {
    try { viewerId = (await (await authClient()).auth.getUser()).data.user?.id; } catch {}
  }
  const ranks = await accountRanks(a);
  const goals = await opportunities(a, a.location_id);
  const history = c.demo
    ? []
    : (checked(
        await db()
          .from('public_activity')
          .select('id,amount_cents,kind,created_at')
          .eq('social_account_id', a.id)
          .order('created_at', { ascending: false })
          .limit(10),
      ) ?? []);
  return (
    <div className="page">
      <Link className="text-link muted" href="/">
        ← Back to rankings
      </Link>
      <div className="profile-heading">
        <Avatar account={a} large />
        <div>
          <div className="eyebrow">
            SNAPCHAT / {c.demo ? 'FICTIONAL DEMO PROFILE' : 'PUBLIC PROFILE'}
          </div>
          <h1>{a.display_name}</h1>
          <p className="muted">
            @{a.username} ·{' '}
            {a.ownership_status === 'verified' ? 'Ownership Verified by Climbr' : 'Unverified'}
          </p>
        </div>
      </div>
      <div className="page-grid">
        <div className="stack">
          <p>{a.bio}</p>
          <span className="person-location">
            <MapPin size={15} />
            {a.city}, {a.country} ·{' '}
            {a.location_verification_status === 'verified'
              ? 'Verified location'
              : a.location_verification_status === 'disputed'
                ? 'Disputed location'
                : 'Declared location'}
          </span>
          {!c.demo && <OutboundProfile username={a.username} id={a.id} />}
          <section className="panel">
            <div className="eyebrow">CURRENT SPONSORED RANKINGS</div>
            <div className="rank-grid">
              {ranks.map((r) => (
                <Link href={`/snapchat/${r.id}`} key={r.id}>
                  <span>{r.name}</span>
                  <strong>#{r.rank}</strong>
                </Link>
              ))}
            </div>
          </section>
          <section className="panel">
            <h2>Find your next position.</h2>
            <p className="muted">
              Estimated opportunities in {a.city}. Positions may change before
              payment confirmation.
            </p>
            {goals.length ? (
              goals.map((g) => (
                <Link className="goal-row" href={`?boost=1`} key={g.target}>
                  <strong>+{money(g.cents)}</strong>
                  <span>Move toward #{g.target}</span>
                  <ArrowUpRight size={17} />
                </Link>
              ))
            ) : (
              <p>You currently hold the first sponsored position here.</p>
            )}
          </section>
          <section className="panel">
            <h2>Promotion history</h2>
            {history.length ? (
              history.map((h) => (
                <div className="goal-row" key={h.id}>
                  <strong>{money(h.amount_cents)}</strong>
                  <span>{h.kind}</span>
                  <small>
                    {new Date(h.created_at).toLocaleDateString('en-US')}
                  </small>
                </div>
              ))
            ) : (
              <p className="muted">
                {c.demo
                  ? 'No real payment activity is shown in this fictional preview.'
                  : 'No verified promotion activity yet.'}
              </p>
            )}
          </section>
        </div>
        <aside className="stack">
          <div className="panel stack">
            <div className="eyebrow">TOTAL PROMOTION VALUE</div>
            <div className="profile-value">
              {money(a.total_verified_promotion_cents)}
              <span>USD</span>
            </div>
            <p className="muted">
              Cumulative purchased promotion value. A sponsored position, not a
              popularity score.
            </p>
            <AccountActions
              account={a}
              demo={c.demo}
              currentRank={ranks[0].rank}
              max={c.max}
              initialOpen={(await searchParams).boost === '1'}
              canBoost={c.demo || (!!viewerId && viewerId === a.owner_user_id)}
            />
          </div>
          <div className="panel share-card">
            <span className="eyebrow">CLIMBR / SNAPCHAT</span>
            <p>{a.city} sponsored ranking</p>
            <strong>#{ranks[0].rank}</strong>
            <h3>@{a.username}</h3>
            <p>Sponsored ranking · Purchased promotion value</p>
            <Link className="text-link" href={`/account/${a.slug}/share`}>
              Open share card <ArrowUpRight size={15} />
            </Link>
            <DownloadCard
              username={a.username}
              location={a.city}
              rank={ranks[0].rank}
              demo={c.demo}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
