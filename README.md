# RepairHub

Marketplace for repairs ("Reparieren statt wegwerfen"). School project by team „Keks Kommando“.
The full technical concept lives in the Obsidian vault (`Repair Hub/Technical.md`).

**Stack:** SvelteKit 3 + Svelte 5 · TypeScript · PostgreSQL (Supabase) · Drizzle ORM · Better Auth · Tailwind CSS 4 · Vercel

## What works so far

- Sign up, log in, log out (email + password)
- Create a repair request (`/anfragen/neu`), with validation
- Browse and filter open requests by category and keyword (`/anfragen`), detail page
- Landing page, Impressum/Datenschutz placeholders
- Category tree seeded via migration

## Local development

Requirements: Node 24+, pnpm (`npm i -g pnpm` or `npx pnpm …`), Docker.

```sh
pnpm install
cp .env.example .env        # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
pnpm db:start               # Postgres + PostGIS in Docker
pnpm db:migrate             # create tables + seed categories
pnpm dev                    # http://localhost:5173
```

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
5. Every push to `main` deploys production, and every other branch gets a preview URL.

Migrations are not run automatically on deploy. Run step 2 again whenever a new migration is added.
