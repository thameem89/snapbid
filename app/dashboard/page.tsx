export const metadata = { robots: { index: false, follow: false } };
import Link from 'next/link';
import { SignIn, SignOut, EditOwnedAccount, VerifyOwnership } from '@/components/rally/forms';
import { config } from '@/lib/server/config';
import { db, checked, user } from '@/lib/server/db';
import { money } from '@/lib/domain/ranking';
export default async function Page() {
  let u = null;
  if (!config().demo) {
    try {
      u = await user();
    } catch {
      u = null;
    }
  }
  if (!u)
    return (
      <div className="page">
        <h1>Your Climbr.</h1>
        <SignIn />
      </div>
    );
  const [claims, purchases, owners] = await Promise.all([
    db()
      .from('account_claims')
      .select('id,social_account_id,status,created_at')
      .eq('user_id', u.id),
    db()
      .from('promotion_purchases')
      .select('id,amount_cents,status,created_at')
      .eq('payer_user_id', u.id)
      .order('created_at', { ascending: false })
      .limit(50),
    db().from('social_accounts')
      .select('id,slug,username,display_name,bio,ownership_status,account_status,platform_id,total_verified_promotion_cents')
      .eq('owner_user_id', u.id),
  ]);
  return (
    <div className="page stack">
      <h1>Your Climbr.</h1>
      <p>{u.email}</p>
      <SignOut />
      <div className="page-grid">
        <section className="panel">
          <h2>My Social Profiles</h2>
          {(checked(owners) ?? []).map((o) => (
            <div className="panel stack" key={o.id}>
              <div className="eyebrow">{o.platform_id} · {o.ownership_status === 'verified' ? 'SOCIAL PROFILE VERIFIED' : 'UNVERIFIED'}</div>
              <h3>@{o.username}</h3>
              <p className="muted">Promotion value: {money(o.total_verified_promotion_cents)}</p>
              <EditOwnedAccount accountId={o.id} name={o.display_name} bio={o.bio} />
              {o.ownership_status !== 'verified' && <VerifyOwnership accountId={o.id} username={o.username} />}
              {o.ownership_status === 'verified' && o.account_status === 'approved' && <Link className="button" href={`/account/${o.slug}?boost=1`}>Boost Profile</Link>}
            </div>
          ))}
          <Link href="/add-profile" className="text-link">
            Add Profile →
          </Link>
          <h2>Ownership claims</h2>
          {(checked(claims) ?? []).map((c) => (
            <p key={c.id}>
              {c.social_account_id} · {c.status}
            </p>
          ))}
        </section>
        <section className="panel">
          <h2>Your promotion purchases</h2>
          {(checked(purchases) ?? []).map((p) => (
            <div className="goal-row" key={p.id}>
              <strong>{money(p.amount_cents)}</strong>
              <span>{p.status}</span>
            </div>
          ))}
          <p className="muted">
            Purchasing promotion never grants account ownership. Guest purchases
            are accessed through their private checkout status link.
          </p>
        </section>
      </div>
    </div>
  );
}
