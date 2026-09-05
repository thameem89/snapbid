export const metadata = { robots: { index: false, follow: false } };
import { SearchProfiles } from '@/components/rally/explore';
export default function Page() {
  return (
    <div className="page">
      <h1>Find your next favorite.</h1>
      <SearchProfiles />
    </div>
  );
}
