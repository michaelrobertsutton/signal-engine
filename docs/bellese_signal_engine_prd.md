# Product Requirements Document  
**Working Title:** Bellese Signal Engine  
**Prepared for:** Internal Bellese growth and solutioning team  
**Primary user:** Sutton  
**Secondary users:** Mark, Curtis, capture, growth, and solution leads  
**Draft date:** March 31, 2026

## 1. Product Summary

Bellese Signal Engine is an internal AI-assisted platform that monitors selected federal sources and converts new external signals into decision-grade internal artifacts.

The product has two initial modules:

1. **Report-to-Idea Engine**  
   Watches for new Government Accountability Office (GAO) and HHS Office of Inspector General (OIG) reports relevant to Centers for Medicare & Medicaid Services (CMS), analyzes them, and produces a Markdown one-pager that:
   - explains the problem,
   - identifies potential solution space,
   - recommends where AI may or may not help,
   - estimates confidence,
   - and packages the output for executive review.

2. **Opportunity Triage Engine**  
   Watches for new CMS opportunities on SAM.gov, reviews the solicitation or notice package, and scores whether the opportunity is worth Sutton’s review based on Bellese’s fit, likely competitiveness, and strategic value.

## 2. Problem Statement

Bellese loses time in two places:

1. **Greenfield idea generation is manual and inconsistent.**  
   Important watchdog reports surface real CMS pain points, but the work of finding them, reading them, framing them, and converting them into executive-ready solution ideas currently depends on manual effort and memory.

2. **Opportunity review is noisy and expensive.**  
   Not every CMS posting is worth leadership attention. Early triage is inconsistent because it relies on fragmented institutional knowledge rather than an explicit, reusable evaluation model.

The result is avoidable missed opportunities, slow reaction time, and too much senior time spent on low-value screening.

## 3. Vision

Create an internal system that acts like a standing analyst for Bellese growth.

The system should continuously monitor selected federal sources, detect relevant signals, generate traceable first-pass analysis, and hand Sutton an executive-grade artifact that is good enough to review, edit, and forward.

## 4. Goals

### Business goals
- Increase the number of credible CMS-facing greenfield ideas Bellese can pitch.
- Reduce time Sutton spends manually screening reports and opportunities.
- Improve consistency of internal go/no-go and review/no-review decisions.
- Build a reusable internal muscle for AI-assisted signal analysis tied to real growth outcomes.

### User goals
- Hand Sutton a clean Markdown artifact, not raw AI output.
- Keep every major claim traceable to source material.
- Surface confidence, rationale, and risk clearly.
- Minimize false positives that waste review time.

## 5. Non-Goals

- Fully autonomous outreach to CMS.
- Fully autonomous bid/no-bid decisions.
- Fully autonomous writing of proposal sections.
- Replacing human judgment in capture or solution strategy.
- Broad government-wide monitoring in MVP.

## 6. Users and Jobs To Be Done

### Primary user: Sutton
**Job to be done:**  
“When a new CMS-relevant signal appears, tell me if it matters, why it matters, and give me something I can actually use.”

Needs:
- BLUF-first output
- concise one-pagers
- Bellese-relevant framing
- confidence score
- citations and source links
- visible reasoning, not black-box scoring

### Secondary users: executives and growth leads
**Job to be done:**  
“Give me an artifact I can skim in 60–90 seconds to decide whether to discuss, fund, ignore, or pursue.”

Needs:
- short read time
- explicit ask
- strategic relevance
- proof-backed logic
- clear next step

## 7. MVP Scope

### MVP Module A: Report-to-Idea Engine
Monitor:
- HHS OIG CMS reports page
- GAO reports and testimonies relevant to HHS and CMS

For each new relevant report, generate:
- title
- source agency
- publication date
- issue area
- 3–5 sentence BLUF
- problem summary
- why it matters to CMS
- where AI could help
- where AI should **not** be used
- candidate Bellese-adjacent solution concepts
- confidence score
- recommended next action
- source citations
- output in Markdown one-pager format

### MVP Module B: Opportunity Triage Engine
Monitor:
- SAM.gov CMS opportunities feed or search results

For each new or materially updated notice, generate:
- opportunity title
- notice type
- NAICS or domain if available
- due date and timing risk
- fit score
- confidence score
- top reasons to review
- top reasons to skip
- Bellese sweet-spot alignment
- known gaps or partner dependencies
- recommendation: review now / track / skip

## 8. Functional Requirements

