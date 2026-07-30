import type { AnalysisResult } from './analysisEngine';

export {
  formatCodeValuePatternTargetLabel,
  predictFromCodeValuePatterns,
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
export function predictNextDigitStep(_result: AnalysisResult, _prefix: string = ''): null {
  return null;
}

/** @deprecated 소수 digit 연쇄 추천 제거 — S 패턴만 사용 */
export function predictDigitChain(): {
  parsed: ParsedBidInput;
  nextStep: null;
  chainSteps: never[];
  suggestedChain: string;
  suggestedDisplay: string;
} {
  return {
    parsed: { integerPart: null, decimalPrefix: '', displayValue: '' },
    nextStep: null,
    chainSteps: [],
    suggestedChain: '',
    suggestedDisplay: '',
  };
}
