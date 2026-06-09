import { embed, cosineSimilarity } from 'ai';
import { google } from '@ai-sdk/google';
import type { CompanyProfile } from './types';

// Thresholds for mapping cosine similarity [-1,1] to score [0,100].
// Tunable constants — adjust after observing production similarity distributions.
const LOW_THRESHOLD = 0.35;   // below this → score 0
const HIGH_THRESHOLD = 0.82;  // above this → score 100

// Lambda-memory cache: recomputed only on cold start (profile is deploy-time constant)
let _profileEmbeddingCache: number[] | null = null;

export function clearEmbeddingCache(): void {
  _profileEmbeddingCache = null;
}

export function buildProfileSummary(profile: CompanyProfile): string {
  const parts: string[] = [];

  // Core identity
  const strongDomains = (profile.domain?.strong ?? []).join(', ');
  parts.push(
    `${profile.company ?? 'Bellese'} is a health IT consultancy specializing in ${profile.primary_agency ?? 'CMS'} digital modernization. Core areas: ${strongDomains}.`
  );

  // Adjacent domains (stripped of parenthetical notes)
  const conditional = (profile.domain?.conditional ?? [])
    .map((t) => t.split('(')[0].trim())
    .join(', ');
  if (conditional) {
    parts.push(`Adjacent capability areas: ${conditional}.`);
  }

  // Technical capabilities
  const tech = (profile.capabilities?.technical ?? []).join(', ');
  if (tech) {
    parts.push(`Technical capabilities: ${tech}.`);
  }

  // Proof points — richest signal, closest to procurement language
  for (const pp of (profile.capabilities?.proof_points ?? []).slice(0, 5)) {
    parts.push(`${pp.contract} (${pp.agency}): ${pp.description}`);
  }

  return parts.join('\n').slice(0, 1200);
}

export async function getProfileEmbedding(profile: CompanyProfile): Promise<number[]> {
  if (_profileEmbeddingCache) return _profileEmbeddingCache;

  const { embedding } = await embed({
    model: google.textEmbeddingModel('gemini-embedding-001'),
    value: buildProfileSummary(profile),
    maxRetries: 1,
  });

  _profileEmbeddingCache = embedding;
  return embedding;
}

export async function semanticScore(
  profile: CompanyProfile,
  text: string,
): Promise<number> {
  if (!text.trim()) return 0;

  const [profileEmb, docEmb] = await Promise.all([
    getProfileEmbedding(profile),
    embed({
      model: google.textEmbeddingModel('gemini-embedding-001'),
      value: text.slice(0, 3000), // stay well within token budget
      maxRetries: 1,
    }).then((r) => r.embedding),
  ]);

  const sim = cosineSimilarity(profileEmb, docEmb);
  const clamped = Math.max(0, sim);
  return Math.round(
    Math.min(100, Math.max(0, ((clamped - LOW_THRESHOLD) / (HIGH_THRESHOLD - LOW_THRESHOLD)) * 100))
  );
}