### Shared ingestion layer
The system shall:
- poll or ingest from configured federal sources on a scheduled cadence
- detect new items and materially updated items
- deduplicate previously processed items
- store source metadata and retrieval timestamps
- archive raw source content and parsed text

### Shared analysis layer
The system shall:
- classify each item by relevance to CMS and Bellese strategy
- extract key metadata and issue themes
- summarize the item in plain language
- generate a structured score with rationale
- attach source-linked citations to major claims
- preserve raw text for auditability

### Module A requirements
The system shall:
- identify whether a report addresses a CMS operational, compliance, program integrity, acquisition, digital service, beneficiary experience, data, or oversight problem
- propose one or more solution hypotheses
- explicitly state where AI is appropriate, inappropriate, or high risk
- score the opportunity across:
  - relevance to CMS
  - plausibility of Bellese play
  - urgency
  - executive interest potential
  - AI fit
- produce a Markdown one-pager in a standard template

### Module B requirements
The system shall:
- identify whether a notice is likely in Bellese’s sweet spot
- compare the notice against a maintained Bellese capability profile
- flag required capabilities Bellese likely lacks
- flag whether Bellese would need a partner
- distinguish between:
  - must review,
  - likely review,
  - track only,
  - skip
- provide the rationale in structured bullets, not just a numeric score

## 9. Bellese Fit Model Requirements

This is the make-or-break requirement for Module B.

The system shall use a maintained Bellese fit profile that includes:
- CMS and HHS domain strength areas
- technical strength areas
- known proof points and past performance
- contract size comfort range
- preferred contract types
- exclusion areas
- areas needing partners
- scoring weights for strategic fit, capability fit, and competitiveness

Initial Bellese fit examples based on current context:
- Strong:
  - CMS digital modernization
  - beneficiary and provider-facing platforms
  - quality reporting
  - data workflows
  - FHIR and API modernization
  - workflow optimization
  - pragmatic AI with human-in-the-loop
- Weaker or conditional:
  - very large-scale enterprise operations without proof-backed scale staffing
  - highly specialized Part C and Part D domain opportunities without dedicated SME support
  - opportunities where Bellese lacks prime-ready scale proof and must rely heavily on partners

## 10. Output Templates

### Module A: Report one-pager
Sections:
- Headline
- BLUF
- What happened
- Why it matters to CMS
- AI opportunity
- Proposed Bellese-adjacent response
- Confidence and caveats
- Suggested next step
- Sources

### Module B: Opportunity triage card
Sections:
- BLUF
- Opportunity snapshot
- Why this fits
- Why this may not fit
- Recommendation
- Confidence
- Key deadlines and follow-up
- Sources

## 11. Example Use Case

### Example A: OIG contract closeout audit
An HHS OIG report posted in November 2025 found that, in a sample of 50 CMS contracts eligible for closeout, CMS failed one or more administrative closeout requirements for every contract reviewed; 12 contracts totaling $2.1 billion were overdue at audit close, and OIG recommended both completing overdue closeouts and strengthening policies and procedures.

Desired system behavior:
- classify this as high relevance
- identify acquisition operations and internal controls as the problem space
- suggest AI-supported document classification, extraction, reconciliation, and evidence packaging as a plausible solution space
- flag that financial accuracy and traceability are mandatory
- produce a one-pager suitable for Sutton to edit and send internally

## 12. Success Metrics

### MVP adoption metrics
- % of generated artifacts Sutton opens
- % of generated artifacts Sutton rates as worth reading
- % of artifacts forwarded to executive stakeholders
- average time saved per reviewed item

### Quality metrics
- precision of relevance classification
- precision of “worth review” recommendation
- citation coverage rate
- hallucination/error rate
- false-positive rate for executive escalation

### Business outcome metrics
- number of greenfield ideas discussed with leadership
- number of ideas converted into internal solution concepts or demos
- number of SAM notices surfaced that progress to deeper review
- number of high-confidence skips that save manual time

## 13. UX Requirements

The output must be:
- Markdown-first
- easy to copy into Google Docs, email, or Slack
- short enough for executive scanning
- consistent in structure
- explicit about uncertainty
- free of “AI voice”

A future UI may include:
- queue of new signals
- filters by source, topic, score, and status
- thumbs up/down feedback loop
- saved Bellese fit profile editor
- one-click export to Doc or email draft

## 14. Data Sources

### MVP sources
- HHS OIG CMS report listings and individual report pages
- GAO reports and testimonies listings and feeds
- SAM.gov CMS opportunity listings and linked notices

## 15. Proposed Workflow

