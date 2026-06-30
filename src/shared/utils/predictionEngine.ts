import type { AnalysisResult, CodeValueStatRow } from './analysisEngine';

export type PredictionDominantSide = 'low' | 'high' | 'balanced';

export interface PredictionResult {
  masterNo: string;
  value: string;
  topCode: string | null;
  topCodeCount: number;
  topCodeDescription: string;
  dominantSide: PredictionDominantSide;
  modeDigit: number | null;
  confidence: number;
  rationale: string[];
  step2Count: number;
  step3Count: number;
}

function modeDigitFromDigits(digits: string): number | null {
  const counts = new Map<number, number>();
  for (const ch of digits) {
    const digit = Number(ch);
    if (!Number.isInteger(digit) || digit < 0 || digit > 9) continue;
    counts.set(digit, (counts.get(digit) ?? 0) + 1);
  }

  let bestDigit: number | null = null;
  let bestCount = -1;
  for (const [digit, count] of counts) {
    if (count > bestCount) {
      bestDigit = digit;
      bestCount = count;
    }
  }
  return bestDigit;
}

function resolveDominantSide(result: AnalysisResult): PredictionDominantSide {
  const gap = Math.abs(result.lowRate - result.highRate);
  if (gap < 5) return 'balanced';
  return result.lowRate > result.highRate ? 'low' : 'high';
}

function filterDigitsForSide(digits: string, side: PredictionDominantSide): string {
  if (side === 'balanced') return digits;
  return digits
    .split('')
    .filter((ch) => {
      const digit = Number(ch);
      if (!Number.isInteger(digit)) return false;
      return side === 'low' ? digit <= 4 : digit >= 5;
    })
    .join('');
}

export function createEmptyPrediction(masterNo: string): PredictionResult {
  return {
    masterNo,
    value: '',
    topCode: null,
    topCodeCount: 0,
    topCodeDescription: '',
    dominantSide: 'balanced',
    modeDigit: null,
    confidence: 0,
    rationale: ['분석 데이터 없음'],
    step2Count: 0,
    step3Count: 0,
  };
}

/**
 * 분석 결과 + CodeValue 통계 기반 예측값 생성.
 * 레거시 SRC-LEGACY 검증 전까지 규칙 기반 휴리스틱 — UI/STATUS에 미검증 표시.
 * 검증: `predictionVerification.ts` · `npm run catalog:diagnose`
 */
export function buildPrediction(
  result: AnalysisResult,
  codeStats: CodeValueStatRow[],
): PredictionResult {
  if (result.totalCount === 0) {
    return createEmptyPrediction(result.masterNo);
  }

  const sortedCodes = [...codeStats].sort((a, b) => b.count - a.count);
  const topCode = sortedCodes[0] ?? null;
  const dominantSide = resolveDominantSide(result);
  const sideDigits = filterDigitsForSide(result.digits, dominantSide);
  const modeDigit = modeDigitFromDigits(sideDigits) ?? modeDigitFromDigits(result.digits);

  const codePart = topCode?.code?.trim() || '00';
  const value = modeDigit !== null ? `${codePart}${modeDigit}` : codePart;

  const confidence =
    topCode && topCode.count > 0
      ? Math.min(100, Math.round(topCode.percent))
      : modeDigit !== null
        ? 25
        : 0;

  const dominantLabel =
    dominantSide === 'low'
      ? 'Low(0~4) 우세'
      : dominantSide === 'high'
        ? 'High(5~9) 우세'
        : 'Low/High 균형';

  const rationale = [
    topCode
      ? `최다 매칭 코드: ${topCode.code} (${topCode.count}건, ${topCode.percent.toFixed(1)}%)`
      : '등록된 코드 매칭 없음',
    `구간 판단: ${dominantLabel}`,
    modeDigit !== null ? `핵심 숫자: ${modeDigit}` : '핵심 숫자 추출 불가',
    `예측 조합: 코드(${codePart}) + 숫자(${modeDigit ?? '-'})`,
  ];

  return {
    masterNo: result.masterNo,
    value,
    topCode: topCode?.code ?? null,
    topCodeCount: topCode?.count ?? 0,
    topCodeDescription: topCode?.description ?? '',
    dominantSide,
    modeDigit,
    confidence,
    rationale,
    step2Count: result.lowCount,
    step3Count: result.highCount,
  };
}

export function buildPredictionCardText(prediction: PredictionResult): string {
  if (!prediction.value) return '예측 불가 (데이터 없음)';
  return `${prediction.value} | 신뢰도 ${prediction.confidence}% | ${prediction.topCode ?? '-'}`;
}
