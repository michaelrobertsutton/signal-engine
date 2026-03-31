# Signal Engine — Deferred Work

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
