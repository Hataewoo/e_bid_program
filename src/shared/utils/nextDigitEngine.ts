import type { AnalysisResult, CodeValueStatRow } from './analysisEngine';
import {
  resolvePatternRecommendationPath,
  PATTERN_PICK_STAGE_FULL,
  type PatternPickStage,
} from './codeValueFlowEngine';
import {
  getMainBandLabel,
  getSubBandLabel,
  type DigitBand,
  type DigitSubBand,
} from './digitSubBand';

export type { DigitBand } from './digitSubBand';
export {
  getDigitSubBand,
  getSubBandLabel,
  getDigitsInSubBand,
  getDigitsInMainBand,
} from './digitSubBand';

export const NEXT_DIGIT_TOP_N = 4;
export const NEXT_DIGIT_TOP_N_MIN = 1;
export const NEXT_DIGIT_TOP_N_MAX = 10;
export const NEXT_DIGIT_DEFAULT_CHAIN_DEPTH = 4;
const DISTRIBUTION_SHARPNESS = 1.45;

/** @deprecated PatternPickStage 사용 */
export type DigitPickMode = PatternPickStage;
export type { PatternPickStage };

export interface ParsedBidInput {
  integerPart: string | null;
  decimalPrefix: string;
  displayValue: string;
}

export interface NextDigitCandidate {
  digit: number;
  probability: number;
  matchCount: number;
}

export type NextDigitSource = 'pattern';

export interface HierarchicalStepInfo {
  targetMainBand: DigitBand;
  targetSubBand: DigitSubBand;
  stage: PatternPickStage;
  allowedDigits: readonly number[];
  mainBandLabel: string;
  subBandLabel: string;
  mainBandReasons: string[];
  subBandReasons: string[];
  activeMainCodes: string[];
  activeSubDetailCodes: string[];
  digitReasons: string[];
}

export function getDigitBand(digit: number): DigitBand | null {
  if (!Number.isInteger(digit) || digit < 0 || digit > 9) return null;
  if (digit <= 4) return 'low';
  return 'high';
}

export function isDigitInBand(digit: number, band: DigitBand): boolean {
  return band === 'low' ? digit <= 4 : digit >= 5;
}

export interface NextDigitStepResult {
  position: number;
  prefix: string;
  candidates: NextDigitCandidate[];
  totalMatches: number;
  source: NextDigitSource;
  stage: PatternPickStage;
  /** @deprecated stage 사용 */
  pickMode: PatternPickStage;
  hierarchy: HierarchicalStepInfo;
}

export interface NextDigitChainResult {
  parsed: ParsedBidInput;
  nextStep: NextDigitStepResult | null;
  recommendedCombo: string;
  chainSteps: NextDigitStepResult[];
  /** 4자리 조합의 패턴 경로 요약 (중복 표시 방지) */
  pathSummary: HierarchicalStepInfo | null;
  suggestedChain: string;
  suggestedDisplay: string;
}

const EMPTY_PROBS: Record<number, number> = Object.fromEntries(
  Array.from({ length: 10 }, (_, d) => [d, 10]),
) as Record<number, number>;

export function clampNextDigitTopN(value: number): number {
  const n = Number.isFinite(value) ? Math.trunc(value) : NEXT_DIGIT_TOP_N;
  return Math.min(NEXT_DIGIT_TOP_N_MAX, Math.max(NEXT_DIGIT_TOP_N_MIN, n));
}

export function parseBidRateInput(raw: string): ParsedBidInput {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { integerPart: null, decimalPrefix: '', displayValue: '' };
  }

  const dotIndex = trimmed.indexOf('.');
  if (dotIndex >= 0) {
    const intRaw = trimmed.slice(0, dotIndex).replace(/\D/g, '');
    const decRaw = trimmed.slice(dotIndex + 1).replace(/\D/g, '');
    const integerPart = intRaw.length > 0 ? intRaw : null;
    const displayValue =
      integerPart !== null ? `${integerPart}.${decRaw}` : decRaw.length > 0 ? `xx.${decRaw}` : '';
    return { integerPart, decimalPrefix: decRaw, displayValue };
  }

  const digitsOnly = trimmed.replace(/\D/g, '');
  return {
    integerPart: null,
    decimalPrefix: digitsOnly,
    displayValue: digitsOnly,
  };
}

