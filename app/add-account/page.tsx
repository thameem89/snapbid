export const metadata = { robots: { index: false, follow: false } };
import { AddAccount } from '@/components/rally/forms';
import { getLocations } from '@/lib/server/ranking';
import { config } from '@/lib/server/config';
export default async function Page() {
  return (
    <div className="page">
      <div className="eyebrow">MAKE AN INTRODUCTION</div>
      <h1>Add a public profile.</h1>
      <p className="muted">
        One listing per account. If it is already here, we will take you to it.
      </p>
      <AddAccount locations={await getLocations()} demo={config().demo} />
    </div>
  );
}
