import { Skeleton } from '@/components/ui/skeleton';
export default function Loading() {
  return (
    <div className="page stack" aria-label="Loading rankings">
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-72 w-full" />
      <Skeleton className="h-16 w-full" />
      <span className="muted">Loading the spotlight…</span>
    </div>
  );
}
