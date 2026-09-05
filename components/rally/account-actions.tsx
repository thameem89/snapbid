'use client';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { Zap, Share2, Flag, ShieldCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Avatar } from './leaderboard';
import { PrivateAction, post } from './forms';
import { money, type Account } from '@/lib/domain/ranking';
export function AccountActions({
  account,
  demo,
  initialOpen = false,
  currentRank,
  max,
}: {
  account: Account;
  demo: boolean;
  initialOpen?: boolean;
  currentRank: number;
  max: number;
}) {
  const [open, setOpen] = useState(initialOpen);
  const [amount, setAmount] = useState('5');
  const [estimate, setEstimate] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(
          `/api/estimate?account=${encodeURIComponent(account.slug)}&amount=${encodeURIComponent(amount)}`,
          { signal: controller.signal },
        );
        const d = z
          .object({
            rank: z.number().optional(),
            error: z.string().default('Estimate unavailable'),
          })
          .parse(await r.json());
        if (!r.ok) {
          setEstimate(null);
          setMessage(d.error);
          return;
        }
        setEstimate(d.rank ?? null);
        setMessage('');
      } catch (e) {
        if ((e as Error).name !== 'AbortError')
          setMessage('Estimate unavailable. Please try again.');
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [amount, account.slug, open]);
  const record = (event: string) => {
    if (!demo)
      void post('/api/analytics', { event, accountId: account.id }).catch(
        () => {},
      );
  };
  useEffect(() => {
    if (!demo)
      void post('/api/analytics', {
        event: 'profile_view',
        accountId: account.id,
      }).catch(() => {});
  }, [account.id, demo]);
  return (
    <div className="stack">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger className="button" onClick={() => record('boost_click')}>
          <Zap size={17} /> Boost profile
        </DialogTrigger>
        <DialogContent className="boost-dialog">
          <DialogTitle>Give {account.display_name} a boost.</DialogTitle>
          <DialogDescription>
            Purchase promotional placement value. Every verified boost counts
            toward geographic sponsored rankings.
          </DialogDescription>
          <div className="row-person">
            <Avatar account={account} />
            <div>
              <strong>@{account.username}</strong>
              <span>
                {money(account.total_verified_promotion_cents)} promotion value
              </span>
            </div>
          </div>
          <div className="amount-grid">
            {[1, 2, 5, 10, 25, 50, 100].map((n) => (
              <button
                key={n}
                className={amount === String(n) ? 'chosen' : ''}
                onClick={() => setAmount(String(n))}
              >
                ${n}
              </button>
            ))}
          </div>
          <label className="field">
            Custom amount · USD
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              aria-label="Promotion amount in US dollars"
            />
          </label>
          <div className="estimate-box">
            <div>
              <span>Current {account.city}</span>
              <strong>#{currentRank}</strong>
            </div>
            <span>→</span>
            <div>
              <span>Estimated position</span>
              <strong>{estimate ? `#${estimate}` : '—'}</strong>
            </div>
          </div>
          <p className="muted">
            Estimated only. Position is finalized after payment verification and
            may change while checkout is processing.
          </p>
          {demo ? (
            <div className="notice">
              Fictional preview. Payments are disabled; no promotion will be
              credited.
            </div>
          ) : max === 0 ? (
            <div className="notice">Payments are not configured yet.</div>
          ) : (
            <p className="muted">
              Minimum $1 · Maximum {money(max)} per purchase
            </p>
          )}
          <button
            className="button"
            disabled={demo || busy || max === 0 || !estimate}
            onClick={async () => {
              setBusy(true);
              try {
                const d = await post('/api/checkout', {
                  slug: account.slug,
                  amount,
                });
                const url = new URL(d.url);
                if (
                  url.protocol !== 'https:' ||
                  url.hostname !== 'checkout.stripe.com'
                )
                  throw new Error('Invalid checkout destination.');
                window.location.assign(url.href);
              } catch (e) {
                setMessage((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'Opening secure checkout…' : 'Continue to payment'}
          </button>
          <output className="error">{message}</output>
        </DialogContent>
      </Dialog>
      <button
        className="button secondary"
        onClick={async () => {
          const url = `${window.location.origin}/account/${account.slug}`;
          try {
            if (navigator.share)
              await navigator.share({
                title: `${account.display_name} on Rally`,
                text: 'Sponsored ranking based on purchased promotion value.',
                url,
              });
            else {
              await navigator.clipboard.writeText(url);
              setMessage('Profile link copied.');
            }
            record('share');
          } catch (e) {
            if ((e as Error).name !== 'AbortError')
              setMessage(
                'Unable to share. Copy the profile URL from your browser.',
              );
          }
        }}
      >
        <Share2 size={16} /> Share profile
      </button>
      <div className="action-links">
        <Dialog>
          <DialogTrigger className="text-link">
            <ShieldCheck size={14} /> Claim account
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Claim this profile</DialogTitle>
            <DialogDescription>
              Ownership is verified separately from promotion purchases.
            </DialogDescription>
            <PrivateAction kind="claim" accountId={account.id} demo={demo} />
          </DialogContent>
        </Dialog>
        <Dialog>
          <DialogTrigger className="text-link">
            <Flag size={14} /> Report
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Report this account</DialogTitle>
            <DialogDescription>
              Reports are reviewed privately by administrators.
            </DialogDescription>
            <PrivateAction kind="report" accountId={account.id} demo={demo} />
          </DialogContent>
        </Dialog>
      </div>
      <output>{!open && message}</output>
    </div>
  );
}
