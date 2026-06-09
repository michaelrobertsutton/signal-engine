# Signal Engine — Deferred Work

## TODO: profile.yaml quarterly review
**What:** Quarterly review of your `config/profile.yaml` — update proof_points, domain terms, and NAICS codes as your company wins contracts or changes positioning.
**Why:** Scores drift silently as the company evolves. Without a review cadence, triage cards become miscalibrated.
**When:** Review quarterly, or trigger on: significant win/loss, new contract type, or capability expansion.
**Effort:** ~30 minutes per review.

## TODO: SAM.gov offset pagination
**What:** The SAM.gov client always fetches `offset=0` (most recent 50). After client-side NAICS filtering, some runs may yield 0 relevant results even though older records in the window would match. Add cursor-based offset to walk deeper into the result set when the initial batch yields nothing.
**Why:** 22,000+ opportunities per month — the top 50 skew toward DoD equipment. IT solicitations may sit deeper.
**How:** Track the SAM cursor as both a date and an offset. Reset offset when date advances.
**Effort:** 1-2 hours.
**Status:** Not started. Low priority — daily cron will accumulate results over time.