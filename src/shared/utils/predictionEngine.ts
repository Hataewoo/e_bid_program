import type { AnalysisResult, CodeValueStatRow } from './analysisEngine';
import {
  getMainBandLabel,
  getSubBandLabel,
  resolveFinalDigitPick,
  resolvePatternRecommendPath,
} from './patternRecommendEngine';

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

function resolveDominantSide(result: AnalysisResult): PredictionDominantSide {
  const gap = Math.abs(result.lowRate - result.highRate);
  if (gap < 5) return 'balanced';
  return result.lowRate > result.highRate ? 'low' : 'high';
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

/** 분석 요약 — digit 추천은 Analysis 패턴 추천 패널 사용 */
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
  const path = resolvePatternRecommendPath(result, '');
  const pick = resolveFinalDigitPick(path, result, '');
  const topDigit =
    pick !== null && path.candidatePool.includes(pick.digit) ? pick.digit : null;

  const segmentSummary = `${getMainBandLabel(path.targetMainBand)} → ${getSubBandLabel(path.targetSubBand)}`;
  const confidence = topDigit !== null ? 70 : 40;

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
    `패턴 경로: ${segmentSummary}`,
    topDigit !== null ? `추천 digit (source): ${topDigit}` : '',
  ].filter(Boolean);

  return {
    masterNo: result.masterNo,
    value: segmentSummary,
    topCode: topCode?.code ?? null,
    topCodeCount: topCode?.count ?? 0,
    topCodeDescription: topCode?.description ?? '',
    dominantSide,
    modeDigit: topDigit,
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
