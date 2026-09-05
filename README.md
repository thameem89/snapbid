# Rally

Independent sponsored social-profile rankings. Promotion starts at $1 USD. This repository is an MVP implementation with an explicitly fictional preview; it is **not cleared for a live-money launch**.

## Architecture

Vinext App Router / React 19 / strict TypeScript / npm / Base UI dialogs / Cloudflare Worker build. Supabase supplies PostgreSQL and email magic-link authentication. Financial logic lives in PostgreSQL transactions; Stripe is an adapter implementing the provider-independent `PaymentProvider` interface. The public site never receives the service-role key.

See `docs/IMPLEMENTATION.md` for the initial empty-repository audit and phased plan. `docs/VERIFICATION.md` records executed checks and gaps.

## Install and run

```sh
npm ci
cp .env.example .env.local
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
```

Node 22.13+ is required by the starter; local verification used Node 25. The first preview uses explicitly labeled fictional accounts from `lib/domain/demo.ts`. `DEMO_MODE=true` disables all persistent actions and payment checkout. Production never silently falls back to fictional data when Supabase fails. Set a configurable `MAX_PROMOTION_AMOUNT_CENTS` even for estimates.

## Supabase setup

1. Choose/create your own Supabase project. No project was selected or modified by this implementation.
2. Apply `supabase/migrations/20260905072810_initial_rally.sql` using the Supabase SQL editor or your reviewed migration pipeline. It expects Supabase's `auth.users`, `auth.uid()`, `anon`, `authenticated`, and `service_role` roles.
3. Apply `supabase/seed.sql` for production-safe platform and geographic reference data. This contains **no fictional accounts**.
4. Only on a disposable development database, optionally apply `supabase/demo-seed.sql`. This seeds fictional purchases through the same ledger transaction. Never run it in production. `scripts/generate-seed.ts` regenerates both seed files.
5. Configure Supabase URL, publishable key, and server-only service role key. Set `DEMO_MODE=false`.
6. Enable email authentication, configure SMTP, Site URL, and the exact `/auth/confirm` redirect URL. Verify email delivery and PKCE callback in the deployed environment.
7. Insert an authorized existing Auth user's UUID into `public.admin_members` using a privileged database session. No email allowlist, client metadata, or public write can assign administrator rights.
8. Run Supabase database security/performance advisors against the actual hosted project. They have not been run remotely.

The local PostgreSQL tests bootstrap minimal Auth roles/functions and execute the actual migration in PGlite. These validate SQL constraints, grants, RLS and transactions, but do not substitute for tests of hosted Supabase APIs, Auth, refresh cookies or independent concurrent database connections.

## Environment

Required for a real deployment:

| Variable                               | Purpose                                                      |
| -------------------------------------- | ------------------------------------------------------------ |
| `DEMO_MODE`                            | Explicit fictional preview switch; false for real data       |
| `NEXT_PUBLIC_APP_URL`                  | Trusted exact origin; callback, checkout and canonical base  |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase HTTPS endpoint                                      |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public API key; legacy anon key fallback supported           |
| `SUPABASE_SERVICE_ROLE_KEY`            | Server-only database API credential                          |
| `MAX_PROMOTION_AMOUNT_CENTS`           | Configurable integer transaction ceiling; minimum 100        |
| `NEW_ACCOUNT_REVIEW_MODE`              | `manual` (default) or `automatic`                            |
| `MIN_INDEXED_ACCOUNTS`                 | Minimum geographic leaderboard population for indexing       |
| `RATE_LIMIT_SALT`                      | Random server-only salt for hashed rate-limit identifiers    |
| `PAYMENT_PROVIDER`                     | `disabled` or `stripe`                                       |
| `STRIPE_SECRET_KEY`                    | Test secret beginning with `sk_test_`; live secrets rejected |
| `STRIPE_WEBHOOK_SECRET`                | Endpoint signature secret                                    |

`DEFAULT_CURRENCY=USD` documents the MVP's sole ranking currency; database constraints reject other currencies. `SUPPORT_EMAIL` and future Snap configuration variables are reserved for operator setup; no Snap integration is represented as connected. No Stripe publishable key is needed for hosted checkout.

