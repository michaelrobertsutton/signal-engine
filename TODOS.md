# Signal Engine — Deferred Work

## TODO: Fix LLM failures — swap AI Gateway for free Google Gemini API
**What:** Replace `anthropic/claude-sonnet-4.6` (AI Gateway) with `google/gemini-2.0-flash` (direct Google AI SDK). AI Gateway requires a credit card on file even for free tier — this blocks all analysis runs.
**Why:** `consecutiveFailures` counter hit 3 and is firing the dashboard alert. Every Run Now attempt fails silently.
**Steps:**
1. Get free API key: `open https://aistudio.google.com/apikey`
2. `npm install @ai-sdk/google`
3. `vercel env add GOOGLE_GENERATIVE_AI_API_KEY` (add to Production + Preview + Development)
4. `vercel env pull` to refresh `.env.local`
5. Update `lib/analysis/scorer.ts`:
   - `import { google } from '@ai-sdk/google'`
   - Replace `callLlm(prompt, 'anthropic/claude-sonnet-4.6')` → `callLlm(prompt, google('gemini-2.0-flash'))`
   - Replace `callLlm(prompt, 'anthropic/claude-haiku-4.5')` fallback → `callLlm(prompt, google('gemini-2.0-flash-lite'))`
   - Change `callLlm` signature from `model: string` to `model: Parameters<typeof generateText>[0]['model']` (remove the cast)
6. Deploy and click Run Now — confirm artifacts appear
**Cost:** $0 — Gemini free tier is 1,500 requests/day, we use ~10/day max.
**Status:** Not started. Do this first next session.

## TODO: bellese-profile.yaml versioning + quarterly review
**What:** Add `version` field to bellese-profile.yaml and a quarterly review process.
**Why:** The profile will drift as Bellese wins contracts, changes positioning, or adds NAICS codes. Without versioning, there's no way to know if a score drop is calibration drift or a genuine change. Without a review cadence, proof_points go stale silently.
**Pros:** Scores remain calibrated over time. Easy to audit which profile version produced which artifact.
**Cons:** Small ongoing maintenance burden (~30 min/quarter).
**Context:** v1 was populated in the pre-work fit model interview. The `version: '1.0.0'` field is already in the YAML. Review trigger: after a significant win, loss, or Bellese capability expansion.
**Depends on:** Profile fully populated (exclusions + proof_points from fit model interview)
**Status:** Not started. Schedule first review for 2026-07-01.

## TODO: Verify Vercel Hobby cron timeout empirically
**What:** Deploy a test function that sleeps 120 seconds. Confirm it completes on Hobby plan.
**Why:** Design assumes 300s timeout (per Vercel's 2025 update). If actual Hobby cron limit is 60s, analyze-pending must cap at 3 items/run instead of 10 (slower but $0).
**Pros:** Eliminates a launch assumption that could cause silent mid-run failures.
**Cons:** None — takes 10 minutes in Week 1 Day 1.
**Context:** Done before writing any cron handlers. If 60s confirmed: change `ANALYZE_PENDING_BATCH_SIZE` constant from 10 to 3. No other code changes needed.
**Depends on:** Vercel project created + `vercel link` completed.
**Status:** Not started. Week 1 Day 1 pre-work.

## TODO: Create private GitHub repo
**What:** Create a private GitHub repo under `michaelrobertsutton` and push the signal-engine project to it.
**Why:** Version control, backup, and Vercel CI/CD auto-deploy on git push.
**Pros:** Every push auto-deploys to Vercel preview. Main branch auto-deploys to production. Full history.
**Cons:** None.
**Context:** Repo should be private (contains bellese-profile.yaml with company capability data). After creating, connect it to the Vercel project via the Vercel dashboard (Settings → Git → Connect Repository). Then `vercel env pull` will work with the connected repo.
**How:**
```bash
! gh repo create michaelrobertsutton/signal-engine --private --source=. --remote=origin --push
```
Or manually at github.com → New repository → private → `michaelrobertsutton/signal-engine`.
**Depends on:** Project scaffolded + git init done.
**Status:** Not started. Week 1 Step 1 (after scaffold).

## TODO: Add CLAUDE.md with skill routing rules
**What:** Create CLAUDE.md in the project root during Week 1 scaffold with gstack routing rules.
**Why:** Allows Claude Code to automatically route "is this worth building" → /office-hours, "why is this broken" → /investigate, etc. without manual skill invocations.
**Pros:** Faster iteration. Correct skill used automatically.
**Cons:** None.
**Context:** Standard gstack setup. Can be added at `npx create-next-app` time (Week 1 Step 1).
**Depends on:** Git repo initialized.
**Status:** Not started. Week 1 Step 1.
