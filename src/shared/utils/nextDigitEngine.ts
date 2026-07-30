import type { AnalysisResult, CodeValueStatRow } from './analysisEngine';
import {
  getBandDecisionLabel,
  getMasterPatternModeLabel,
  predictFromCodePatternProfile,
  type CodePatternPrediction,
} from './codePatternPrediction';
import { getMainBandLabel } from './digitSubBand';

export const NEXT_DIGIT_TOP_N = 1;
export const NEXT_DIGIT_TOP_N_MIN = 1;
export const NEXT_DIGIT_TOP_N_MAX = 10;
export const NEXT_DIGIT_DEFAULT_CHAIN_DEPTH = 4;

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

export type NextDigitSource = 'codeProfile' | 'pattern' | 'prefix' | 'transition' | 'global';

export type { DigitBand, DigitSubBand } from './digitSubBand';
export {
  classifyMasterCodeProfile,
  getBandDecisionLabel,
  getMasterPatternModeLabel,
  predictFromCodePatternProfile,
  resolveTargetBandFromCodeProfile,
} from './codePatternPrediction';
export {
  findMostRecentDigitInMainBand,
  findMostRecentDigitInSubBand,
  getDigitBand,
  getDigitSubBand,
  getDigitsInSubBand,
  getMainBandLabel,
  getOppositeBand,
  getOppositeSubBandInMain,
  getSubBandLabel,
} from './digitSubBand';

export function getLastReferenceDigit(prefix: string, masterDigits: string): number | null {
  if (prefix.length > 0) {
    const last = Number(prefix[prefix.length - 1]);
    return Number.isInteger(last) && last >= 0 && last <= 9 ? last : null;
  }
  if (!masterDigits) return null;
  const last = Number(masterDigits[masterDigits.length - 1]);
  return Number.isInteger(last) && last >= 0 && last <= 9 ? last : null;
}

export interface NextDigitStepResult {
  position: number;
  prefix: string;
  candidates: NextDigitCandidate[];
  totalMatches: number;
  source: NextDigitSource;
  codeProfile?: CodePatternPrediction;
}

export interface NextDigitChainResult {
  parsed: ParsedBidInput;
  nextStep: NextDigitStepResult | null;
  chainSteps: NextDigitStepResult[];
  suggestedChain: string;
  suggestedDisplay: string;
}

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

function resolveSource(prediction: CodePatternPrediction, prefix: string): NextDigitSource {
  if (prediction.bandDecision.reason === 'patternTransition') return 'pattern';
  if (prediction.contextMatches > 0 && prefix.length > 0) return 'prefix';
  if (prediction.profile.topCode) return 'codeProfile';
  return 'global';
}

function toProbability(score: number, total: number): number {
  if (total <= 0) return 100;
  return Math.round((score / total) * 1000) / 10;
}

export function predictNextDigitStep(
  result: AnalysisResult,
  codeStats: CodeValueStatRow[],
  prefix: string,
  topN: number = NEXT_DIGIT_TOP_N,
): NextDigitStepResult | null {
  if (result.totalCount === 0) return null;

  const lastDigit = getLastReferenceDigit(prefix, result.digits);
  if (lastDigit === null) return null;

  const prediction = predictFromCodePatternProfile(result, codeStats, prefix, lastDigit);
  const top = prediction.rankedDigits.slice(0, clampNextDigitTopN(topN));
  const total = prediction.rankedDigits.reduce((sum, row) => sum + row.score, 0);

  const candidates: NextDigitCandidate[] = top.map((row) => ({
    digit: row.digit,
    probability: toProbability(row.score, total),
    matchCount: Math.round(row.score),
  }));

  return {
    position: prefix.length + 1,
    prefix,
    candidates,
    totalMatches: Math.round(prediction.totalSignal),
    source: resolveSource(prediction, prefix),
    codeProfile: prediction,
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

export function formatCodeProfileTargetLabel(
  prediction: CodePatternPrediction | undefined,
): string | null {
  if (!prediction) return null;
  const parts = [
    getMasterPatternModeLabel(prediction.profile),
    prediction.profile.topCode ? `코드 ${prediction.profile.topCode}` : null,
    getMainBandLabel(prediction.targetBand),
    getBandDecisionLabel(prediction.bandDecision),
    prediction.contextMatches > 0 ? `전환 ${prediction.contextMatches}건` : null,
  ].filter(Boolean);
  const top = prediction.rankedDigits[0];
  if (top) parts.push(String(top.digit));
  return parts.join(' · ');
}

// Legacy exports kept for tests/tools that import transition helpers
export { countNextDigitsAfterPrefix } from './nextDigitTransitionUtils';
