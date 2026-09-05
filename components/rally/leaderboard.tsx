import Link from 'next/link';
import {
  ArrowUpRight,
  ArrowRight,
  Globe2,
  MapPin,
  Zap,
  ShieldCheck,
  Plus,
  ChevronDown,
} from 'lucide-react';
import type { Account } from '@/lib/domain/ranking';
import { money } from '@/lib/domain/ranking';
export function Avatar({
  account,
  large = false,
}: {
  account: Account;
  large?: boolean;
}) {
  return (
    <div
      className={`avatar ${account.color || 'mint'} ${large ? 'avatar-large' : ''}`}
      aria-hidden="true"
    >
      {account.display_name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')}
    </div>
  );
}
export function Leaderboard({
  accounts,
  place = 'World',
  demo = true,
}: {
  accounts: (Account & { rank: number })[];
  place?: string;
  demo?: boolean;
}) {
  return (
    <>
      <section className="intro">
        <div>
          <div className="eyebrow">
            <span className="status-dot" /> THE CREATOR SPOTLIGHT
          </div>
          <h1>
            Your world.
            <br />
            Your <span>spotlight.</span>
            <span className="headline-arrow">↗</span>
          </h1>
          <p>
            Discover creators. Boost their visibility.
            <br />
            <span className="intro-detail">
              Explore sponsored Snapchat rankings, from your city to the world.
            </span>
          </p>
          <div className="intro-actions">
            <a href="#leaderboard" className="button">
              Explore rankings <ArrowRight size={17} />
            </a>
            <Link href="/how-it-works" className="text-link">
              How it works <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
        <div className="intro-note">
          <span className="orbit-icon">
            <Globe2 size={38} strokeWidth={1} />
          </span>
          <div>
            <span className="eyebrow">LOCAL ROOTS. GLOBAL REACH.</span>
            <p>
              Every boost puts a creator
              <br />
              on a bigger map.
            </p>
            <span className="muted">
              Promotion starts at <strong>$1</strong>
            </span>
          </div>
        </div>
      </section>
      <div className="disclosure">
        <ShieldCheck size={15} />
        <span>Sponsored ranking · Based on purchased promotion value</span>
        <Link href="/ranking-rules">
          The rules <ArrowUpRight size={13} />
        </Link>
      </div>
      <section id="leaderboard">
        <div className="board-controls">
          <div className="platform-pill">
            <span className="snap-symbol">♧</span> Snapchat{' '}
            <ChevronDown size={14} />
            <span className="live-label">LAUNCH PLATFORM</span>
          </div>
          <span className="period">
            All-time <span className="muted"> / USD</span>
          </span>
        </div>
        <div className="location-pills">
          {[
            ['world', 'World'],
            ['asia', 'Asia'],
            ['middle-east', 'Middle East'],
            ['uae', 'UAE'],
            ['uae/dubai', 'Dubai'],
          ].map(([slug, label]) => (
            <Link
              key={slug}
              href={`/snapchat/${slug}`}
              className={place === label ? 'selected' : ''}
            >
              {label === 'World' && <Globe2 size={15} />} {label}
            </Link>
          ))}
          <Link href="/rankings" className="more-location">
            <MapPin size={15} /> Find a location <Plus size={14} />
          </Link>
        </div>
        <div className="section-heading">
          <div>
            <div className="eyebrow">THE SPONSORED LEADERBOARD</div>
            <h2>
              {place} spotlight<span className="small-dot">.</span>
            </h2>
          </div>
          <span className="muted">
            {demo ? 'Fictional demo profiles' : 'Verified promotion only'}{' '}
            <span className="status-dot" />
          </span>
        </div>
        {accounts.length === 0 ? (
          <div className="empty">
            <h3>The spotlight is open.</h3>
            <p>Be the first to add an account in this location.</p>
            <Link className="button" href="/add-account">
              Add account
            </Link>
          </div>
        ) : (
          <>
            <div className="podium">
              {accounts.slice(0, 3).map((a) => (
                <article key={a.id} className={`podium-card place-${a.rank}`}>
                  <div className="podium-top">
                    <span className="podium-rank">0{a.rank}</span>
                    <span className="rank-label">
                      {a.rank === 1
                        ? 'IN THE SPOTLIGHT'
                        : `SPONSORED #${a.rank}`}
                    </span>
                    <ArrowUpRight size={19} />
                  </div>
                  <Link href={`/account/${a.slug}`} className="podium-person">
                    <Avatar account={a} large />
                    <h3>{a.display_name}</h3>
                    <span className="muted">@{a.username}</span>
                    <span className="person-location">
                      <MapPin size={12} />
                      {a.city}, {a.country}
                    </span>
                  </Link>
                  <div className="podium-value">
                    <span>Promotion value</span>
                    <strong>
                      {money(a.total_verified_promotion_cents)}
                      <span>USD</span>
                    </strong>
                  </div>
                  <Link
                    className={`button ${a.rank === 1 ? '' : 'secondary'}`}
                    href={`/account/${a.slug}?boost=1`}
                  >
                    <Zap size={15} /> Boost profile <ArrowUpRight size={16} />
                  </Link>
                </article>
              ))}
            </div>
            <div className="ranking-table">
              <div className="table-head">
                <span>RANK</span>
                <span>CREATOR</span>
                <span>LOCATION</span>
                <span>PROMOTION VALUE</span>
                <span />
              </div>
              {accounts.slice(3).map((a) => (
                <article className="ranking-row" key={a.id}>
                  <span className="row-rank">
                    {String(a.rank).padStart(2, '0')}
                  </span>
                  <Link className="row-person" href={`/account/${a.slug}`}>
                    <Avatar account={a} />
                    <div>
                      <strong>{a.display_name}</strong>
                      <span>@{a.username}</span>
                    </div>
                  </Link>
                  <span className="row-location">
                    <MapPin size={13} />
                    {a.city}
                    <small>{a.country}</small>
                  </span>
                  <div className="row-value">
                    <strong>{money(a.total_verified_promotion_cents)}</strong>
                    <small>USD promotion</small>
                  </div>
                  <Link
                    className="boost-small"
                    href={`/account/${a.slug}?boost=1`}
                  >
                    <Zap size={14} />
                    <span>Boost</span>
                    <ArrowUpRight size={13} />
                  </Link>
                </article>
              ))}
            </div>
          </>
        )}
        <div className="board-bottom">
          <span>Paid placement. Real transparency.</span>
          <Link href="/ranking-rules">
            See how rankings work <ArrowRight size={14} />
          </Link>
        </div>
      </section>
      <section className="bottom-callout">
        <div className="callout-icon">
          <Zap size={28} />
        </div>
        <div>
          <h2>Big visibility starts small.</h2>
          <p>Find your favorite profile and give it a boost. Starting at $1.</p>
        </div>
        <Link href="/add-account" className="button secondary">
          Add a profile <Plus size={17} />
        </Link>
      </section>
    </>
  );
}
