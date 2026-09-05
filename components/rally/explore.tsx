'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, ArrowUpRight, MapPin } from 'lucide-react';
import type { Account, Location } from '@/lib/domain/ranking';
import { money } from '@/lib/domain/ranking';
import { Avatar } from './leaderboard';
export function LocationExplorer({ locations }: { locations: Location[] }) {
  const [q, setQ] = useState('');
  return (
    <>
      <label className="field">
        <span>Find a city, country, or region</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Try Dubai, Asia, United Kingdom…"
        />
      </label>
      <div className="location-grid">
        {locations
          .filter((l) => l.name.toLowerCase().includes(q.toLowerCase()))
          .map((l) => (
            <Link className="panel" key={l.id} href={`/snapchat/${l.slug}`}>
              <MapPin size={18} />
              <h2>{l.name}</h2>
              <span className="muted">
                {l.type} <ArrowUpRight size={13} />
              </span>
            </Link>
          ))}
      </div>
    </>
  );
}
type ToolContext = {
  registerTool: (
    tool: {
      name: string;
      description: string;
      inputSchema: object;
      annotations: object;
      execute: (input: unknown) => Promise<unknown>;
    },
    options: { signal: AbortSignal },
  ) => void;
};
export function SearchProfiles() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Account[]>([]);
  const [message, setMessage] = useState(
    'Search profiles by username, name, city, or country.',
  );
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!r.ok) throw new Error('Search unavailable. Please try again.');
        const data = (await r.json()) as Account[];
        setResults(data);
        setMessage(
          data.length
            ? ''
            : 'No matching profiles. Try a different name or location.',
        );
      } catch (e) {
        if ((e as Error).name !== 'AbortError')
          setMessage((e as Error).message);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);
  useEffect(() => {
    const context = (document as Document & { modelContext?: ToolContext })
      .modelContext;
    if (!context) return;
    const lifecycle = new AbortController();
    context.registerTool(
      {
        name: 'search_profiles',
        description:
          'Search sponsored profiles and update the visible results.',
        inputSchema: {
          type: 'object',
          properties: { query: { type: 'string', maxLength: 80 } },
          required: ['query'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: async (input) => {
          if (
            typeof input !== 'object' ||
            input === null ||
            !('query' in input) ||
            typeof input.query !== 'string' ||
            input.query.length > 80
          )
            throw new Error('Query must be a string up to 80 characters.');
          const r = await fetch(
            `/api/search?q=${encodeURIComponent(input.query)}`,
          );
          if (!r.ok) throw new Error('Search unavailable');
          const items = (await r.json()) as Account[];
          setQ(input.query);
          setResults(items);
          return items;
        },
      },
      { signal: lifecycle.signal },
    );
    return () => lifecycle.abort();
  }, []);
  return (
    <div className="stack">
      <label className="field">
        <span>
          <Search size={15} /> Search Rally
        </span>
        <input
          autoComplete="off"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search creators or places…"
          maxLength={80}
        />
      </label>
      <output className="muted">{message}</output>
      {results.map((a) => (
        <Link
          className="search-result panel"
          href={`/account/${a.slug}`}
          key={a.id}
        >
          <Avatar account={a} />
          <div>
            <strong>{a.display_name}</strong>
            <p className="muted">
              @{a.username} · {a.city}
            </p>
          </div>
          <strong>{money(a.total_verified_promotion_cents)}</strong>
          <ArrowUpRight size={18} />
        </Link>
      ))}
    </div>
  );
}
