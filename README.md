# RepairHub

Marketplace for repairs ("Reparieren statt wegwerfen"). School project by team „Keks Kommando“.
The full technical concept lives in the Obsidian vault (`Repair Hub/Technical.md`).

**Stack:** SvelteKit 3 + Svelte 5 · TypeScript · PostgreSQL (Supabase) · Drizzle ORM · Better Auth · Tailwind CSS 4 · Vercel

## What works so far

- Sign up, log in, log out (email + password)
- Profile (`/profil`): name, profile picture, PLZ + city, "about me"; public profile at `/nutzer/[id]`
- Settings (`/profil/einstellungen`): change email and password, email notification preferences (saved, no emails sent yet)
- Create a repair request (`/anfragen/neu`) with 1–8 photos and an optional timeframe. Photos are shrunk to WebP in the browser (JPEG in Safari) and uploaded straight to Supabase Storage
- Edit a request (`/anfragen/[id]/bearbeiten`): everything until the first quote, after that only a dated note ("Nachtrag") and more photos. Withdraw a request (open quotes are rejected), renew it for 30 days once it has expired or has 3 days left
- Browse and filter open requests by category and keyword (`/anfragen`), detail page. Distance search: PLZ + radius, distance on every card, list/map toggle (Leaflet + OpenStreetMap). PLZ data from GeoNames
- Quotes: repairers send a quote on a request, can withdraw it; the customer compares them (with the repairer's rating and distance) and accepts one
- Reviews in both directions after a completed order (1–5 stars + text), hidden until both sides reviewed or 14 days passed. Average and list on the public profile; admins can remove reviews
- Payouts (`/profil/auszahlungen`): Stripe Connect Express onboarding. Optional: anyone can send quotes without a payout account, unless `REQUIRE_PAYOUT_ACCOUNT=true` (see "Stripe" below)
- Orders (`/auftraege`): awaiting payment → paid → in progress → repaired → completed, cancel before start, tracking numbers, status history
- Payments (Stripe test mode): accepting a quote opens Stripe Checkout; the money stays with the platform until the customer confirms the repair, then price minus commission is transferred to the repairer (held until they have an active payout account). Cancelling a paid order refunds it in full. Without `STRIPE_SECRET_KEY` the payment step is skipped and orders start as paid
- „Meine Anfragen“ and „Meine Angebote“ overview pages
- Chat (`/nachrichten`): one conversation per request and repairer, started by a quote or a question. New messages are polled every 5 s, the unread badge every 30 s. Warns about contact details before booking
- Admin area (`/admin`, admins only): dashboard with users, requests, orders, GMV and commission (also per week); user search, ban/unban, make/remove admin; categories: rename, reorder, add, delete unused
- Super admin (`SUPER_ADMIN_EMAIL`, one account): always admin, can't be demoted, banned or edited by other admins. Extra tabs in `/admin`: edit any user (profile, temporary password that must be changed on next login, "Anmelden als …" with a permanent banner, delete completely or anonymise), edit Anfragen and Angebote, force order status (optionally refund / pay out in Stripe), delete categories that are still in use (move or delete their Anfragen), generate test Anfragen with quotes from a test account pool and delete them again, and a log ("Protokoll") of all of this. Destructive actions ask for the super admin's password
- Background jobs (`/api/cron`, daily via Vercel Cron, needs `CRON_SECRET`): requests expire after 30 days and quotes after 7, orders still unpaid after 24 hours are cancelled (the request reopens), repaired orders are confirmed automatically after 7 days without a reaction (and paid out), failed payouts are retried. The super admin can run them by hand under „Protokoll“
- Landing page, Impressum/Datenschutz placeholders
- Category tree seeded via migration

## Local development

Requirements: Node 24+, pnpm (`npm i -g pnpm` or `npx pnpm …`), Docker.

```sh
pnpm install
cp .env.example .env        # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
pnpm db:start               # Postgres + PostGIS in Docker
pnpm db:migrate             # create tables + seed categories
pnpm storage:setup          # once: create the photo bucket (needs the Supabase keys in .env, see below)
pnpm dev                    # http://localhost:5173
```

**Photos:** Docker has no file storage, so local development also uploads to the Supabase project, into its own bucket (`STORAGE_BUCKET="request-photos-dev"`). Set `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (Supabase → Project Settings → API Keys, the secret key) in `.env`. Without them the app runs, but requests can't be created because photos are required.

Useful scripts:

| Script                           | What it does                                                    |
| -------------------------------- | --------------------------------------------------------------- |
| `pnpm check`                     | Type-check Svelte + TS                                          |
| `pnpm lint` / `pnpm format`      | Prettier + ESLint                                               |
| `pnpm test`                      | Unit tests (Vitest)                                             |
| `pnpm db:generate --name <name>` | Create a migration after changing `src/lib/server/db/schema.ts` |
| `pnpm db:migrate`                | Apply migrations to `DATABASE_URL`                              |
| `pnpm db:studio`                 | Browse the database in the browser                              |
| `pnpm auth:schema`               | Regenerate the Better Auth tables after changing `auth.ts`      |
| `pnpm admin:grant <email>`       | Make an existing account an admin (the first admin needs this)  |
| `pnpm storage:setup`             | Create/update the public photo bucket `STORAGE_BUCKET`          |

## Deploying a test server (Vercel + Supabase)

1. **Supabase:** create a project at supabase.com, region **Frankfurt (eu-central-1)**.
   Under _Connect_, copy two URIs:
   - _Session pooler_ (port 5432) for running migrations from your machine
   - _Transaction pooler_ (port 6543) for Vercel
2. **Migrate the Supabase DB** from your machine:
   ```sh
   DATABASE_URL="<session pooler URI>" pnpm db:migrate
   ```
3. **GitHub:** push this repo to GitHub.
4. **Vercel:** _Add New → Project_, import the repo (framework is detected automatically). Before deploying, add the environment variables:
   - `DATABASE_URL` = transaction pooler URI
   - `BETTER_AUTH_SECRET` = a new `openssl rand -base64 32`
   - `ORIGIN` = the Vercel URL, e.g. `https://repairhub.vercel.app` (deploy once, copy the URL, set it, redeploy)
   - `SUPABASE_URL` = `https://<project>.supabase.co`, `SUPABASE_SECRET_KEY` = the secret key. `STORAGE_BUCKET` can stay unset (defaults to `request-photos`)
   - Create that bucket once from your machine: `SUPABASE_URL=… SUPABASE_SECRET_KEY=… STORAGE_BUCKET=request-photos pnpm storage:setup`
   - `CRON_SECRET` = a new `openssl rand -hex 32`. Vercel sends it to `/api/cron` once a day (schedule in `vercel.json`, 4:00 UTC). Without it the background jobs don't run
5. Every push to `main` deploys production, and every other branch gets a preview URL.

Migrations are not run automatically on deploy. Run step 2 again whenever a new migration is added.

## Stripe (optional, test mode)

Without `STRIPE_SECRET_KEY` the app runs without Stripe, and `/profil/auszahlungen` says payouts aren't set up. With it, repairers can set up a payout account there. Either way the payout account is **optional**: the whole app (quotes, orders, reviews) works without one, for testing. Set `REQUIRE_PAYOUT_ACCOUNT=true` to make it required before quoting, as the spec says (e.g. for a real launch).

1. Use a Stripe **sandbox**. Turn on **Connect** (marketplace), fill in the platform profile and **accept loss liability** (Settings → Connect → Platform profile), and set the branding.
2. _Developers → API keys_: put the `sk_test_…` key into `STRIPE_SECRET_KEY` (`.env` and Vercel).
3. _Developers → Webhooks → Add destination_: events from **Your account**, payload style **Thin**, endpoint `https://<your app>/api/stripe/webhook`, events:
   - `v2.core.account[configuration.recipient].capability_status_updated`, `v2.core.account[requirements].updated` (payout accounts)
   - `v1.checkout.session.completed`, `v1.checkout.session.async_payment_succeeded`, `v1.checkout.session.async_payment_failed`, `v1.checkout.session.expired` (customer payments)

   Put its signing secret into `STRIPE_WEBHOOK_SECRET` on Vercel.

4. Locally the webhook is optional: the payout status is refreshed whenever `/profil/auszahlungen` is opened, and a payment when the customer comes back from Checkout to the order page. Only an abandoned Checkout page needs the webhook (or a manual "Doch nicht bezahlen") to free the request again.

Test payment: card `4242 4242 4242 4242`, any future date, any CVC.

**Money flow** ("separate charges and transfers"): the Checkout payment lands on the platform account (`transfer_group = order_<id>`). On completion a Transfer of `payout_cents` goes to the repairer, tied to the original charge (`source_transaction`), so it works while the money is still pending. Repairers without an active payout account get it as soon as their account turns active. Cancelling a paid order creates a full Refund.

Connected accounts use **Accounts v2** (`recipient` configuration, Express Dashboard, platform-owned fees and losses), as Stripe recommends for marketplaces with separate charges and transfers.
