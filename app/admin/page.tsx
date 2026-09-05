export const metadata = { robots: { index: false, follow: false } };
import { admin, db, checked } from '@/lib/server/db';
import { config } from '@/lib/server/config';
import { AdminAction } from '@/components/rally/forms';
export default async function Page() {
  try {
    if (config().demo)
      throw new Error('Admin access is unavailable in the fictional preview.');
    await admin();
  } catch {
    return (
      <div className="page">
        <h1>Administrator access required.</h1>
        <p className="muted">
          Sign in with an authorized administrator account to review reports,
          claims, and listings.
        </p>
      </div>
    );
  }
  const [accounts, claims, reports, purchases] = await Promise.all([
    db()
      .from('social_accounts')
      .select('id,username,account_status')
      .eq('account_status', 'pending')
      .limit(50),
    db()
      .from('account_claims')
      .select('id,social_account_id,evidence,status')
      .eq('status', 'pending')
      .limit(50),
    db()
      .from('reports')
      .select('id,social_account_id,reason,status')
      .eq('status', 'open')
      .limit(50),
    db()
      .from('promotion_purchases')
      .select('id,amount_cents,status,social_account_id')
      .eq('status', 'disputed')
      .limit(50),
  ]);
  return (
    <div className="page">
      <h1>Review center.</h1>
      <div className="page-grid">
        <div className="stack">
          {(
            [
              ['Pending listings', checked(accounts)],
              ['Ownership claims', checked(claims)],
              ['Open reports', checked(reports)],
              ['Disputed purchases', checked(purchases)],
            ] as [string, unknown][]
          ).map(([title, rows]) => (
            <section className="panel" key={String(title)}>
              <h2>{String(title)}</h2>
              <pre className="admin-records">
                {JSON.stringify(rows, null, 2)}
              </pre>
            </section>
          ))}
        </div>
        <AdminAction />
      </div>
    </div>
  );
}
