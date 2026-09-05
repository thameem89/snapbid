import { DownloadCard } from '@/components/rally/social-actions';
import { notFound } from 'next/navigation';
import { getAccount, accountRanks } from '@/lib/server/ranking';
import { config } from '@/lib/server/config';
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const a = await getAccount((await params).slug);
  if (!a) notFound();
  const ranks = await accountRanks(a);
  return (
    <div className="page">
      <div className="panel share-card standalone">
        <div className="eyebrow">CLIMBR / SNAPCHAT</div>
        <h2>{a.city} sponsored ranking</h2>
        <strong>#{ranks[0].rank}</strong>
        <h1>@{a.username}</h1>
        <p>
          {a.city}, {a.country}
        </p>
        <p>Sponsored ranking · Based on purchased promotion value</p>
        <small>
          {config().demo
            ? 'Fictional demo profile'
            : 'Position snapshot at page load'}{' '}
          · Independent of Snap Inc.
        </small>
        <div style={{ marginTop: 24 }}>
          <DownloadCard
            username={a.username}
            location={a.city}
            rank={ranks[0].rank}
            demo={config().demo}
          />
        </div>
      </div>
    </div>
  );
}
