/**
 * @deprecated patternRecommendEngine 사용 — 하위 호환 re-export
 */
import type { AnalysisResult, CodeValueStatRow } from './analysisEngine';
import {
  appendDigitToInput,
  clampRecommendTopN,
  parseBidRateInput,
  pickChainStepDigit,
  pickTopRecommendCandidates,
  recommendDigitChain,
  recommendNextDigitStep,
  RECOMMEND_CHAIN_DEPTH_DEFAULT,
  RECOMMEND_TOP_N_DEFAULT,
  RECOMMEND_TOP_N_MAX,
  RECOMMEND_TOP_N_MIN,
  resolvePatternRecommendPath,
  type ParsedBidInput,
  type PatternRecommendHierarchy,
  type PatternRecommendPath,
  type RecommendChainResult,
  type RecommendDigitCandidate,
  type RecommendStepResult,
} from './patternRecommendEngine';

export type { DigitBand } from './patternRecommendEngine';
export {
  getDigitSubBand,
  getSubBandLabel,
  getDigitsInSubBand,
  getDigitsInMainBand,
} from './patternRecommendEngine';

export const NEXT_DIGIT_TOP_N = RECOMMEND_TOP_N_DEFAULT;
export const NEXT_DIGIT_TOP_N_MIN = RECOMMEND_TOP_N_MIN;
export const NEXT_DIGIT_TOP_N_MAX = RECOMMEND_TOP_N_MAX;
export const NEXT_DIGIT_DEFAULT_CHAIN_DEPTH = RECOMMEND_CHAIN_DEPTH_DEFAULT;

export type ParsedBidInput = ParsedBidInput;
export type NextDigitCandidate = RecommendDigitCandidate;
export type HierarchicalStepInfo = PatternRecommendHierarchy;
export type NextDigitStepResult = RecommendStepResult;
export type NextDigitChainResult = RecommendChainResult;

export type PatternPickStage = 'full';
export const PATTERN_PICK_STAGE_FULL: PatternPickStage = 'full';
export type DigitPickMode = PatternPickStage;

export function clampNextDigitTopN(value: number): number {
  return clampRecommendTopN(value);
}

export function getDigitBand(digit: number): 'low' | 'high' | null {
  if (!Number.isInteger(digit) || digit < 0 || digit > 9) return null;
  return digit <= 4 ? 'low' : 'high';
}

export function isDigitInBand(digit: number, band: 'low' | 'high'): boolean {
  return band === 'low' ? digit <= 4 : digit >= 5;
}

export type NextDigitSource = 'pattern';

export function countNextDigitsAfterPrefix(
  masterDigits: string,
  prefix: string,
): { counts: Map<number, number>; totalMatches: number } {
  const counts = new Map<number, number>();
  if (!masterDigits || prefix.length === 0) return { counts, totalMatches: 0 };

  let totalMatches = 0;
  const limit = masterDigits.length - prefix.length;
  for (let i = 0; i < limit; i += 1) {
    let matched = true;
    for (let j = 0; j < prefix.length; j += 1) {
      if (masterDigits[i + j] !== prefix[j]) {
        matched = false;
        break;
      }
    }
    if (!matched) continue;
    const nextChar = masterDigits[i + prefix.length];
    if (nextChar === undefined) continue;
    const d = Number(nextChar);
    if (!Number.isInteger(d)) continue;
    totalMatches += 1;
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  return { counts, totalMatches };
}

export function stageForComboIndex(_index: number): PatternPickStage {
  return 'full';
}

export function pickModeForComboIndex(_index: number): PatternPickStage {
  return 'full';
}

export function predictNextDigitStep(
  result: AnalysisResult,
  _codeStats: CodeValueStatRow[],
  prefix: string,
  topN: number = NEXT_DIGIT_TOP_N,
  _stage: PatternPickStage = 'full',
): NextDigitStepResult | null {
  void _codeStats;
  void _stage;
  const step = recommendNextDigitStep(result, prefix, topN);
  if (!step) return null;
  return {
    ...step,
    totalMatches: 0,
    source: 'pattern',
    stage: 'full',
    pickMode: 'full',
  };
}

export function pickTopCandidates(
  patternScores: Record<number, number>,
  topN: number = NEXT_DIGIT_TOP_N,
  allowedDigits?: readonly number[],
  prefix?: string,
): NextDigitCandidate[] {
  const pool =
    allowedDigits && allowedDigits.length > 0
      ? allowedDigits
      : Array.from({ length: 10 }, (_, d) => d);
  const path: PatternRecommendPath = {
    activeSide: 'low',
    targetMainBand: 'low',
    targetSubBand: 'lowLow',
    candidatePool: pool,
    digitScores: Object.fromEntries(pool.map((d) => [d, patternScores[d] ?? 0.1])),
    mainBandReasons: [],
    subBandReasons: [],
    digitReasons: [],
    activeMainCodes: [],
    activeSubDetailCodes: [],
  };
  return pickTopRecommendCandidates(path, topN, prefix ?? '');
}

export function predictDigitChain(
  result: AnalysisResult,
  codeStats: CodeValueStatRow[],
  input: string,
  options: { chainDepth?: number; topN?: number; extraSteps?: number } = {},
): NextDigitChainResult {
  const chain = recommendDigitChain(result, codeStats, input, options);
  return {
    ...chain,
    chainSteps: chain.chainSteps.map((s) => ({
      ...s,
      totalMatches: 0,
      source: 'pattern' as const,
      stage: 'full' as const,
      pickMode: 'full' as const,
    })),
    nextStep: chain.nextStep
      ? {
          ...chain.nextStep,
          totalMatches: 0,
          source: 'pattern',
          stage: 'full',
          pickMode: 'full',
        }
      : null,
  };
}

export {
  appendDigitToInput,
  parseBidRateInput,
  pickChainStepDigit,
  resolvePatternRecommendPath as resolvePatternRecommendationPath,
};

export type { PatternRecommendPath as PatternRecommendationPath };
