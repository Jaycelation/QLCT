# QLCT · Finora

A Vietnamese-first personal finance application built with **Next.js App Router, React, TypeScript, Tailwind CSS, shadcn-style Radix UI primitives, PostgreSQL, Prisma, Zod, and Recharts**.

Work by Codex is isolated on `codex/finora-app`. `main` remains the shared baseline for independent work by Claude Code. Do not merge branches automatically.

## Run locally

Requires Node.js 22+ and PostgreSQL 16+ (or Docker for the database).

```bash
npm ci
cp .env.example .env
docker compose up -d db
npm run db:generate
npm run db:migrate
npm run db:seed  # optional development data; uses credentials in .env
npm run dev
```

Open http://localhost:3000. Register a new account for empty, private financial records, or sign in using the **SEED_EMAIL / SEED_PASSWORD from your .env**. Seed data is created once in the database, never injected into the UI. Restarting or refreshing preserves your data.

PowerShell: replace `cp .env.example .env` with `Copy-Item .env.example .env`.

`docker compose down` preserves the database volume. **Do not use `down -v` unless you intend to delete all data.**

## Features

- Dashboard: lifetime balance; selected-month income, spending and net savings; comparison to previous month; six-month cash-flow chart; category distribution; recent transactions and budget warnings.
- Transactions: create, edit, delete with confirmation; search notes/categories; filter type, date range, account and category; payment methods; CSV export of filtered results.
- Budgets: monthly global or category limits; actual usage, remaining amount and 80%/100% warnings. A global budget and category budgets are shown separately, never added together.
- Goals: names, targets, saved amounts, deadlines, colors and progress milestones. Saved goal balances are independent tracking fields, not account transfers.
- Reports: Monday-based weekly, monthly and yearly periods, savings rate, ranked expenses, CSV summary and full period transaction export. UTF-8 BOM supports Vietnamese text in Excel. CSV cells escape spreadsheet formulas. Native XLSX is not included.
- Accounts and custom categories: full CRUD; database prevents deletion of referenced accounts/categories. Category type cannot change while in use.
- Recurring entries: weekly/monthly/yearly schedules, active/pause setting, month-end anchor, idempotent generation, automatic processing on sign-in/load and manual catch-up.
- Vietnamese default, English UI, VND integer accounting, responsive layout, light/dark theme, accessible Radix dialogs, validation, loading/error states and toast feedback. User-created category names remain as entered when switching language.

## Recurring scheduler

On app load, due entries are processed for the authenticated user. For processing while the app is closed, configure a daily scheduler on the Node deployment:

```bash
npm run jobs:recurring
```

This also purges expired sessions and rate-limit rows. Run with the same `DATABASE_URL`; no browser session is required because this is an operator-only CLI. Each invocation catches up to 120 occurrences per rule. Long backlogs are completed across subsequent runs. Dates follow `Asia/Ho_Chi_Minh`; transactions are date-only and future transactions must be represented as recurring rules. A monthly rule starting January 31 advances to February's last day and returns to March 31.

## Configuration

| Variable                      | Purpose                                                                            |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| `DATABASE_URL`                | PostgreSQL connection string; add provider-required TLS settings in production     |
| `APP_ORIGIN`                  | Exact external origin, e.g. `https://finance.example.com`; required for all writes |
| `SEED_EMAIL`, `SEED_PASSWORD` | Development seed only; seed refuses `NODE_ENV=production`                          |
| `POSTGRES_PASSWORD`           | Optional Docker Compose database password; keep it consistent with `DATABASE_URL`  |

The application does not need a JWT signing secret: sessions are opaque random tokens and only their SHA-256 digests are stored in PostgreSQL. Never commit `.env` files.

## Security design

