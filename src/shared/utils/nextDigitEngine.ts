import type { AnalysisResult, CodeValueStatRow } from './analysisEngine';
import { calcRate } from './analysisEngine';
import { buildProbabilityProfile } from './probabilityEngine';

export const NEXT_DIGIT_TOP_N = 4;
export const NEXT_DIGIT_DEFAULT_CHAIN_DEPTH = 4;
const MIN_MATCHES_FOR_FULL_PREFIX = 3;

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

export type NextDigitSource = 'prefix' | 'blended' | 'global';

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

function countsToProbabilities(counts: Map<number, number>, total: number): Record<number, number> {
  if (total <= 0) return { ...EMPTY_PROBS };
  const out: Record<number, number> = {};
  for (let d = 0; d <= 9; d += 1) {
    out[d] = calcRate(counts.get(d) ?? 0, total);
  }
  return out;
}

function blendProbabilities(
  prefixProbs: Record<number, number>,
  globalProbs: Record<number, number>,
  prefixWeight: number,
): Record<number, number> {
  const w = Math.max(0, Math.min(1, prefixWeight));
  const out: Record<number, number> = {};
  for (let d = 0; d <= 9; d += 1) {
    out[d] = (prefixProbs[d] ?? 0) * w + (globalProbs[d] ?? 0) * (1 - w);
  }
  const sum = Object.values(out).reduce((a, b) => a + b, 0);
  if (sum <= 0) return { ...globalProbs };
  for (let d = 0; d <= 9; d += 1) {
    out[d] = Math.round(((out[d] ?? 0) / sum) * 1000) / 10;
  }
  return out;
}

export function computeNextDigitProbabilities(
  result: AnalysisResult,
  codeStats: CodeValueStatRow[],
  prefix: string,
): { probabilities: Record<number, number>; counts: Map<number, number>; totalMatches: number; source: NextDigitSource } {
  const profile = buildProbabilityProfile(result, codeStats);
  const globalProbs = profile.digitProbability;

  if (result.totalCount === 0) {
    return {
      probabilities: { ...EMPTY_PROBS },
      counts: new Map(),
      totalMatches: 0,
      source: 'global',
    };
  }

  const { counts, totalMatches } = countNextDigitsAfterPrefix(result.digits, prefix);

  if (prefix.length === 0 || totalMatches === 0) {
    return { probabilities: globalProbs, counts, totalMatches, source: 'global' };
  }

  const prefixProbs = countsToProbabilities(counts, totalMatches);
  if (totalMatches >= MIN_MATCHES_FOR_FULL_PREFIX) {
    return { probabilities: prefixProbs, counts, totalMatches, source: 'prefix' };
  }

  const prefixWeight = totalMatches / MIN_MATCHES_FOR_FULL_PREFIX;
  const blended = blendProbabilities(prefixProbs, globalProbs, prefixWeight);
  return { probabilities: blended, counts, totalMatches, source: 'blended' };
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
  const topN = options.topN ?? NEXT_DIGIT_TOP_N;
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
