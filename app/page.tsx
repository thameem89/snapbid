import { RecentActivity } from '@/components/rally/activity';
import { Leaderboard } from '@/components/rally/leaderboard';
import { getLocations, leaderboard } from '@/lib/server/ranking';
import { config } from '@/lib/server/config';
export default async function Home() {
  const accounts = await leaderboard();
  const structured = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'World sponsored Snapchat rankings',
    description: 'Sponsored placements based on purchased promotion value.',
    itemListElement: accounts.map((a) => ({
      '@type': 'ListItem',
      position: a.rank,
      name: a.display_name,
      url: `${config().url}/account/${a.slug}`,
    })),
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structured).replace(/</g, '\\u003c'),
        }}
      />
      <Leaderboard
        accounts={accounts}
        demo={config().demo}
        locations={await getLocations()}
      />
      <RecentActivity />
    </>
  );
}
