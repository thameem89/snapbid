import { config } from '@/lib/server/config';
import type { Metadata } from 'next';
import { Header, Footer } from '@/components/rally/shell';
import './globals.css';
export const metadata: Metadata = {
  metadataBase: new URL(config().url),
  alternates: { canonical: '/' },
  title: {
    default: 'Climbr — Sponsored Social Rankings',
    template: '%s | Climbr',
  },
  description:
    'Discover sponsored creator rankings across your city, country and the world. Promotion starts at $1.',
  robots: { index: !config().demo, follow: true },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body id="top">
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Header />
        <main id="main" className="container">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
