# Signal Engine — Deferred Work

## TODO: bellese-profile.yaml quarterly review
**What:** Quarterly review of bellese-profile.yaml — update proof_points, domain terms, and NAICS codes as Bellese wins contracts or changes positioning.
**Why:** Scores drift silently as the company evolves. Without a review cadence, triage cards become miscalibrated.
**When:** First review scheduled 2026-07-01. Trigger also on: significant win/loss, new contract type, or capability expansion.
**Effort:** ~30 minutes per review.
**Status:** Version 1.0.0 in prod. Schedule next review for 2026-07-01.

## TODO: Add report title to artifact cards
**What:** The dashboard shows `bluf` and `solutionHypothesis` for one-pagers, but not the source report title. Hard to tell which OIG/GAO report each card came from without clicking through.
**Why:** Improves scannability — growth team needs to know at a glance if a card is about a topic they already know.
**How:** `getRecentOnePagers()` already joins `reports` — add `title: reports.title` to the select. Then display it above the bluf in the card.
**Effort:** 15 minutes.
**Status:** Not started.

## TODO: SAM.gov offset pagination
**What:** The SAM.gov client always fetches `offset=0` (most recent 50). After client-side NAICS filtering, some runs may yield 0 relevant results even though older records in the window would match. Add cursor-based offset to walk deeper into the result set when the initial batch yields nothing.
**Why:** 22,000+ opportunities per month — the top 50 skew toward DoD equipment. CMS IT solicitations may sit deeper.
**How:** Track the SAM cursor as both a date and an offset. Reset offset when date advances.
**Effort:** 1–2 hours.
**Status:** Not started. Low priority — daily cron will accumulate results over time.
