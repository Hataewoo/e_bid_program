import type { AnalysisResult, CodeValueStatRow } from './analysisEngine';
import {
  aggregatePatternTransitions,
  hasPatternGraphSignal,
} from './digitPatternGraph';
import { buildProbabilityProfile, type ProbabilityDominantSide } from './probabilityEngine';

export const NEXT_DIGIT_TOP_N = 4;
export const NEXT_DIGIT_TOP_N_MIN = 1;
export const NEXT_DIGIT_TOP_N_MAX = 10;
export const NEXT_DIGIT_DEFAULT_CHAIN_DEPTH = 4;
const MIN_MATCHES_FOR_FULL_PREFIX = 3;
/** Sparse prefix — Laplace smoothing strength */
const LAPLACE_ALPHA = 0.35;
/** >1 spreads probability gaps (top candidates stand out more) */
const DISTRIBUTION_SHARPNESS = 1.45;
/** Extra weight when a digit leads prefix-match counts */
const LEAD_FREQUENCY_BONUS = 0.2;
/** Code stat digit boost cap (mirrors probabilityEngine) */
const CODE_DIGIT_BOOST_MAX = 0.12;

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

export type NextDigitSource = 'prefix' | 'blended' | 'global' | 'alternate' | 'pattern';

/** 5 기준: 0~4 저점, 6~9 고점 (5는 경계) */
export type DigitBand = 'low' | 'high';

export function getDigitBand(digit: number): DigitBand | null {
  if (!Number.isInteger(digit) || digit < 0 || digit > 9) return null;
  if (digit < 5) return 'low';
  if (digit > 5) return 'high';
  return null;
}

export function getOppositeBand(band: DigitBand): DigitBand {
  return band === 'low' ? 'high' : 'low';
}

export function isDigitInBand(digit: number, band: DigitBand): boolean {
  return band === 'low' ? digit < 5 : digit > 5;
}

function resolveTargetBandFromPrefix(prefix: string): DigitBand | null {
  if (!prefix) return null;
  const last = Number(prefix[prefix.length - 1]);
  if (!Number.isInteger(last) || last < 0 || last > 9) return null;
  const lastBand = getDigitBand(last);
  if (lastBand === null) return 'low';
  return getOppositeBand(lastBand);
}

function filterCountsToBand(
  counts: Map<number, number>,
  band: DigitBand,
): { counts: Map<number, number>; totalMatches: number } {
  const filtered = new Map<number, number>();
  let totalMatches = 0;
  for (let d = 0; d <= 9; d += 1) {
    if (!isDigitInBand(d, band)) continue;
    const c = counts.get(d) ?? 0;
    if (c <= 0) continue;
    filtered.set(d, c);
    totalMatches += c;
  }
  return { counts: filtered, totalMatches };
}

function filterGlobalProbsToBand(
  probs: Record<number, number>,
  band: DigitBand,
): Record<number, number> {
  const bandDigits = band === 'low' ? [0, 1, 2, 3, 4] : [6, 7, 8, 9];
  let sum = 0;
  const raw: Record<number, number> = {};
  for (const d of bandDigits) {
    raw[d] = probs[d] ?? 0;
    sum += raw[d];
  }
  if (sum <= 0) {
    const equal = 100 / bandDigits.length;
    return Object.fromEntries(bandDigits.map((d) => [d, equal])) as Record<number, number>;
  }
  const out: Record<number, number> = {};
  for (const d of bandDigits) {
    out[d] = Math.round(((raw[d] ?? 0) / sum) * 1000) / 10;
  }
  return out;
}

export interface NextDigitStepResult {
  position: number;
  prefix: string;
  candidates: NextDigitCandidate[];
  totalMatches: number;
  source: NextDigitSource;
}

