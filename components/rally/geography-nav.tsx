'use client';

import { useRouter } from 'next/navigation';
import { Globe2 } from 'lucide-react';
import type { Location } from '@/lib/domain/ranking';
import { ancestors } from '@/lib/domain/ranking';

export function GeographyNav({
  locations,
  active = 'world',
}: {
  locations: Location[];
  active?: string;
}) {
  const router = useRouter();
  const chain = new Set(ancestors(active, locations));
  const selected = (type: string) =>
    locations.find((location) => location.type === type && chain.has(location.id));
  const continent = selected('continent');
  const region = selected('region');
  const country = selected('country');
  const city = selected('city');

  const choices = (type: string, parent?: string) =>
    locations
      .filter(
        (location) =>
          location.type === type && (!parent || location.parent_id === parent),
      )
      .sort((a, b) => a.name.localeCompare(b.name));

  const open = (id: string) => router.push(`/snapchat/${id}`);

  return (
    <div className="geography-nav" aria-label="Ranking location">
      <button
        className={active === 'world' ? 'selected' : ''}
        onClick={() => open('world')}
      >
        <Globe2 size={15} /> World
      </button>
      {[
        ['Continent', continent, choices('continent')],
        ['Region', region, choices('region', continent?.id)],
        ['Country', country, choices('country', region?.id)],
        ['City', city, choices('city', country?.id)],
      ].map(([label, current, options]) => (
        <label key={label as string}>
          <span>{label as string}</span>
          <select
            value={(current as Location | undefined)?.id || ''}
            disabled={!(options as Location[]).length}
            onChange={(event) => open(event.target.value)}
          >
            <option value="">All</option>
            {(options as Location[]).map((location) => (
              <option value={location.id} key={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}
