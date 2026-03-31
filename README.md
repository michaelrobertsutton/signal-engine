# Signal Engine

A Next.js 16 app that scans SAM.gov, OIG, and GAO daily for CMS-adjacent contract opportunities and reports, scores them against Bellese's capability profile, and surfaces AI-generated triage cards on a private dashboard.

Built for Bellese's growth team.

## What it does

- **Daily ingestion** — pulls SAM.gov solicitations, OIG reports, and GAO reports via cron
- **Fit scoring** — two-layer model: hard gates (NAICS, value range, exclusions) then LLM capability scoring against `config/bellese-profile.yaml`
- **Triage cards** — each passing item gets a BLUF, solution hypothesis, score (0–100), and recommendation (pursue / review / track)
- **Dashboard** — protected by passphrase, shows recent artifacts with alert banners for queue depth and scraper issues
- **Feedback** — thumbs up/down on each card feeds future model tuning

## Stack

- Next.js 16 (App Router, `proxy.ts` auth)
- Drizzle ORM + Neon Postgres
- Vercel AI Gateway (`anthropic/claude-sonnet-4.6`, OIDC auth)
- Deployed on Vercel Hobby

## Local setup

```bash
npm install
vercel link          # connects to the Vercel project
vercel env pull      # pulls DATABASE_URL, OIDC token, and other secrets to .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with the passphrase in `.env.local` (`DASHBOARD_PASSPHRASE`).

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon Postgres pooled connection |
| `DASHBOARD_PASSPHRASE` | Login passphrase for the dashboard |
| `SESSION_SECRET` | Cookie value for session validation |
| `SAM_GOV_API_KEY` | SAM.gov API key |
| `CRON_SECRET` | Bearer token for cron/admin routes |
| `VERCEL_OIDC_TOKEN` | Auto-provisioned by Vercel for AI Gateway |

## Database

```bash
npm run db:generate   # generate migrations from schema changes
npm run db:migrate    # apply migrations to Neon
npm run db:studio     # open Drizzle Studio
```

Schema is in `lib/db/schema.ts`. Never edit files in `drizzle/` manually.

## Capability profile

Edit `config/bellese-profile.yaml` to update Bellese's NAICS codes, contract size range, domain keywords, and proof points. The fit model reloads this on every analysis run — no redeploy needed.

## Cron jobs

Configured in `vercel.json`. Two jobs on Vercel Hobby (daily minimum):

| Route | Schedule | Purpose |
|---|---|---|
| `/api/cron/scan-all` | 9 AM UTC | Fetch from SAM, OIG, GAO |
| `/api/cron/analyze-pending` | 9 PM UTC | LLM-score up to 10 fetched items |

Trigger manually from the dashboard via **Run Now** (calls `/api/admin/trigger-analysis`).

## File layout

```
app/
  (dashboard)/         — protected routes
  login/               — passphrase login
  api/
    cron/              — scan-all, analyze-pending, timeout-test
    admin/             — trigger-analysis (Run Now)
    feedback/          — thumbs up/down
config/
  bellese-profile.yaml — capability profile (edit this)
  sources.yaml         — scraper config
lib/
  db/                  — Drizzle schema, client, queries
  fit-model/           — profile loader + two-layer scorer
  ingestion/           — SAM, OIG, GAO clients
  analysis/            — LLM scorer + citation extractor
proxy.ts               — Next.js 16 session auth
```
