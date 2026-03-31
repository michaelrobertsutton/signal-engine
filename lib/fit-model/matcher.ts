import type { BelleseProfile, Layer1Result, Layer2Result, FitModelResult } from './types';
import { SCORE_THRESHOLDS } from './types';
import { getNaicsWhitelist, getExclusionKeywords } from './profile';

// Points per domain match
const STRONG_DOMAIN_POINTS = 14; // 7 strong areas × 14 = 98 max from domain
const CONDITIONAL_DOMAIN_POINTS = 7;
const TECHNICAL_POINTS = 4;
const SCORE_CAP = 100;

// ─── Layer 1: Hard gates ──────────────────────────────────────────────────────

export function runLayer1(
  profile: BelleseProfile,
  item: {
    naicsCode?: string | null;
    valueMin?: number | null;
    valueMax?: number | null;
    dueDate?: Date | null;
    description?: string | null;
  },
): Layer1Result {
  const flags: string[] = [];

  // NAICS whitelist check
  const naicsWhitelist = getNaicsWhitelist(profile);
  if (item.naicsCode && naicsWhitelist.length > 0 && !naicsWhitelist.includes(item.naicsCode)) {
    return { passed: false, skipReason: `NAICS ${item.naicsCode} not in whitelist`, flags };
  }

  // Dollar range check
  const floor = profile.contract_preferences?.size_range?.floor;
  const ceiling = profile.contract_preferences?.size_range?.ceiling;
  if (floor !== undefined && item.valueMax !== null && item.valueMax !== undefined && item.valueMax < floor) {
    return { passed: false, skipReason: `Value $${item.valueMax.toLocaleString()} below floor $${floor.toLocaleString()}`, flags };
  }
  if (ceiling !== undefined && item.valueMin !== null && item.valueMin !== undefined && item.valueMin > ceiling) {
    return { passed: false, skipReason: `Value $${item.valueMin.toLocaleString()} above ceiling $${ceiling.toLocaleString()}`, flags };
  }

  // Exclusion keyword check (against description)
  const exclusions = getExclusionKeywords(profile);
  if (item.description && exclusions.length > 0) {
    const desc = item.description.toLowerCase();
    const hit = exclusions.find((kw) => desc.includes(kw.toLowerCase()));
    if (hit) {
      return { passed: false, skipReason: `Exclusion matched: "${hit}"`, flags };
    }
  }

  // Due date warning (doesn't kill)
  if (item.dueDate) {
    const daysUntilDue = (item.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysUntilDue < 14) {
      flags.push(`due_date_under_14_days (${Math.round(daysUntilDue)}d remaining)`);
    }
  }

  return { passed: true, flags };
}

// ─── Layer 2: Capability scoring ──────────────────────────────────────────────

export function runLayer2(
  profile: BelleseProfile,
  text: string,
): Layer2Result {
  const lower = text.toLowerCase();

  const domainMatches = [];
  const gapPenalties: string[] = [];

  // Strong domain matches
  for (const term of (profile.domain?.strong ?? [])) {
    if (lower.includes(term.toLowerCase())) {
      domainMatches.push({ term, strength: 'strong' as const, points: STRONG_DOMAIN_POINTS });
    }
  }

  // Conditional domain matches
  for (const term of (profile.domain?.conditional ?? [])) {
    const termBase = term.split('(')[0].trim().toLowerCase(); // strip "(needs X)" notes
    if (lower.includes(termBase)) {
      domainMatches.push({ term, strength: 'conditional' as const, points: CONDITIONAL_DOMAIN_POINTS });
      gapPenalties.push(`Conditional: ${term}`);
    }
  }

  // Technical capability matches
  const technicalMatches: string[] = [];
  for (const cap of (profile.capabilities?.technical ?? [])) {
    if (lower.includes(cap.toLowerCase())) {
      technicalMatches.push(cap);
    }
  }

  const domainScore = domainMatches.reduce((sum, m) => sum + m.points, 0);
  const techScore = technicalMatches.length * TECHNICAL_POINTS;
  const score = Math.min(SCORE_CAP, domainScore + techScore);

  return { score, domainMatches, technicalMatches, gapPenalties };
}

// ─── Final recommendation ─────────────────────────────────────────────────────

export function scoreToRecommendation(
  score: number,
): 'pursue' | 'review' | 'track' | 'skip' {
  if (score >= SCORE_THRESHOLDS.PURSUE) return 'pursue';
  if (score >= SCORE_THRESHOLDS.REVIEW) return 'review';
  if (score >= SCORE_THRESHOLDS.TRACK) return 'track';
  return 'skip';
}

// ─── Full fit model run ───────────────────────────────────────────────────────

export function runFitModel(
  profile: BelleseProfile,
  item: {
    naicsCode?: string | null;
    valueMin?: number | null;
    valueMax?: number | null;
    dueDate?: Date | null;
    description?: string | null;
  },
): FitModelResult {
  const layer1 = runLayer1(profile, item);

  if (!layer1.passed) {
    return {
      layer1,
      layer2: null,
      totalScore: 0,
      recommendation: 'skip',
      confidence: 'high', // hard gates are deterministic
    };
  }

  const layer2 = runLayer2(profile, item.description ?? '');

  const totalScore = layer2.score;
  const recommendation = scoreToRecommendation(totalScore);

  const hasStrongMatch = layer2.domainMatches.some((m) => m.strength === 'strong');
  const confidence = hasStrongMatch ? 'high' : layer2.domainMatches.length > 0 ? 'medium' : 'low';

  return { layer1, layer2, totalScore, recommendation, confidence };
}
