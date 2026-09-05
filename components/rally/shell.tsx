import { disclosure, disclaimer } from '@/lib/domain/legal';
import Link from 'next/link';
import { ArrowUpRight, Search, ArrowUp, Plus } from 'lucide-react';
export function Brand() {
  return (
    <Link href="/" className="brand">
      <span className="brand-icon">
        <ArrowUpRight size={25} />
      </span>
      climbr<span className="brand-dot">.</span>
    </Link>
  );
}
export function Header() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Brand />
        <nav aria-label="Main navigation">
          <Link href="/" className="nav-active">
            Explore
          </Link>
          <Link href="/rankings">Rankings</Link>
          <Link href="/how-it-works">
            How it works <ArrowUpRight size={13} />
          </Link>
        </nav>
        <div className="header-actions">
          <Link
            aria-label="Search profiles"
            href="/search"
            className="icon-button"
          >
            <Search size={19} />
          </Link>
          <Link href="/dashboard" className="signin">
            Sign in
          </Link>
          <Link href="/add-profile" className="button small">
            <Plus size={16} /> Add Profile
          </Link>
        </div>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer>
      <div className="footer-top">
        <Brand />
        <p>A little boost. A bigger spotlight.</p>
        <a href="#top" className="icon-button" aria-label="Back to top">
          <ArrowUp size={17} />
        </a>
      </div>
      <div className="footer-links">
        {[
          'ranking-rules',
          'content-policy',
          'refunds',
          'terms',
          'privacy',
          'contact',
        ].map((p) => (
          <Link key={p} href={`/${p}`}>
            {p.replaceAll('-', ' ')}
          </Link>
        ))}
      </div>
      <p className="fineprint">{disclosure}</p>
      <p className="fineprint">{disclaimer}</p>
    </footer>
  );
}
