/**
 * Digit prediction score weights — single source of truth.
 * Legacy alone must not override all other signals.
 */

export const DIGIT_PREDICTION_WEIGHTS = {
  /** 10-pattern prediction signals — direction tier (per-pattern reliability scales contribution) */
  patternSignal: 4.0,
  /** Per-pattern confidence cap (0–1 scaled) before summing */
  patternSignalMaxPerPattern: 1.0,
  /** Max total pattern-signal contribution per digit (anti-stacking) */
  patternSignalPerDigitCap: 20,

  /** SubBand soft gating */
  subBandMatchBonus: 18,
  sameMainSiblingPenalty: -6,
  oppositeMainPenalty: -14,

  /** MainBand soft gating */
  mainBandMatchBonus: 10,
  mainBandMismatchPenalty: -8,

  /** Pattern Flow (S″ source digit run / alternation) */
  patternFlow: 2.5,
  patternFlowMaxPerDigit: 20,

  /** Legacy code content signal — slightly reduced vs v1.2.5 walk-forward conflict analysis */
  legacy: 1.35,
  /** Legacy cannot exceed this share of non-penalty positive score alone */
  legacyAbsoluteCap: 19,

  /** Anchor repeat — low influence reference only */
  anchorRepeat: 0.8,
  anchorTransition: 0.5,

  /** Agreement bonus when Legacy + Pattern Flow + patterns align on same digit */
  multiSignalAgreementBonus: 6,

  /** Blocked pattern-value digit mapping */
  blockedDigitPenalty: -40,
  /** Repetitive prefix pattern (2323, 111…) */
  repetitivePrefixPenalty: -25,
} as const;

/** Conditional gating — fixed multipliers only (no grid search). */
export const CONDITIONAL_GATING = {
  patternFlowMultAgree: 1.0,
  patternFlowMultConflict: 0.5,
  patternFlowMultUncertain: 1.0,
  patternFlowMultSwitchRepeat: 0.5,
  patternStateConfidentThreshold: 0.5,
  patternStateUncertainThreshold: 0.4,
  bandSwitchConfThreshold: 0.5,
} as const;

/**
 * Walk-forward predictive skill multipliers (418 positions, phase prediction).
 * NOT digit frequency — measures next PatternState prediction quality only.
 */
export const PATTERN_RELIABILITY: Record<string, number> = {
  /** 3,4+α — phase 88.2%, reliability 0.408 */
  plusAlpha_3_2: 1.0,
  /** 1중복 — phase 100%, low coverage → capped */
  oneDuplicate: 0.72,
  /** 2,3+α — phase 73.2% */
  commaAlpha_2_3: 0.72,
  /** 4,5+α — phase 76.0% */
  plusAlpha_4_3: 0.55,
  /** 4+α,3 — phase 100%, very low coverage */
  alphaPlus_4_3: 0.35,
  /** 1사이 — rare, independent band signal */
  oneBetween: 0.28,
  /** 3+α,2 — phase 42.9%, weak */
  alphaPlus_3_2: 0.08,
  /** 5+α,4 — rarely fires */
  plusAlpha_4_4: 0.05,
  /** 3이상 / 5이상 — near-zero until phase logic re-validated */
  threeOrMore: 0.03,
  fiveOrMore: 0.03,
};

/** Hard confidence cap for low-skill patterns (baseline-protect). */
export const PATTERN_RELIABILITY_CONFIDENCE_CAP: Record<string, number> = {
  threeOrMore: 0.25,
  fiveOrMore: 0.25,
  alphaPlus_3_2: 0.35,
  plusAlpha_4_4: 0.3,
};

/** @deprecated use PATTERN_RELIABILITY — kept for pointValuesCodeFlow reference only */
export const PATTERN_FIELD_WEIGHTS: Record<string, number> = {
  oneDuplicate: PATTERN_RELIABILITY.oneDuplicate!,
  commaAlpha_2_3: PATTERN_RELIABILITY.commaAlpha_2_3!,
  plusAlpha_3_2: PATTERN_RELIABILITY.plusAlpha_3_2!,
  plusAlpha_4_3: PATTERN_RELIABILITY.plusAlpha_4_3!,
  plusAlpha_4_4: PATTERN_RELIABILITY.plusAlpha_4_4!,
  threeOrMore: PATTERN_RELIABILITY.threeOrMore!,
  fiveOrMore: PATTERN_RELIABILITY.fiveOrMore!,
  oneBetween: PATTERN_RELIABILITY.oneBetween!,
  alphaPlus_3_2: PATTERN_RELIABILITY.alphaPlus_3_2!,
  alphaPlus_4_3: PATTERN_RELIABILITY.alphaPlus_4_3!,
};

/** Redundant signal clusters — diminishing return when same phase predicted */
export const PATTERN_REDUNDANCY_CLUSTERS = {
  betweenMarker: [
    'commaAlpha_2_3',
    'plusAlpha_3_2',
    'plusAlpha_4_3',
    'plusAlpha_4_4',
    'alphaPlus_3_2',
    'alphaPlus_4_3',
  ],
  countThreshold: ['threeOrMore', 'fiveOrMore'],
} as const;

/** N-th signal within same cluster+phase: 1, 0.5, 0.25, … */
export const CLUSTER_DIMINISHING_FACTOR = 0.5;

export function getPatternClusterId(field: string): keyof typeof PATTERN_REDUNDANCY_CLUSTERS | null {
  for (const [id, fields] of Object.entries(PATTERN_REDUNDANCY_CLUSTERS) as Array<
    [keyof typeof PATTERN_REDUNDANCY_CLUSTERS, readonly string[]]
  >) {
    if (fields.includes(field)) return id;
  }
  return null;
}

export function patternReliabilityMultiplier(field: string): number {
  return PATTERN_RELIABILITY[field] ?? 0.5;
}

export function patternReliabilityConfidenceCap(field: string): number | undefined {
  return PATTERN_RELIABILITY_CONFIDENCE_CAP[field];
}
