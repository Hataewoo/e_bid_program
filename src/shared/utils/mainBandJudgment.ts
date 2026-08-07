/**
 * ① 저·고
 * - 1자리( prefix 없음 ): S run 길이로 저/고 선택
 * - 2자리~( append 있음 ): S″ PV·Code/Values 패턴만 (run 길이 미사용)
 */

import type { AnalysisResult, DigitClass } from './analysisEngine';
import { buildRuns, toClassSequence } from './analysisEngine';
import { analyzeCodeValueMainDetail } from './codeValueSubAnalysis';
import { getMainBandLabel, type DigitBand } from './digitSubBand';
import { scoreEachSubBandFromFilteredPointValues } from './pointValuesCodeFlow';
import { virtualMasterDigits } from './subBandRepeatJudgment';

function sideToBand(side: DigitClass): DigitBand {
  return side === 'low' ? 'low' : 'high';
}

function runLengthsForSide(context: string, side: DigitClass): number[] {
  return buildRuns(toClassSequence(context))
    .filter((r) => r.cls === side)
    .map((r) => r.length);
}

/** 2자리~ — Side PV 4구간 S″ 패턴 점수 합으로 저·고 (run suffix·run 길이 미사용) */
export function resolveMainBandFromPatternsOnly(
  result: AnalysisResult,
  prefix: string,
): { band: DigitBand; side: DigitClass; reasons: string[] } {
  const context = virtualMasterDigits(result, prefix);
  const subScores = scoreEachSubBandFromFilteredPointValues(result, prefix);

  const lowScore = (subScores.get('lowLow') ?? 0) + (subScores.get('lowHigh') ?? 0);
  const highScore = (subScores.get('highLow') ?? 0) + (subScores.get('highHigh') ?? 0);

  const reasons = [
    `① 2자리~ 패턴 전용 — S″ PV 저점 ${lowScore.toFixed(1)} / 고점 ${highScore.toFixed(1)} (run 미사용)`,
    `가상 Master 꼬리 [${context.slice(-Math.min(6, context.length))}]`,
  ];

  let low = lowScore;
  let high = highScore;

  if (low <= 0 && high <= 0) {
    low = 1;
    high = 1;
    reasons.push('PV 패턴 없음 → 저·고 중립');
  }

  const side: DigitClass = low > high ? 'low' : 'high';
  reasons.push(`→ ${getMainBandLabel(sideToBand(side))}`);
  return { band: sideToBand(side), side, reasons };
}

/** @deprecated resolveMainBandFromPatternsOnly 사용 */
export function resolveMainBandWithVirtualMaster(
  result: AnalysisResult,
  prefix: string,
  _baseVote: { low: number; high: number; reason: string },
): { band: DigitBand; side: DigitClass; reasons: string[] } {
  void _baseVote;
  return resolveMainBandFromPatternsOnly(result, prefix);
}

export function collectMainCodesForContext(context: string, side: DigitClass): string[] {
  const runLengths = runLengthsForSide(context, side);
  return analyzeCodeValueMainDetail(runLengths, side)
    .rows.filter((row) => row.values.length > 0)
    .map((row) => row.code);
}
