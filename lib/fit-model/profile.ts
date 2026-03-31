import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import type { BelleseProfile } from './types';

const PROFILE_PATH = path.join(process.cwd(), 'config', 'bellese-profile.yaml');

let cached: BelleseProfile | null = null;

export function loadProfile(): BelleseProfile {
  if (cached) return cached;

  const raw = fs.readFileSync(PROFILE_PATH, 'utf8');
  const data = yaml.load(raw) as Record<string, unknown>;

  // Required field checks
  if (!data.version) throw new Error('bellese-profile.yaml: missing required field "version"');
  if (!data.company) throw new Error('bellese-profile.yaml: missing required field "company"');
  if (!data.domain) throw new Error('bellese-profile.yaml: missing required field "domain"');
  if (!data.contract_preferences) throw new Error('bellese-profile.yaml: missing required field "contract_preferences"');
  if (!data.capabilities) throw new Error('bellese-profile.yaml: missing required field "capabilities"');

  const profile = data as unknown as BelleseProfile;

  // Completeness warnings
  const warnings: string[] = [];
  const exclusions = profile.domain?.exclusions ?? [];
  const proofPoints = profile.capabilities?.proof_points ?? [];

  if (exclusions.length === 0) {
    warnings.push('domain.exclusions is empty — Layer 1 keyword kill is disabled');
  }
  if (proofPoints.length === 0) {
    warnings.push('capabilities.proof_points is empty — LLM scoring will lack concrete examples');
  }

  profile.profile_complete = warnings.length === 0;

  if (warnings.length > 0) {
    console.warn('[profile] Incomplete profile:', warnings);
  }

  cached = profile;
  return profile;
}

// Helpers for code that needs normalized values
export function getNaicsWhitelist(profile: BelleseProfile): string[] {
  return (profile.contract_preferences?.naics_whitelist ?? []).map(String);
}

export function getExclusionKeywords(profile: BelleseProfile): string[] {
  return profile.domain?.exclusions ?? [];
}

// Call during tests to reset the cache
export function clearProfileCache() {
  cached = null;
}
