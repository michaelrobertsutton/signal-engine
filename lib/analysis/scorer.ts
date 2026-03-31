import { generateText } from 'ai';
import { z } from 'zod';
import { loadProfile } from '@/lib/fit-model/profile';
import { runFitModel } from '@/lib/fit-model/matcher';
import { insertArtifact, markOpportunityStatus, markReportStatus, logEvent } from '@/lib/db/queries';
import type { Opportunity, Report } from '@/lib/db/queries';

// Zod schema for LLM output
const LlmOutputSchema = z.object({
  bluf: z.string().min(10).max(500),
  solution_hypothesis: z.string().min(10).max(1000),
  citations: z.array(z.object({
    claim: z.string(),
    source_url: z.string().url().optional(),
  })).optional(),
  confidence_notes: z.string().optional(),
});

type LlmOutput = z.infer<typeof LlmOutputSchema>;

const CONSECUTIVE_FAILURE_THRESHOLD = 3;
let consecutiveFailures = 0; // resets on successful run

async function callLlm(prompt: string, model: string): Promise<LlmOutput> {
  const { text } = await generateText({
    model: model as Parameters<typeof generateText>[0]['model'],
    prompt,
  });

  // Strip markdown code fences if present
  const cleaned = text.replace(/^```json\s*/m, '').replace(/\s*```$/m, '').trim();
  const parsed = JSON.parse(cleaned);
  return LlmOutputSchema.parse(parsed);
}

function buildPrompt(
  itemType: 'opportunity' | 'report',
  title: string,
  content: string,
  fitResult: ReturnType<typeof runFitModel>,
  profileVersion: string,
): string {
  const profile = loadProfile();
  const proofPoints = (profile.capabilities?.proof_points ?? [])
    .slice(0, 5)
    .map((p) => `- ${p.contract} (${p.agency}): ${p.description}`)
    .join('\n');

  const matchedDomains = fitResult.layer2?.domainMatches.map((m) => m.term).join(', ') || 'none';

  return `You are a growth analyst for ${profile.company}, a health IT consultancy focused on ${profile.primary_agency ?? 'CMS'}.

ITEM TYPE: ${itemType}
TITLE: ${title}
CONTENT:
${content.slice(0, 4000)}

FIT MODEL RESULT:
- Score: ${fitResult.totalScore}/100
- Recommendation: ${fitResult.recommendation}
- Matched domain areas: ${matchedDomains}

BELLESE PROOF POINTS (use these for concreteness):
${proofPoints}

Return a JSON object with these exact fields:
{
  "bluf": "1-2 sentence bottom line — what this ${itemType} is and why it matters to Bellese",
  "solution_hypothesis": "Specific hypothesis for how Bellese could win or add value. Name the technology, approach, or past work. Do not write generic AI pitches.",
  "citations": [{"claim": "key factual claim", "source_url": "URL if available"}],
  "confidence_notes": "Optional: note if you had to infer anything or if the content was thin"
}

Rules:
- bluf must be specific to THIS ${itemType}, not generic
- solution_hypothesis must name real Bellese capabilities, not vague offers
- Every factual claim (dollar amounts, deadlines, agency names) must appear in a citation
- Do not hallucinate agency names, contract numbers, or statistics`;
}

export async function analyzeOpportunity(opp: Opportunity): Promise<void> {
  await markOpportunityStatus(opp.id, 'analyzing');
  const profile = loadProfile();
  const fitResult = runFitModel(profile, {
    naicsCode: opp.naicsCode,
    valueMin: opp.valueMin,
    valueMax: opp.valueMax,
    dueDate: opp.dueDate ?? undefined,
    description: opp.description,
  });

  if (!fitResult.layer1.passed) {
    await markOpportunityStatus(opp.id, 'skipped', fitResult.layer1.skipReason);
    return;
  }

  const prompt = buildPrompt(
    'opportunity',
    opp.title,
    opp.description ?? '',
    fitResult,
    profile.version,
  );

  let llmOutput: LlmOutput | null = null;
  let usedFallback = false;

  // Attempt 1: primary model
  try {
    llmOutput = await callLlm(prompt, 'anthropic/claude-sonnet-4.6');
    consecutiveFailures = 0;
  } catch {
    // Attempt 2: fallback model with tighter prompt
    try {
      llmOutput = await callLlm(prompt + '\n\nIMPORTANT: Return only valid JSON, nothing else.', 'anthropic/claude-haiku-4.5');
      consecutiveFailures = 0;
      usedFallback = true;
    } catch (err2) {
      consecutiveFailures++;
      await logEvent('llm_failure', { opportunityId: opp.id, error: String(err2), consecutive: consecutiveFailures }, 'sam_gov');
      if (consecutiveFailures >= CONSECUTIVE_FAILURE_THRESHOLD) {
        await logEvent('llm_consecutive_failures', { count: consecutiveFailures }, 'analysis');
      }
      await markOpportunityStatus(opp.id, 'failed');
      return;
    }
  }

  await insertArtifact({
    sourceType: 'opportunity',
    sourceId: opp.id,
    artifactType: 'triage_card',
    bluf: llmOutput.bluf,
    score: fitResult.totalScore,
    recommendation: fitResult.recommendation,
    confidence: usedFallback ? 'low' : fitResult.confidence,
    solutionHypothesis: llmOutput.solution_hypothesis,
    layer1Result: fitResult.layer1 as unknown as Record<string, unknown>,
    layer2Result: fitResult.layer2 as unknown as Record<string, unknown>,
    llmOutput: llmOutput as unknown as Record<string, unknown>,
    profileVersion: profile.version,
  });

  await markOpportunityStatus(opp.id, 'analyzed');
}

export async function analyzeReport(report: Report): Promise<void> {
  await markReportStatus(report.id, 'analyzing');
  const profile = loadProfile();

  // Reports don't go through Layer 1 (no NAICS/value data); score LLM-first
  const fitResult = runFitModel(profile, { description: report.content });

  const prompt = buildPrompt(
    'report',
    report.title,
    report.content ?? '',
    fitResult,
    profile.version,
  );

  let llmOutput: LlmOutput | null = null;
  let usedFallback = false;

  try {
    llmOutput = await callLlm(prompt, 'anthropic/claude-sonnet-4.6');
    consecutiveFailures = 0;
  } catch {
    try {
      llmOutput = await callLlm(prompt + '\n\nIMPORTANT: Return only valid JSON, nothing else.', 'anthropic/claude-haiku-4.5');
      consecutiveFailures = 0;
      usedFallback = true;
    } catch (err2) {
      consecutiveFailures++;
      await logEvent('llm_failure', { reportId: report.id, error: String(err2), consecutive: consecutiveFailures }, report.source);
      if (consecutiveFailures >= CONSECUTIVE_FAILURE_THRESHOLD) {
        await logEvent('llm_consecutive_failures', { count: consecutiveFailures }, 'analysis');
      }
      await markReportStatus(report.id, 'failed');
      return;
    }
  }

  await insertArtifact({
    sourceType: 'report',
    sourceId: report.id,
    artifactType: 'one_pager',
    bluf: llmOutput.bluf,
    score: fitResult.totalScore,
    recommendation: fitResult.recommendation,
    confidence: usedFallback ? 'low' : fitResult.confidence,
    solutionHypothesis: llmOutput.solution_hypothesis,
    layer1Result: fitResult.layer1 as unknown as Record<string, unknown>,
    layer2Result: fitResult.layer2 as unknown as Record<string, unknown>,
    llmOutput: llmOutput as unknown as Record<string, unknown>,
    profileVersion: profile.version,
  });

  await markReportStatus(report.id, 'analyzed');
}
