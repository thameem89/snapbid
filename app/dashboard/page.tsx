export const metadata = { robots: { index: false, follow: false } };
import Link from 'next/link';
import { SignIn, SignOut, EditOwnedAccount } from '@/components/rally/forms';
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
        <h1>Your Rally.</h1>
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
    db()
      .from('social_account_owners')
      .select('social_account_id,social_accounts(slug,display_name,bio)')
      .eq('user_id', u.id),
  ]);
  return (
    <div className="page stack">
      <h1>Your Rally.</h1>
      <p>{u.email}</p>
      <SignOut />
      <div className="page-grid">
        <section className="panel">
          <h2>Your accounts</h2>
          {(checked(owners) ?? []).map((o) => (
            <EditOwnedAccount
              key={o.social_account_id}
              accountId={o.social_account_id}
              name={
                (o.social_accounts as unknown as { display_name: string })
                  .display_name
              }
              bio={(o.social_accounts as unknown as { bio: string }).bio}
            />
          ))}
          <Link href="/add-account" className="text-link">
            Add an account →
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