export function countNextDigitsAfterPrefix(
  masterDigits: string,
  prefix: string,
): { counts: Map<number, number>; totalMatches: number } {
  const counts = new Map<number, number>();
  if (!masterDigits || prefix.length === 0) {
    return { counts, totalMatches: 0 };
  }

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

    const digit = Number(nextChar);
    if (!Number.isInteger(digit) || digit < 0 || digit > 9) continue;

    totalMatches += 1;
    counts.set(digit, (counts.get(digit) ?? 0) + 1);
  }

  return { counts, totalMatches };
}

function sharpenScores(scores: Record<number, number>): Record<number, number> {
  const out: Record<number, number> = {};
  for (const [key, value] of Object.entries(scores)) {
    const d = Number(key);
    out[d] = value <= 0 ? 0 : value ** DISTRIBUTION_SHARPNESS;
  }
  return out;
}

function scoresToProbabilities(scores: Record<number, number>): Record<number, number> {
  const sum = Object.values(scores).reduce((a, b) => a + b, 0);
  if (sum <= 0) return {};
  const out: Record<number, number> = {};
  for (const [key, value] of Object.entries(scores)) {
    out[Number(key)] = Math.round((value / sum) * 1000) / 10;
  }
  return out;
}

function scorePatternCandidates(
  pool: readonly number[],
  digitScores: Record<number, number>,
): Record<number, number> {
  if (pool.length === 0) return {};

  const raw: Record<number, number> = {};
  for (const d of pool) {
    raw[d] = Math.max(digitScores[d] ?? 0.1, 1e-4);
  }

  return scoresToProbabilities(sharpenScores(raw));
}

export function stageForComboIndex(comboIndex: number): PatternPickStage {
  void comboIndex;
  return PATTERN_PICK_STAGE_FULL;
}

/** @deprecated 모든 자리 full 경로 */
export function pickModeForComboIndex(comboIndex: number): PatternPickStage {
  void comboIndex;
  return PATTERN_PICK_STAGE_FULL;
}

function pathToHierarchy(path: ReturnType<typeof resolvePatternRecommendationPath>): HierarchicalStepInfo {
  return {
    targetMainBand: path.targetMainBand,
    targetSubBand: path.targetSubBand,
    stage: path.stage,
    allowedDigits: path.candidatePool,
    mainBandLabel: getMainBandLabel(path.targetMainBand),
    subBandLabel: getSubBandLabel(path.targetSubBand),
    mainBandReasons: path.mainBandReasons,
    subBandReasons: path.subBandReasons,
    activeMainCodes: path.activeMainCodes,
    activeSubDetailCodes: path.activeSubDetailCodes,
    digitReasons: path.digitReasons,
  };
}

export function computeNextDigitProbabilities(
  result: AnalysisResult,
  prefix: string,
  stage: PatternPickStage = PATTERN_PICK_STAGE_FULL,
): {
  probabilities: Record<number, number>;
  source: NextDigitSource;
  hierarchy: HierarchicalStepInfo;
} {
  const emptyHierarchy: HierarchicalStepInfo = {
    targetMainBand: 'low',
    targetSubBand: 'lowHigh',
    stage,
    allowedDigits: [],
    mainBandLabel: getMainBandLabel('low'),
    subBandLabel: getSubBandLabel('lowHigh'),
    mainBandReasons: [],
    subBandReasons: [],
    activeMainCodes: [],
    activeSubDetailCodes: [],
    digitReasons: [],
  };

  if (result.totalCount === 0) {
    return {
      probabilities: { ...EMPTY_PROBS },
      source: 'pattern',
      hierarchy: emptyHierarchy,
    };
  }

  const path = resolvePatternRecommendationPath(result, prefix, stage);
  const hierarchy = pathToHierarchy(path);
  const probabilities = scorePatternCandidates(path.candidatePool, path.digitScores);

  return {
    probabilities,
    source: 'pattern',
    hierarchy,
  };
}

