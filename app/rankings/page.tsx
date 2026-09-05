import { LocationExplorer } from '@/components/rally/explore';
import { getLocations } from '@/lib/server/ranking';
export default async function Page() {
  return (
    <div className="page">
      <div className="eyebrow">YOUR NEXT DISCOVERY</div>
      <h1>Every place has a spotlight.</h1>
      <p className="muted">
        Explore all-time sponsored Snapchat rankings around the world.
      </p>
      <LocationExplorer locations={await getLocations()} />
    </div>
  );
}