### Module A workflow
1. Poll source
2. Detect new report
3. Extract metadata and text
4. Classify relevance
5. Generate issue summary
6. Generate solution hypotheses
7. Score AI fit and Bellese-adjacent opportunity
8. Produce Markdown one-pager
9. Route to Sutton for review

### Module B workflow
1. Poll SAM CMS search
2. Detect new or updated notice
3. Fetch notice package
4. Extract metadata and scope
5. Compare against Bellese fit profile
6. Score recommendation
7. Produce triage summary
8. Route to Sutton for review

## 16. Architecture Approach

### Likely components
- source polling service
- parser and content normalizer
- document store
- LLM analysis layer
- rules engine for Bellese fit
- template renderer for Markdown outputs
- notification layer to Slack or email

### Design principle
Use **hybrid scoring**, not LLM-only scoring.

That means:
- deterministic rules for source, due date, contract type, known keywords
- structured capability matching against Bellese profile
- LLM summarization and hypothesis generation
- final confidence score derived from both

This matters because pure LLM scoring will be too unstable for go/no-go style decisions.

## 17. Risks and Mitigations

### Risk 1: Hallucinated recommendations
**Mitigation:** Require citations for all substantive claims. Store source excerpts.

### Risk 2: False confidence
**Mitigation:** Separate confidence in source extraction from confidence in business recommendation.

### Risk 3: Bellese fit model gets stale
**Mitigation:** Add lightweight admin editing for strengths, gaps, partner needs, and exclusions.

### Risk 4: Too many noisy outputs
**Mitigation:** Start with a narrow CMS scope and tune thresholds.

### Risk 5: AI solutioning becomes generic
**Mitigation:** Force output to answer:
- what exact problem exists,
- why AI is appropriate,
- what part should remain human,
- and what proof or precedent supports the concept.

## 18. Open Questions

- What exact threshold should trigger a “send to executive” recommendation?
- Should Module A propose only AI-enabled solutions, or any Bellese-relevant solution with AI as one option?
- For SAM, what are Bellese’s hard no-go signals?
- Should the product maintain separate fit profiles for:
  - Bellese solo
  - Bellese + partner
  - Bellese long-shot strategic plays?
- What is the preferred delivery mechanism for artifacts:
  - Slack
  - email
  - Google Doc
  - internal dashboard?

## 19. Recommended MVP Phasing

### Phase 1
Build Module A only:
- OIG + GAO ingestion
- CMS relevance classification
- one-pager generation
- manual Sutton review loop

### Phase 2
Add:
- feedback loop
- quality scoring
- reusable issue taxonomy
- executive-forward version formatting

### Phase 3
Build Module B:
- SAM ingestion
- Bellese fit model
- review/skip scoring
- alerting and dashboard

## 20. Assessment

The closeout use case is strong because it is a clean line from external pain signal to Bellese proof point to plausible AI-enabled concept. The SAM triage idea is also good, but it is more dependent on disciplined internal inputs than it may look. The hard part is not “read the notice.” The hard part is encoding Bellese’s real sweet spot, real gaps, partner strategy, and tolerance for stretch pursuits.

The right move is:
1. build the watchdog-to-one-pager engine first
2. prove you can generate trusted artifacts
3. then layer in opportunity triage once the fit model is explicit

## 21. Sources

- HHS OIG CMS report on contract closeout failures and recommendations: <https://oig.hhs.gov/reports/all/2025/cms-put-112-billion-at-risk-of-fraud-waste-and-abuse-by-not-properly-closing-contracts/>
- HHS OIG CMS reports listing page: <https://oig.hhs.gov/reports/all/?hhs-agency=CMS&issue-date=all#results>
- GAO reports and testimonies listing page: <https://www.gao.gov/reports-testimonies?f%5B0%5D=by_agency_name%3ADepartment%20of%20Health%20and%20Human%20Services>
- SAM.gov CMS search page: <https://sam.gov/search/?page=1&pageSize=25&sort=-modifiedDate&sfm%5BsimpleSearch%5D%5BkeywordRadio%5D=ALL&sfm%5Bstatus%5D%5Bis_active%5D=true&sfm%5BagencyPicker%5D%5B0%5D%5BorgKey%5D=100075508&sfm%5BagencyPicker%5D%5B0%5D%5BorgText%5D=7530%20-%20CENTERS%20FOR%20MEDICARE%20AND%20MEDICAID%20SERVICES&sfm%5BagencyPicker%5D%5B0%5D%5BlevelText%5D=Subtier&sfm%5BagencyPicker%5D%5B0%5D%5Bhighlighted%5D=true>
