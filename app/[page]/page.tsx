import { notFound } from 'next/navigation';
import { policies } from '@/lib/domain/legal';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  return { title: policies[(await params).page]?.title || 'Not found' };
}
export default async function Page({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const slug = (await params).page;
  const policy = policies[slug];
  if (!policy) notFound();
  return (
    <div className="page prose">
      <div className="eyebrow">THE RALLY WAY</div>
      <h1>{policy.title}</h1>
      {slug !== 'how-it-works' && slug !== 'ranking-rules' && (
        <p className="notice">
          Draft baseline policy. Operator details and professional legal review
          are required before launch.
        </p>
      )}
      {policy.sections.map(([title, text]) => (
        <section key={title}>
          <h2>{title}</h2>
          <p>{text}</p>
        </section>
      ))}
    </div>
  );
}
