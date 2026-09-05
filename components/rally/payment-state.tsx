'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { money } from '@/lib/domain/ranking';
type Status = {
  status: string;
  creditedCents: number;
  totalCents: number;
  slug: string;
  accountStatus: string;
};
export function PaymentState({
  id,
  token,
  cancelled,
}: {
  id?: string;
  token?: string;
  cancelled: boolean;
}) {
  const [state, setState] = useState<Status | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!id || !token || cancelled) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    const poll = async () => {
      try {
        const r = await fetch(
          `/api/purchases/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`,
          { cache: 'no-store' },
        );
        if (!r.ok)
          throw new Error(
            'Unable to check payment status. Keep this private link and try again later.',
          );
        const data = (await r.json()) as Status;
        if (stop) return;
        setState(data);
        if (data.status === 'pending' && attempts++ < 40)
          timer = setTimeout(poll, 3000);
        else if (data.status === 'pending')
          setError(
            'Confirmation is taking longer than expected. Keep this private link and check again later.',
          );
      } catch (e) {
        if (!stop) setError((e as Error).message);
      }
    };
    void poll();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [id, token, cancelled]);
  if (cancelled)
    return (
      <div className="panel stack">
        <h1>Checkout cancelled.</h1>
        <p>
          No promotion has been confirmed. You can return to the leaderboard at
          any time.
        </p>
        <Link className="button" href="/">
          Explore rankings
        </Link>
      </div>
    );
  const confirmed = state?.status === 'verified';
  return (
    <div className="panel stack">
      <h1>
        {confirmed
          ? 'Promotion confirmed.'
          : state && state.status !== 'pending'
            ? 'Promotion status updated.'
            : 'Confirming your promotion.'}
      </h1>
      <p>
        {confirmed
          ? `Your verified purchase added ${money(state.creditedCents)} in promotion value.`
          : state && state.status !== 'pending'
            ? `Status: ${state.status.replaceAll('_', ' ')}`
            : 'We are waiting for secure payment verification. Your ranking value is not credited until confirmation arrives.'}
      </p>
      {confirmed && (
        <p>
          New promotion value: <strong>{money(state.totalCents)}</strong>
        </p>
      )}
      {state?.slug && (
        <Link className="button" href={`/account/${state.slug}`}>
          View profile and current rankings
        </Link>
      )}
      <output className="error">
        {error ||
          (!id || !token ? 'A valid private purchase link is required.' : '')}
      </output>
    </div>
  );
}