## Ranking and geography

`locations` is a parent hierarchy with optional levels, cycle prevention, enabled flags and indexed parent references. UAE/GCC data is reference data, not a schema assumption. Every approved account belongs to its location and its enabled ancestors.

Order: `total_verified_promotion_cents DESC`, `first_verified_promotion_at ASC NULLS LAST`, `id ASC`. The tie timestamp is the account's first verified promotion, **not** the time it most recently reached its current total. This resolves the brief's conflicting examples in favor of its explicitly specified sorting fields.

Ranks are computed using SQL window/count queries. Stored profile ranks are not authoritative. Server-side opportunities compute the least additional cents needed to beat the target under the tie rule, then apply the $1 transaction minimum. For $17 versus $21, a later-timestamp account needs $4.01; a $5 whole-dollar suggestion is also sufficient, but the implementation returns the exact minimum. Estimates never guarantee a position.

The public query caps responses at 100; the application requests 50. Ranking indexes support ordered queries, trigram indexes support future expanded search. Population-scale EXPLAIN/load testing remains required; current rank-position pagination is not a stable snapshot when purchases arrive.

## Promotion and payment model

No wallet, transferable balance, withdrawal, payout or user-to-user transfer exists. Guest payers remain separate from listing owners.

1. Server validates origin, rate limit, active listing, exact integer cents, ceiling and USD.
2. It creates a pending purchase with an unguessable private status token hash.
3. The provider creates hosted checkout with truthful promotional-placement metadata. The purchase UUID is the provider idempotency key.
4. Stripe signatures are verified over the raw request body, with a 300-second timestamp tolerance. Live-mode events are rejected.
5. The adapter retrieves current PaymentIntent/charge state and normalizes it.
6. The service-only `apply_payment_event` RPC checks amount, currency, provider and payment identity; locks the purchase; deduplicates the event; appends the immutable adjustment; atomically updates the aggregate; and records public activity/private conversion analytics in one transaction.
7. The return page polls only the application's private status endpoint. Redirect parameters cannot mark a purchase verified.

`payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, and `charge.dispute.created` are handled. Unrelated signed events are acknowledged without credit. Database failures return 500 so the provider can retry. Verification failures return 400. Full/partial refunds reduce value; disputes remove all remaining value for that purchase. Reversals are monotone: stale success events cannot restore them. Won disputes require an explicitly designed restoration workflow in a future phase; they do not automatically recredit.

## Stripe test setup

Obtain provider approval for the actual business model; an adapter is not approval. Set test credentials and maximum purchase amount. Register `/api/webhooks/stripe` for the four events listed above. Test successful checkout, failed payment, duplicate deliveries, delayed webhook, amount mismatch, partial/full refunds, disputes and concurrent separate purchases. Use Stripe-hosted refunds for MVP; `createRefund` exists on the adapter but there is no in-app refund initiation UI.

The private Sites preview is access-controlled and unsuitable for receiving public provider webhooks. Before real provider testing, configure an approved publicly reachable deployment/ingress with the same trusted app origin and webhook secret. Do not bypass or disguise provider requirements.

## Replacing the provider

Implement `PaymentProvider` (`createCheckout`, `verifyWebhook`, `retrievePayment`, `createRefund`) and register it in `paymentProvider()`. Normalize events to `VerifiedPayment`, preserving integer USD cents and expected purchase references. Keep provider SDK imports out of ranking and geography services. Add hosted checkout destination validation for the new provider. Do not add unnormalized foreign-currency amounts to USD ranking value.

## Auth, claims, moderation

Email magic links use Supabase SSR cookies and a fixed-origin callback. Middleware refreshes identity for private pages. Server authorization uses `getUser()` and current `admin_members` membership; user-editable metadata grants nothing. Claims and evidence are private and manually reviewed. Admin decisions and audit entries share a transaction. Listings can be pending, approved, rejected or suspended. Suspension removes them from public ranking queries; settlement still records legitimate already-created purchases for audit/reversal. Owners can edit display name and bio, never promotional value.

Reports require authentication. Admin UI lists pending accounts, pending claims, open reports and disputed purchases, with an audited decision form. It is intentionally a basic operations screen rather than a complete case-management system.

## Routes

Public: `/`, `/snapchat`, `/snapchat/[...location]`, `/rankings`, `/search`, `/account/[slug]`, `/account/[slug]/share`, `/how-it-works`, `/ranking-rules`, `/content-policy`, `/refunds`, `/terms`, `/privacy`, `/contact`.

Protected actions/pages: `/add-account`, `/dashboard`, `/admin`, `/auth/confirm`, `/payment` (private token link).

API: `/api/search`, `/api/estimate`, `/api/accounts`, `/api/claims`, `/api/reports`, `/api/profile`, `/api/preferences`, `/api/auth`, `/api/logout`, `/api/admin`, `/api/analytics`, `/api/checkout`, `/api/purchases/[id]`, `/api/webhooks/stripe`.

## Tables

`platforms`, `locations`, `profiles`, `admin_members`, `social_accounts`, `social_account_owners`, `account_claims`, `promotion_purchases`, `payment_sessions`, `payment_events`, `promotion_adjustments`, `public_activity`, `reports`, `moderation_actions`, `admin_audit_log`, `analytics_events`, `notification_preferences`, `rate_limits`.

RLS is enabled on every table. Anonymous clients can select only enabled reference data, approved accounts and sanitized public activity. Authenticated users can additionally read their own private records. Financial writes and privileged functions are explicitly revoked from `PUBLIC`, `anon`, and `authenticated`. Ledger/event update and delete triggers enforce immutability, including service writes. Administrative and settlement functions are security-invoker functions, available only to service-role callers.

## Analytics and privacy

First-party events capture profile views, boost clicks, checkout starts, verified purchases, and shares. The schema supports outbound/referral events. Payer UUID on purchases enables repeat-promotion analysis for authenticated payers. Guest conversion attribution beyond a purchase and longitudinal guest retention remain unimplemented. Public activity never selects payer identity, private evidence or notes. No card details are stored.

Rate limits use PostgreSQL shared counters. Production assumes a trusted Cloudflare `CF-Connecting-IP` header. For other hosting, configure an authenticated edge-derived address mechanism; never trust arbitrary forwarded headers. IP rate limiting is a coarse abuse guard, not location verification or sole fraud determination. Provider fraud screening and manual dispute review are separate operational controls.

## Deployment

`npm run build` emits the Cloudflare Worker and client assets to `dist`. `.openai/hosting.json` contains only the private Sites registration and logical bindings. Secrets belong in runtime environment settings, never this manifest. Package with the Sites `package-site.sh` helper, save the exact committed/pushed source version, then deploy privately. A public launch is a separate access decision.

For another Cloudflare deployment, configure the emitted Worker entrypoint and static assets, runtime secrets, trusted origin, Supabase redirects and publicly reachable webhook URL. Perform hosted integration checks before enabling purchases.

## Known limitations / launch gates

- No hosted Supabase configuration, email delivery, real Stripe API call or end-to-end payment verification was performed; checkout intentionally remains disabled in preview.
- PGlite queues concurrent calls; true multi-connection contention, retry/deadlock behavior and load tests need a real Postgres environment.
- Avatar fallbacks are initials; upload management, custom avatar delivery and official Snap ownership verification are not implemented.
- Share links, rendered share-card pages, and downloadable PNG cards are implemented; dynamic social-crawler image previews are not implemented.
- Search is capped, and pagination/load testing must be expanded before a high-volume public launch.
- Admin operations, financial reconciliation/retry monitoring, email notifications, won-dispute restoration and richer analytics remain operational work.
- Policies are editable baselines requiring operator details and legal review; no compliance or provider approval is implied.
- Vendored starter UI and its unused mobile hook are excluded from lint because they ship with existing diagnostics. Authored application code, server code and tests are linted and strict typechecked.

Recommended next phase: connect a dedicated test Supabase project, run hosted RLS/API/Auth and real multi-connection financial tests, then complete a Stripe test-mode refund/dispute cycle and provider review before any public live-money launch.
