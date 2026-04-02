// Shared types for the fit model and analysis pipeline

export interface Layer1Result {
  passed: boolean;
  skipReason?: string;
  flags: string[]; // warnings that don't kill (e.g. 'due_date_under_14_days')
}

export interface DomainMatch {
  term: string;
  strength: 'strong' | 'conditional';
  points: number;
}

export interface Layer2Result {
  score: number; // 0-100
  domainMatches: DomainMatch[];
  technicalMatches: string[];
  gapPenalties: string[];
  scoringMethod?: 'semantic' | 'keyword';
}

export interface FitModelResult {
  layer1: Layer1Result;
  layer2: Layer2Result | null; // null if layer1 failed
  totalScore: number; // 0-100
  recommendation: 'pursue' | 'review' | 'track' | 'skip';
  confidence: 'high' | 'medium' | 'low';
}

// Score thresholds
export const SCORE_THRESHOLDS = {
  PURSUE: 85,
  REVIEW: 75,
  TRACK: 50,
  // below 50 = skip
} as const;

// bellese-profile.yaml shape (after parsing)
export interface BelleseProfile {
  version: string;
  company: string;
  primary_agency: string;
  domain: {
    strong: string[];
    conditional: string[];
    exclusions: string[];
  };
  capabilities: {
    technical: string[];
    proof_points: ProofPoint[];
  };
  contract_preferences: {
    size_range: { floor: number; ceiling: number };
    preferred_types: string[];
    naics_whitelist: (string | number)[];
  };
  partner_needs: string[];
  scoring_weights: {
    strategic_fit: number;
    capability_fit: number;
    competitiveness: number;
  };
  profile_complete: boolean; // derived — not in YAML
}

export interface ProofPoint {
  contract: string;
  agency: string;
  description: string;
}
