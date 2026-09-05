import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="page">
      <h1>This spotlight is unavailable.</h1>
      <p>
        The account or location may not exist, may await approval, or may be
        suspended.
      </p>
      <Link className="button" href="/">
        Back to rankings
      </Link>
    </div>
  );
}
