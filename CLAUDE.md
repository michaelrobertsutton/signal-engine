# Signal Engine — Claude Code Instructions

## Project overview

Signal Engine is a Next.js 16 app (App Router) deployed on Vercel Hobby. It scans SAM.gov, OIG, and GAO daily for CMS-adjacent opportunities and reports, runs them through a fit model, and surfaces triage cards on a dashboard for Bellese's growth team.

## Key conventions

- `proxy.ts` (not `middleware.ts`) — Next.js 16 auth proxy, exports `proxy` function, Node.js runtime
- All request APIs are async: `await cookies()`, `await headers()`, `await params`
- Drizzle ORM + Neon Postgres — schema at `lib/db/schema.ts`, queries at `lib/db/queries.ts`
- AI Gateway via model string `'anthropic/claude-sonnet-4-6'` (OIDC auth, no API key needed locally)
- Cron handlers always check `Authorization: Bearer ${CRON_SECRET}`
- Bellese profile at `config/bellese-profile.yaml` — do not hardcode profile data in TypeScript

## SAM.gov API

Spec: https://open.gsa.gov/api/get-opportunities-public-api/

Critical parameter notes for v2 (`https://api.sam.gov/opportunities/v2/search`):
- NAICS filter param is `ncode` (NOT `naicsCode` — that name is silently ignored)
- `organizationName: 'Centers for Medicare'` filters server-side to CMS subtier records only
- `organizationCode` filters by exact org code (CDC = 7523; CMS code TBD)
- `deptname` and `subtier` are deprecated in v2 — do not use
- Rate limit: undocumented, varies by key type (federal/non-federal/general); burns fast with pagination
- Alpha/test endpoint: `https://api-alpha.sam.gov/opportunities/v2/search` — use for testing to avoid burning prod quota

## File layout

```
app/
  (dashboard)/         — protected routes (dashboard, artifact detail)
  login/               — passphrase login page + POST handler
  api/
    cron/
      scan-all/        — daily fetch from SAM + OIG + GAO
      analyze-pending/ — LLM analysis of status='fetched' items (max 10/run)
    admin/
      trigger-analysis/ — manual trigger (Run Now button)
config/
  bellese-profile.yaml — Bellese capability profile (NAICS, proof points, exclusions)
  sources.yaml         — scraper configuration (URLs, rate limits, text-length bounds)
lib/
  db/
    schema.ts          — Drizzle table definitions
    queries.ts         — typed query helpers
  fit-model/
    profile.ts         — YAML loader + validation
    matcher.ts         — Layer 1 hard gates + Layer 2 capability scoring
  ingestion/
    sam-client.ts      — SAM.gov API client with cursor pagination
    oig-scraper.ts     — OIG report scraper (cheerio + pdf-parse)
    gao-scraper.ts     — GAO RSS + HTML/PDF scraper
  analysis/
    scorer.ts          — LLM scoring prompt + Zod validation + retry logic
    citations.ts       — citation extraction and verification
drizzle/               — generated migration files (do not edit manually)
proxy.ts               — passphrase session auth (Next.js 16)
drizzle.config.ts      — Drizzle Kit config
```

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Architecture review → invoke plan-eng-review
