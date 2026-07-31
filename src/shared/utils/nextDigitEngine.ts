import type { AnalysisResult } from './analysisEngine';
import { pickBatchNextDigits, pickMultipleBatchNextDigits } from './codeValuePatternPredictor';

export {
  BATCH_DECIMAL_DIGITS,
  BATCH_VARIANT_COUNT,
  formatCodeValuePatternTargetLabel,
  pickBatchNextDigits,
  pickMultipleBatchNextDigits,
  predictFromCodeValuePatterns,
  type BatchBandMode,
  type BatchNextDigitsPick,
  type BatchDigitStepPick,
  type CodeValuePatternPrediction,
} from './codeValuePatternPredictor';

export {
  formatRunSegmentSummary,
  getLiveSegmentState,
  type RunSegmentPrediction,
} from './runSegmentEngine';

export interface ParsedBidInput {
  integerPart: string | null;
  decimalPrefix: string;
  displayValue: string;
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

export function getLastReferenceDigit(prefix: string, masterDigits: string): number | null {
  if (prefix.length > 0) {
    const last = Number(prefix[prefix.length - 1]);
    return Number.isInteger(last) && last >= 0 && last <= 9 ? last : null;
  }
  if (!masterDigits) return null;
  const last = Number(masterDigits[masterDigits.length - 1]);
  return Number.isInteger(last) && last >= 0 && last <= 9 ? last : null;
}

/** @deprecated 소수 digit 추천 제거 — S 패턴만 사용 */
export function predictNextDigitStep(_result?: AnalysisResult, _prefix?: string): null {
  void _result;
  void _prefix;
  return null;
}

/** 소수 4자리 연쇄 추천 — 후보 세트 포함 */
export function predictDigitChain(
  result: AnalysisResult,
  rawInput = '',
): {
  parsed: ParsedBidInput;
  nextStep: import('./codeValuePatternPredictor').BatchDigitStepPick | null;
  chainSteps: import('./codeValuePatternPredictor').BatchDigitStepPick[];
  suggestedChain: string;
  suggestedDisplay: string;
  batchPicks: import('./codeValuePatternPredictor').BatchNextDigitsPick[];
} {
  const parsed = parseBidRateInput(rawInput);
  const batchPicks = pickMultipleBatchNextDigits(result, parsed.decimalPrefix);
  const primary = batchPicks[0] ?? pickBatchNextDigits(result, parsed.decimalPrefix);
  const chainSteps = primary?.steps ?? [];
  const suggestedChain = primary?.chain ?? '';
  const suggestedDisplay =
    parsed.integerPart !== null
      ? `${parsed.integerPart}.${parsed.decimalPrefix}${suggestedChain}`
      : parsed.decimalPrefix.length > 0 || suggestedChain.length > 0
        ? parsed.displayValue.replace(/\.$/, '') + suggestedChain
        : suggestedChain;

  return {
    parsed,
    nextStep: chainSteps[0] ?? null,
    chainSteps,
    suggestedChain,
    suggestedDisplay,
    batchPicks,
  };
}
