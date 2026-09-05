import { notFound } from 'next/navigation';
import { Leaderboard } from '@/components/rally/leaderboard';
import { leaderboard, getLocations } from '@/lib/server/ranking';
import { config } from '@/lib/server/config';
async function location(path: string[] | undefined) {
  const locs = await getLocations();
  const slug = path?.at(-1) || 'world';
  return locs.find((l) => l.slug === slug);
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path } = await params;
  const loc = await location(path);
  const accounts = loc ? await leaderboard(loc.id) : [];
  const title = `Snapchat Sponsored Rankings in ${loc?.name || 'World'}`;
  const url = `${config().url}/snapchat/${path?.join('/') || 'world'}`;
  return {
    title,
    description:
      'Sponsored placements determined by cumulative purchased promotion value.',
    alternates: { canonical: url },
    openGraph: { title, url },
    twitter: { card: 'summary', title },
    robots: {
      index: !config().demo && accounts.length >= config().indexThreshold,
      follow: true,
    },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const locations = await getLocations();
  const loc = await location((await params).path);
  if (!loc) notFound();
  return (
    <Leaderboard
      accounts={await leaderboard(loc.id)}
      place={loc.id === 'uae' ? 'UAE' : loc.name}
      demo={config().demo}
      locations={locations}
      activeLocation={loc.id}
    />
  );
}
