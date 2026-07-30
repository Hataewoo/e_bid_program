import type { AnalysisResult, CodeValueStatRow } from './analysisEngine';
import { formatCodeValuePatternTargetLabel, predictFromCodeValuePatterns } from './codeValuePatternPredictor';

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

/**
 * 분석 결과 + CodeValue 통계 기반 S 패턴 예측 요약.
 * 소수점 digit(0~9) 추천은 포함하지 않음 — Analysis S 패턴 패널 참고.
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
  const patternPred = predictFromCodeValuePatterns(result, '');
  const segmentSummary = formatCodeValuePatternTargetLabel(patternPred);
  const topSegment = patternPred?.segment.nextSegmentCandidates[0] ?? null;
  const segmentConfidence = patternPred?.segment.segmentConfidence ?? 0;

  const confidence = topSegment
    ? Math.min(100, Math.round(topSegment.probability))
    : segmentConfidence > 0
      ? Math.min(100, Math.round(segmentConfidence * 100))
      : topCode && topCode.count > 0
        ? Math.min(100, Math.round(topCode.percent))
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
    segmentSummary ? `S 패턴: ${segmentSummary}` : 'S 패턴 추천 불가',
    topSegment ? `다음 구간 길이 후보: ${topSegment.value} (${topSegment.probability}%)` : '',
  ].filter(Boolean);

  return {
    masterNo: result.masterNo,
    value: segmentSummary ?? '',
    topCode: topCode?.code ?? null,
    topCodeCount: topCode?.count ?? 0,
    topCodeDescription: topCode?.description ?? '',
    dominantSide,
    modeDigit: null,
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
