import { db, checked } from './db';
import { config } from './config';
import { demoAccounts, locations as demoLocations } from '../domain/demo';
import {
  ancestors,
  rank,
  opportunity,
  type Account,
  type Location,
} from '../domain/ranking';
export async function getLocations(): Promise<Location[]> {
  if (config().demo) return demoLocations;
  return checked(
    await db()
      .from('locations')
      .select('id,name,slug,parent_id,type')
      .eq('enabled', true),
  ) as Location[];
}
export async function leaderboard(
  location = 'world',
  search = '',
  after = 0,
): Promise<(Account & { rank: number })[]> {
  if (config().demo)
    return rank(
      demoAccounts.filter((a) =>
        ancestors(a.location_id, demoLocations).includes(location),
      ),
    )
      .filter(
        (a) =>
          a.rank > after &&
          `${a.username} ${a.display_name} ${a.city} ${a.country}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      )
      .slice(0, 50);
  return checked(
    await db().rpc('leaderboard', {
      p_location: location,
      p_search: search,
      p_after: after,
      p_limit: 50,
    }),
  ) as (Account & { rank: number })[];
}
export async function getAccount(slug: string): Promise<Account | null> {
  if (config().demo) return demoAccounts.find((a) => a.slug === slug) || null;
  const a = checked(
    await db()
      .from('social_accounts')
      .select('*')
      .eq('slug', slug)
      .eq('account_status', 'approved')
      .eq('ownership_status', 'verified')
      .maybeSingle(),
  ) as Account | null;
  if (!a) return null;
  const locs = await getLocations();
  const chain = ancestors(a.location_id, locs);
  return {
    ...a,
    city: locs.find((x) => x.id === a.location_id)?.name || '',
    country:
      locs.find((x) => chain.includes(x.id) && x.type === 'country')?.name ||
      '',
    color: 'mint',
  };
}
export async function accountRanks(a: Account) {
  const locs = await getLocations();
  return Promise.all(
    ancestors(a.location_id, locs).map(async (id) => ({
      id,
      name: locs.find((x) => x.id === id)!.name,
      rank: config().demo
        ? rank(
            demoAccounts.filter((x) =>
              ancestors(x.location_id, locs).includes(id),
            ),
          ).find((x) => x.id === a.id)!.rank
        : Number(
            checked(
              await db().rpc('account_rank', {
                p_account: a.id,
                p_location: id,
              }),
            ),
          ),
    })),
  );
}
export async function estimate(a: Account, location: string, cents: number) {
  if (config().demo)
    return rank(
      demoAccounts
        .filter((x) =>
          ancestors(x.location_id, demoLocations).includes(location),
        )
        .map((x) =>
          x.id === a.id
            ? {
                ...x,
                total_verified_promotion_cents:
                  x.total_verified_promotion_cents + cents,
              }
            : x,
        ),
    ).find((x) => x.id === a.id)!.rank;
  return Number(
    checked(
      await db().rpc('rank_estimate', {
        p_account: a.id,
        p_location: location,
        p_add: cents,
      }),
    ),
  );
}
export async function opportunities(a: Account, location: string) {
  const current = (await accountRanks(a)).find((x) => x.id === location)!.rank;
  const targets = [...new Set([current - 1, 100, 50, 25, 10, 5, 3, 1])].filter(
    (t) => t > 0 && t < current,
  );
  return Promise.all(
    targets.map(async (target) => ({
      target,
      cents: config().demo
        ? opportunity(
            a,
            demoAccounts.filter((x) =>
              ancestors(x.location_id, demoLocations).includes(location),
            ),
            target,
          )
        : Number(
            checked(
              await db().rpc('rank_opportunity', {
                p_account: a.id,
                p_location: location,
                p_target: target,
              }),
            ),
          ),
    })),
  );
}
