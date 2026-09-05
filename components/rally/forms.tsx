'use client';
import { z } from 'zod';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Location } from '@/lib/domain/ranking';
export async function post(path: string, body: unknown) {
  const r = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = z
    .object({
      error: z.string().optional(),
      message: z.string().default(''),
      url: z.string().default(''),
      slug: z.string().default(''),
      status: z.string().optional(),
    })
    .parse(await r.json());
  if (!r.ok) throw new Error(data.error || 'Request failed.');
  return data;
}
export function SignIn() {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="panel stack"
      style={{ maxWidth: 480 }}
      onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        setBusy(true);
        try {
          setMessage(
            (await post('/api/auth', { email: form.get('email') })).message,
          );
        } catch (err) {
          setMessage((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Your next chapter starts here.</h2>
      <p className="muted">
        Sign in to add accounts, claim your profile, and manage your activity.
        Browsing and promotion purchases do not require an account.
      </p>
      <label className="field">
        Email address
        <input
          type="email"
          name="email"
          placeholder="you@example.com"
          required
          autoComplete="email"
        />
      </label>
      <button disabled={busy} className="button">
        {busy ? 'Sending…' : 'Send sign-in link'}
      </button>
      <output>{message}</output>
    </form>
  );
}
export function SignOut() {
  const router = useRouter();
  return (
    <button
      className="button secondary"
      onClick={async () => {
        await post('/api/logout', {});
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
export function AddAccount({
  locations,
  demo,
}: {
  locations: Location[];
  demo: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="panel stack"
      style={{ maxWidth: 650 }}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const f = new FormData(e.currentTarget);
        try {
          const d = await post('/api/accounts', {
            username: f.get('username'),
            displayName: f.get('displayName'),
            location: f.get('location'),
            bio: f.get('bio'),
          });
          if (d.status === 'pending')
            setMessage(
              'Your listing is awaiting moderation. It will appear publicly after approval.',
            );
          else router.push(`/account/${d.slug}`);
        } catch (err) {
          setMessage((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="notice">
        Snapchat · Listing an account does not verify ownership. Location is
        declared until reviewed.
      </div>
      <label className="field">
        Username or Snapchat profile URL
        <input
          name="username"
          placeholder="@your.username"
          required
          maxLength={200}
        />
      </label>
      <label className="field">
        Display name
        <input name="displayName" required maxLength={80} />
      </label>
      <label className="field">
        Location
        <select name="location" required>
          <option value="">Choose your location</option>
          {locations
            .filter((l) => l.type === 'city')
            .map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
        </select>
      </label>
      <label className="field">
        Bio
        <textarea name="bio" maxLength={500} rows={3} />
      </label>
      {demo && (
        <p className="notice">
          Preview mode: account creation becomes available when Supabase is
          connected.
        </p>
      )}
      <button className="button" disabled={busy || demo}>
        {busy ? 'Submitting…' : 'Submit account for review'}
      </button>
      <output>{message}</output>
    </form>
  );
}
export function PrivateAction({
  accountId,
  kind,
  demo,
}: {
  accountId: string;
  kind: 'claim' | 'report';
  demo: boolean;
}) {
  const [message, setMessage] = useState('');
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        try {
          setMessage(
            (
              await post(kind === 'claim' ? '/api/claims' : '/api/reports', {
                accountId,
                [kind === 'claim' ? 'evidence' : 'reason']: f.get('text'),
              })
            ).message,
          );
        } catch (err) {
          setMessage((err as Error).message);
        }
      }}
    >
      <label className="field">
        {kind === 'claim'
          ? 'Explain how an administrator can verify your ownership.'
          : 'Tell us what needs review.'}
        <textarea
          name="text"
          minLength={10}
          maxLength={2000}
          required
          rows={3}
        />
      </label>
      <p className="muted">
        Sign-in required. This information is private. Never submit passwords.
      </p>
      <button className="button secondary" disabled={demo}>
        Submit {kind}
      </button>
      <output>{message}</output>
    </form>
  );
}
export function AdminAction() {
  const [message, setMessage] = useState('');
  return (
    <form
      className="panel stack"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const b = Object.fromEntries(
          [...form.entries()].filter(([, v]) => v !== ''),
        );
        try {
          setMessage((await post('/api/admin', b)).message);
        } catch (err) {
          setMessage((err as Error).message);
        }
      }}
    >
      <h2>Record a moderation decision</h2>
      {[
        ['accountId', 'Account ID'],
        ['claimId', 'Claim ID (claim decisions)'],
        ['location', 'Location ID (location corrections)'],
        ['reportId', 'Report ID (resolve report)'],
      ].map(([name, label]) => (
        <label className="field" key={name}>
          {label}
          <input name={name} required={name === 'accountId'} />
        </label>
      ))}
      <label className="field">
        Action
        <select name="action">
          {[
            'approve',
            'suspend',
            'reject',
            'approve_claim',
            'reject_claim',
            'verify_location',
            'resolve_report',
          ].map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
      </label>
      <label className="field">
        Audit note
        <textarea name="note" minLength={3} required />
      </label>
      <button className="button">Apply decision</button>
      <output>{message}</output>
    </form>
  );
}

export function EditOwnedAccount({
  accountId,
  name,
  bio,
}: {
  accountId: string;
  name: string;
  bio: string;
}) {
  const [message, setMessage] = useState('');
  return (
    <form
      className="panel stack"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        try {
          setMessage(
            (
              await post('/api/profile', {
                accountId,
                displayName: f.get('displayName'),
                bio: f.get('bio'),
              })
            ).message,
          );
        } catch (e) {
          setMessage((e as Error).message);
        }
      }}
    >
      <label className="field">
        Display name
        <input name="displayName" defaultValue={name} maxLength={80} required />
      </label>
      <label className="field">
        Bio
        <textarea name="bio" defaultValue={bio} maxLength={500} />
      </label>
      <button className="button secondary">Save profile</button>
      <output>{message}</output>
    </form>
  );
}
