# Rally implementation plan

Repository audit: empty Git repository; no framework, package manager, routes, authentication, UI, schema, payment adapter, environment files, tests, or deployment config existed.

Stack: scaffolded Vinext (Next App Router conventions, React 19, Vite, TypeScript strict), npm lockfile, Cloudflare-compatible server build, Supabase PostgreSQL/Auth over HTTPS, Stripe adapter, Base UI dialogs. Sites registration is private. No existing external Supabase project or payment credentials were supplied.

1. Build original dark/yellow public leaderboard and clearly labeled fictional preview.
2. Normalize geography and accounts; implement server-side ranking and opportunity calculations. Preserve a deterministic first verified promotion timestamp tie-breaker, as explicitly specified; this differs from a current-total attainment timestamp.
3. Separate authenticated ownership claims from guest promotion. Require fresh server-verified identity and database admin membership.
4. Implement test-mode Stripe checkout and signed webhook normalization; transactional immutable ledger, aggregate, idempotency, refunds and disputes.
5. Implement reports, moderation, audit trail, dashboard, policy pages, share links/cards, private analytics and metadata.
6. Verify money/ranking/security invariants using executable PostgreSQL migration tests; run strict typecheck, lint, tests, build, and responsive browser QA. Document external integration gaps rather than claiming launch readiness.

Source-of-truth financial ledger is separate from account ownership. No wallets, transfers or payouts exist. Live data never falls back silently to fictional data. Preview is explicitly configured and purchasing disabled. Public database privileges exclude all financial and moderation writes.