export function pickTopCandidates(
  probabilities: Record<number, number>,
  topN: number = NEXT_DIGIT_TOP_N,
  allowedDigits?: readonly number[],
): NextDigitCandidate[] {
  const pool =
    allowedDigits && allowedDigits.length > 0
      ? allowedDigits
      : Array.from({ length: 10 }, (_, d) => d);

  const candidates: NextDigitCandidate[] = pool.map((d) => ({
    digit: d,
    probability: probabilities[d] ?? 0,
    matchCount: 0,
  }));

  return candidates
    .filter((c) => c.probability > 0)
    .sort((a, b) => b.probability - a.probability || a.digit - b.digit)
    .slice(0, Math.min(topN, pool.length));
}

export function predictNextDigitStep(
  result: AnalysisResult,
  _codeStats: CodeValueStatRow[],
  prefix: string,
  topN: number = NEXT_DIGIT_TOP_N,
  stage: PatternPickStage = PATTERN_PICK_STAGE_FULL,
): NextDigitStepResult | null {
  if (result.totalCount === 0) return null;

  const { probabilities, source, hierarchy } = computeNextDigitProbabilities(
    result,
    prefix,
    stage,
  );

  return {
    position: prefix.length + 1,
    prefix,
    candidates: pickTopCandidates(probabilities, topN, hierarchy.allowedDigits),
    totalMatches: 0,
    source,
    stage,
    pickMode: stage,
    hierarchy,
  };
}

function formatDisplayValue(parsed: ParsedBidInput, decimalSuffix: string): string {
  const fullDecimal = parsed.decimalPrefix + decimalSuffix;
  if (parsed.integerPart !== null) {
    return `${parsed.integerPart}.${fullDecimal}`;
  }
  if (fullDecimal.length === 0) return '';
  return `xx.${fullDecimal}`;
}

export function predictDigitChain(
  result: AnalysisResult,
  codeStats: CodeValueStatRow[],
  input: string,
  options: {
    chainDepth?: number;
    topN?: number;
    extraSteps?: number;
  } = {},
): NextDigitChainResult {
  const chainDepth = options.chainDepth ?? NEXT_DIGIT_DEFAULT_CHAIN_DEPTH;
  const topN = clampNextDigitTopN(options.topN ?? NEXT_DIGIT_TOP_N);
  const extraSteps = options.extraSteps ?? 0;
  const parsed = parseBidRateInput(input);

  const nextStep = predictNextDigitStep(
    result,
    codeStats,
    parsed.decimalPrefix,
    topN,
    PATTERN_PICK_STAGE_FULL,
  );

  const chainSteps: NextDigitStepResult[] = [];
  let workingPrefix = parsed.decimalPrefix;
  const totalSteps = chainDepth + extraSteps;

  for (let step = 0; step < totalSteps; step += 1) {
    const stepResult = predictNextDigitStep(
      result,
      codeStats,
      workingPrefix,
      topN,
      PATTERN_PICK_STAGE_FULL,
    );
    if (!stepResult || stepResult.candidates.length === 0) break;

    chainSteps.push(stepResult);
    const best = stepResult.candidates[0];
    if (!best) break;
    workingPrefix += String(best.digit);
  }

  const chainSuffix = workingPrefix.slice(parsed.decimalPrefix.length);
  const recommendedCombo = chainSuffix.slice(0, chainDepth);
  const suggestedDisplay = formatDisplayValue(parsed, chainSuffix);

  const pathSummary =
    chainSteps.length > 0
      ? {
          ...chainSteps[0]!.hierarchy,
          activeSubDetailCodes: [
            ...new Set(chainSteps.flatMap((s) => s.hierarchy.activeSubDetailCodes)),
          ],
          digitReasons: chainSteps[0]!.hierarchy.digitReasons,
        }
      : null;

  return {
    parsed,
    nextStep,
    recommendedCombo,
    chainSteps,
    pathSummary,
    suggestedChain: workingPrefix,
    suggestedDisplay,
  };
}

export function appendDigitToInput(currentInput: string, digit: number): string {
  const parsed = parseBidRateInput(currentInput);
  const nextDecimal = `${parsed.decimalPrefix}${digit}`;

  if (parsed.integerPart !== null) {
    return `${parsed.integerPart}.${nextDecimal}`;
  }
  if (currentInput.includes('.')) {
    return `xx.${nextDecimal}`;
  }
  return nextDecimal;
}
