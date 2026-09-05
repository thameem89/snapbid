export const metadata = { robots: { index: false, follow: false } };
import { AddAccount } from '@/components/rally/forms';
import { getLocations } from '@/lib/server/ranking';
import { config } from '@/lib/server/config';
export default async function Page() {
  return (
    <div className="page">
      <div className="eyebrow">MY SOCIAL PROFILES</div>
      <h1>Add your social profile.</h1>
      <p className="muted">
        Only profile owners can enter Climbr sponsored rankings. Snapchat is live; more platforms are coming soon.
      </p>
      <AddAccount locations={await getLocations()} demo={config().demo} />
    </div>
  );
}
