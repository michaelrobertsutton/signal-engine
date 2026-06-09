# Signal Engine

Automated federal opportunity intelligence. Monitors SAM.gov solicitations and OIG/GAO watchdog reports daily, scores each item against your company profile, and surfaces ranked triage cards on a private dashboard.

Built for government contractors who want to stop missing opportunities because they posted on the wrong day.

## How it works

1. **Daily ingestion** — cron jobs pull from SAM.gov (contract solicitations), OIG (audit reports), and GAO (watchdog reports)
2. **Two-layer fit model** — hard gates first (NAICS whitelist, contract size range, exclusion keywords), then LLM capability scoring against your `config/profile.yaml`
3. **Triage cards** — each passing item gets a BLUF, a solution hypothesis grounded in your proof points, a score (0-100), and a recommendation: pursue / review / track / skip
4. **Private dashboard** — passphrase-protected Next.js app; thumbs up/down feedback tunes the model over time

## Stack

- Next.js 16 (App Router)
- Drizzle ORM + Neon Postgres
- Vercel AI SDK (Google Gemini by default)
- Vercel Cron + OIDC auth
- Tailwind CSS

## Setup

### 1. Clone and install

```bash
git clone https://github.com/michaelrobertsutton/signal-engine.git
cd signal-engine
npm install
```

### 2. Configure your profile

```bash
cp config/profile.example.yaml config/profile.yaml
```

Edit `config/profile.yaml`. The LLM uses your proof points when generating solution hypotheses — the more concrete your profile, the sharper the output. See the example file for all available fields.

### 3. Set up Neon Postgres

Create a free [Neon](https://neon.tech) database, then run the schema migration:

```bash
npx drizzle-kit push
```

### 4. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in your values. See `.env.example` for documentation on each variable.

### 5. Deploy to Vercel

Connect the repo to Vercel, add your environment variables in the dashboard, and deploy. Cron jobs run automatically on Vercel's Hobby tier at no cost.

## Configuration

Signal Engine is driven entirely by `config/profile.yaml`. Key sections:

| Section | Purpose |
|---|---|
| `domain.strong` | Terms matched against solicitations/reports for capability scoring |
| `domain.exclusions` | Keywords that immediately disqualify an item |
| `capabilities.proof_points` | Past contracts used by the LLM for concrete solution hypotheses |
| `contract_preferences.naics_whitelist` | NAICS codes to filter SAM.gov results (empty = no filter) |
| `contract_preferences.size_range` | Floor/ceiling contract values for hard-gate filtering |
| `primary_agency_name` | Substring matched against SAM.gov `fullParentPathName` to scope to your target agency |

A well-filled profile produces useful triage cards. An empty profile produces generic noise.

## Running locally

```bash
npm run dev
```

Trigger ingestion manually via the "Run Now" button in the dashboard, or call the cron endpoints directly:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/scan-all
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/analyze-pending
```

## Project structure

```
config/
  profile.example.yaml    Company profile template — copy to profile.yaml
  sources.yaml            Scraper configuration (OIG, GAO, SAM)
lib/
  fit-model/              Two-layer scoring: hard gates + LLM capability match
  analysis/               LLM prompt construction and triage card generation
  ingestion/              SAM.gov, OIG, GAO scrapers
  db/                     Drizzle schema and queries
app/
  (dashboard)/            Main dashboard UI
  api/cron/               Cron endpoint handlers
  api/feedback/           Thumbs up/down API
```

## License

MIT