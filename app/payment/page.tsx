import { PaymentState } from '@/components/rally/payment-state';
export const metadata = {
  title: 'Promotion status',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; token?: string; cancelled?: string }>;
}) {
  const p = await searchParams;
  return (
    <div className="page">
      <PaymentState id={p.id} token={p.token} cancelled={p.cancelled === '1'} />
    </div>
  );
}