export interface NextDigitChainResult {
  parsed: ParsedBidInput;
  /** Immediate next-digit step from current input */
  nextStep: NextDigitStepResult | null;
  /** Greedy chain: each step re-scans master with extended prefix */
  chainSteps: NextDigitStepResult[];
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

function buildCodeDigitBoost(codeStats: CodeValueStatRow[]): Record<number, number> {
  const boost: Record<number, number> = Object.fromEntries(
    Array.from({ length: 10 }, (_, d) => [d, 0]),
  ) as Record<number, number>;
  const top = [...codeStats].sort((a, b) => b.count - a.count).slice(0, 3);
  for (const row of top) {
    if (!row.code?.trim() || row.count <= 0) continue;
    const weight = Math.min(CODE_DIGIT_BOOST_MAX, row.percent / 250);
    for (const ch of row.code.replace(/\D/g, '')) {
      const d = Number(ch);
      if (!Number.isInteger(d) || d < 0 || d > 9) continue;
      boost[d] = (boost[d] ?? 0) + weight;
    }
  }
  return boost;
}

function prefixMatchWeight(totalMatches: number): number {
  if (totalMatches <= 0) return 0;
  return Math.min(0.85, totalMatches / (totalMatches + 1.5));
}

function resolveNextDigitSource(
  prefixWeight: number,
  totalMatches: number,
  alternate: boolean,
  patternActive: boolean,
): NextDigitSource {
  if (alternate && patternActive) return 'pattern';
  if (alternate) return 'alternate';
  if (patternActive && totalMatches >= MIN_MATCHES_FOR_FULL_PREFIX) return 'pattern';
  if (totalMatches <= 0) return 'global';
  if (totalMatches >= MIN_MATCHES_FOR_FULL_PREFIX && prefixWeight >= 0.7) return 'prefix';
  return 'blended';
}

function aggregatePrefixSignals(
  masterDigits: string,
  prefix: string,
): { counts: Map<number, number>; totalMatches: number } {
  if (!prefix) {
    return { counts: new Map(), totalMatches: 0 };
  }

  const combined = new Map<number, number>();
  let totalMatches = 0;

  for (let len = prefix.length; len >= 1; len -= 1) {
    const subPrefix = prefix.slice(prefix.length - len);
    const { counts, totalMatches: subTotal } = countNextDigitsAfterPrefix(masterDigits, subPrefix);
    if (subTotal <= 0) continue;

    const weight = (len / prefix.length) ** 2;
    totalMatches += subTotal;

    for (let d = 0; d <= 9; d += 1) {
      const c = counts.get(d) ?? 0;
      if (c <= 0) continue;
      combined.set(d, (combined.get(d) ?? 0) + c * weight);
    }

    if (len === prefix.length && subTotal >= MIN_MATCHES_FOR_FULL_PREFIX) break;
  }

  const rounded = new Map<number, number>();
  for (const [digit, score] of combined) {
    rounded.set(digit, Math.round(score * 100) / 100);
  }

  return { counts: rounded, totalMatches };
}

function applySideMultiplier(score: number, digit: number, side: ProbabilityDominantSide): number {
  if (side === 'balanced') return score;
  const isLow = digit <= 4;
  const match = side === 'low' ? isLow : !isLow;
  return match ? score * 1.08 : score;
}

function sharpenScores(scores: Record<number, number>): Record<number, number> {
  const out: Record<number, number> = {};
  for (let d = 0; d <= 9; d += 1) {
    const value = scores[d] ?? 0;
    out[d] = value <= 0 ? 0 : value ** DISTRIBUTION_SHARPNESS;
  }
  return out;
}

function scoresToProbabilities(scores: Record<number, number>): Record<number, number> {
  const sum = Object.values(scores).reduce((a, b) => a + b, 0);
  if (sum <= 0) return { ...EMPTY_PROBS };
  const out: Record<number, number> = {};
  for (let d = 0; d <= 9; d += 1) {
    out[d] = Math.round(((scores[d] ?? 0) / sum) * 1000) / 10;
  }
  return out;
}

function scoreNextDigitCandidates(
  counts: Map<number, number>,
  totalMatches: number,
  globalProbs: Record<number, number>,
  codeBoost: Record<number, number>,
  dominantSide: ProbabilityDominantSide,
  targetBand: DigitBand | null,
): Record<number, number> {
  const prefixW = prefixMatchWeight(totalMatches);
  const globalW = 1 - prefixW;
  const prefixDenom = totalMatches + (targetBand ? 4 : 10) * LAPLACE_ALPHA;
  const maxCount = totalMatches > 0 ? Math.max(...Array.from(counts.values()), 0) : 0;

  const raw: Record<number, number> = {};
  for (let d = 0; d <= 9; d += 1) {
    if (targetBand && !isDigitInBand(d, targetBand)) {
      raw[d] = 0;
      continue;
    }

    const matchCount = counts.get(d) ?? 0;

    const prefixScore =
      totalMatches > 0 ? (matchCount + LAPLACE_ALPHA) / prefixDenom : 0;
    const globalScore = (globalProbs[d] ?? 0) / 100;

    let score = prefixScore * prefixW + globalScore * globalW;

    if (matchCount > 0 && totalMatches > 0 && maxCount > 0) {
      const share = matchCount / totalMatches;
      const relativeLead = matchCount / maxCount;
      score += LEAD_FREQUENCY_BONUS * share * relativeLead;
    }

    score += codeBoost[d] ?? 0;
    if (!targetBand) {
      score = applySideMultiplier(score, d, dominantSide);
    }
    raw[d] = Math.max(score, 1e-4);
  }

  return scoresToProbabilities(sharpenScores(raw));
}

export function computeNextDigitProbabilities(
  result: AnalysisResult,
  codeStats: CodeValueStatRow[],
  prefix: string,
): { probabilities: Record<number, number>; counts: Map<number, number>; totalMatches: number; source: NextDigitSource } {
  const profile = buildProbabilityProfile(result, codeStats);
  const globalProbs = profile.digitProbability;
  const codeBoost = buildCodeDigitBoost(codeStats);
  const targetBand = resolveTargetBandFromPrefix(prefix);
  const bandGlobalProbs = targetBand ? filterGlobalProbsToBand(globalProbs, targetBand) : globalProbs;

  if (result.totalCount === 0) {
    return {
      probabilities: { ...EMPTY_PROBS },
      counts: new Map(),
      totalMatches: 0,
      source: 'global',
    };
  }

  const { counts, totalMatches } = countNextDigitsAfterPrefix(result.digits, prefix);
  const decimalPosition = prefix.length + 1;
  const pattern = aggregatePatternTransitions(
    result.digits,
    prefix,
    decimalPosition,
    targetBand,
  );

  let scoringCounts = pattern.counts;
  let scoringMatches = pattern.totalMatches;

  if (scoringMatches <= 0 && prefix.length > 0) {
    const aggregated = aggregatePrefixSignals(result.digits, prefix);
    scoringCounts = aggregated.counts;
    scoringMatches = aggregated.totalMatches;
  }

  const bandAggregated = targetBand
    ? filterCountsToBand(scoringCounts, targetBand)
    : { counts: scoringCounts, totalMatches: scoringMatches };
  const bandDisplay = targetBand ? filterCountsToBand(counts, targetBand) : { counts, totalMatches };

  const prefixW = prefixMatchWeight(bandAggregated.totalMatches);
  const patternActive = hasPatternGraphSignal(pattern);
  const source = resolveNextDigitSource(
    prefixW,
    bandAggregated.totalMatches,
    targetBand !== null,
    patternActive,
  );

  const probabilities = scoreNextDigitCandidates(
    bandAggregated.counts,
    bandAggregated.totalMatches,
    bandGlobalProbs,
    codeBoost,
    profile.dominantSide,
    targetBand,
  );

  return {
    probabilities,
    counts: bandDisplay.counts,
    totalMatches: bandDisplay.totalMatches,
    source,
  };
}

export function pickTopCandidates(
  probabilities: Record<number, number>,
  counts: Map<number, number>,
  topN: number = NEXT_DIGIT_TOP_N,
): NextDigitCandidate[] {
  const candidates: NextDigitCandidate[] = [];
  for (let d = 0; d <= 9; d += 1) {
    candidates.push({
      digit: d,
      probability: probabilities[d] ?? 0,
      matchCount: counts.get(d) ?? 0,
    });
  }
  return candidates
    .filter((c) => c.probability > 0)
    .sort((a, b) => b.probability - a.probability || b.matchCount - a.matchCount || a.digit - b.digit)
    .slice(0, topN);
}

export function predictNextDigitStep(
  result: AnalysisResult,
  codeStats: CodeValueStatRow[],
  prefix: string,
  topN: number = NEXT_DIGIT_TOP_N,
): NextDigitStepResult | null {
  if (result.totalCount === 0) return null;

  const { probabilities, counts, totalMatches, source } = computeNextDigitProbabilities(
    result,
    codeStats,
    prefix,
  );

  return {
    position: prefix.length + 1,
    prefix,
    candidates: pickTopCandidates(probabilities, counts, topN),
    totalMatches,
    source,
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
    /** Extra steps beyond default chain (user "extend") */
    extraSteps?: number;
  } = {},
): NextDigitChainResult {
  const chainDepth = options.chainDepth ?? NEXT_DIGIT_DEFAULT_CHAIN_DEPTH;
  const topN = clampNextDigitTopN(options.topN ?? NEXT_DIGIT_TOP_N);
  const extraSteps = options.extraSteps ?? 0;
  const parsed = parseBidRateInput(input);

  const nextStep = predictNextDigitStep(result, codeStats, parsed.decimalPrefix, topN);

  const chainSteps: NextDigitStepResult[] = [];
  let workingPrefix = parsed.decimalPrefix;
  const totalSteps = chainDepth + extraSteps;

  for (let step = 0; step < totalSteps; step += 1) {
    const stepResult = predictNextDigitStep(result, codeStats, workingPrefix, topN);
    if (!stepResult || stepResult.candidates.length === 0) break;

    chainSteps.push(stepResult);
    const best = stepResult.candidates[0];
    if (!best) break;
    workingPrefix += String(best.digit);
  }

  const chainSuffix = workingPrefix.slice(parsed.decimalPrefix.length);
  const suggestedDisplay = formatDisplayValue(parsed, chainSuffix);

  return {
    parsed,
    nextStep,
    chainSteps,
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