- All finance reads and writes require a valid server-side session. Every query and mutation includes the authenticated user ID.
- Nested account/category references are checked for ownership and correct transaction type. Composite foreign keys also enforce owner consistency in PostgreSQL.
- Passwords use bcrypt cost 12 with a 72-byte UTF-8 maximum. Opaque sessions expire after seven days; cookies are HttpOnly, SameSite=Lax and production Secure with the `__Host-` prefix. Logout revokes the session in the database.
- Mutation endpoints require a matching `Origin` and JSON content type. Requests are capped at 16 KiB, including streamed bodies; Zod schemas reject unknown fields.
- Database-backed email and global login/registration limits work across instances. Add trusted-proxy IP throttling at the ingress for public deployments; the app does not trust arbitrary forwarded-IP headers.
- Prisma parameter binding and escaped React rendering prevent ordinary SQL injection and stored HTML injection. CSV export sanitizes formula prefixes.
- Serializable mutations protect reference validation; recurring entries have a unique occurrence key and retry serialization conflicts.
- Sensitive API responses are no-store. Error responses do not contain database errors, passwords, tokens or financial payloads. CSP, framing, MIME and referrer headers are set in Next configuration.

This is a working implementation, not a security certification. The current CSP allows inline scripts for Next's runtime; tighten it with per-request nonces for a high-assurance deployment. Email verification, password recovery, MFA, bank aggregation, transfers and multi-currency conversion are not implemented or advertised in the UI.

## Test and build

Use a **separate disposable PostgreSQL database** for integration tests. Tests create and remove their own users; never point test jobs at production.

```bash
npm test                    # unit/request boundary tests; DB suites skip by default
npm run test:integration     # requires migrated DATABASE_URL
npm run typecheck
npm run build
npm start
```

The GitHub Actions workflow runs migrations, type checks, tests and production build against PostgreSQL 16. Integration cases cover cross-user reads, foreign-key injection, unauthorized updates/deletes, owned CRUD, and duplicate recurring processing. Tests cover invalid dates, month-end recurrence, exact integer totals, report periods, CSV injection and CSRF boundaries.

## Deploy

Deploy to a Node.js host or container with PostgreSQL. This exact stack is not configured for the Sites D1/Workers runtime.

1. Provision PostgreSQL, a least-privilege application account, TLS, backups and a restore policy.
2. Set `DATABASE_URL` and the HTTPS `APP_ORIGIN` using the host's secret manager.
3. Install dependencies and run `npm run db:generate` and **`npm run db:migrate` as a release step** before starting the new application version.
4. Run `npm run build && npm start`, or build and run the included Dockerfile. The runtime image does not perform migrations; run them from the source/build job.
5. Terminate HTTPS at a trusted proxy, redirect HTTP to HTTPS, enable HSTS at the proxy, and configure the recurring CLI scheduler.
6. Check registration, login, cross-user isolation, logout, CRUD, persistence and CSV export in staging before exposing the app.

The standalone container runs as non-root. Supply runtime environment variables via the deployment platform, not Docker build arguments. Do not seed a public production database.

## Architecture

```text
app/api/auth/[action]/       Registration, login, logout, session lookup
app/api/finance/[[...path]]/  Protected CRUD, export and recurring processing
components/                 App shell, screens, forms and charts
components/ui/              Reusable Radix dialog and shadcn-style button
lib/                        Auth, validation, finance logic and data service
prisma/                     PostgreSQL schema, migration and development seed
scripts/                    Operator recurring job and isolated test harness
 tests/                     Unit and database integration tests
```

`lib/service.ts` owns authorization and business mutations. All persistent financial records live in PostgreSQL; only theme and language preferences use localStorage. Amounts are whole VND with a per-record limit of 10^12. The current UI loads the user's transaction history in one response and paginates locally; move filtering, aggregation and pagination server-side before handling very large ledgers.

## Verification limits

The production build and automated checks are documented in `VERIFICATION.md`. Browser/mobile visual QA and a production PostgreSQL deployment must be validated in the target environment. No live deployment or claim of production security certification is included.
