/**
 * ③ digit 추첨 — Side Point Values S″ Code/Values 패턴으로 반복·전환 판단
 * (8↔9, 5↔6↔7 등 구간 내 digit — Master 이력 건수가 아님)
 */

import type { AnalysisResult, DigitClass } from './analysisEngine';
import { extractCodeValuesFromBaseSequence } from './codeValueSubAnalysis';
import {
  buildPointValueTokens,
  filterPointValuesToSubBand,
  getSidePointValues,
} from './pointValuesCodeFlow';
import {
  getDigitSubBand,
  getSubBandMainBand,
  type DigitSubBand,
} from './digitSubBand';
import { wouldFormRepetitivePattern } from './patternRepeatGuard';
import { getLiveSegmentState } from './runSegmentEngine';

const RECENT_LOOKBACK = 10;
const OVERUSED_IN_RECENT = 2;
const REPEAT_PHASE_BOOST = 1.5;
const TRANSITION_OVERUSED_FACTOR = 0.25;
const TRANSITION_FRESH_FACTOR = 1.35;

export type DigitRepeatPickMode = 'repeat' | 'transition' | 'pattern';

export interface DigitRepeatPickResult {
  digit: number;
  mode: DigitRepeatPickMode;
  reason: string;
}

function countDigitInRecent(context: string, digit: number, lookback: number): number {
  let count = 0;
  for (let i = context.length - 1; i >= 0 && i >= context.length - lookback; i -= 1) {
    if (Number(context[i]) === digit) count += 1;
  }
  return count;
}

function countTrailingSameDigit(prefix: string): number {
  if (prefix.length === 0) return 0;
  const last = Number(prefix[prefix.length - 1]);
  if (!Number.isInteger(last)) return 0;
  let count = 0;
  for (let i = prefix.length - 1; i >= 0; i -= 1) {
    if (Number(prefix[i]) !== last) break;
    count += 1;
  }
  return count;
}

/** S″(세분화 Point Values) + Code/Values → digit 반복·전환 phase */
function inferDigitPhaseFromSubBandPatterns(
  result: AnalysisResult,
  context: string,
  prefix: string,
  subBand: DigitSubBand,
): { phase: 'repeat' | 'transition'; label: string } {
  const mainBand = getSubBandMainBand(subBand);
  const side: DigitClass = mainBand === 'low' ? 'low' : 'high';
  const filtered = filterPointValuesToSubBand(getSidePointValues(result, prefix, side), subBand);
  const tokens = buildPointValueTokens(filtered);
  const sPrime = tokens.map((t) => t.value);

  if (sPrime.length > 0) {
    const patterns = extractCodeValuesFromBaseSequence(sPrime, side);
    const runHints = [
      ...(patterns.threeOrMore ?? []),
      ...(patterns.fiveOrMore ?? []),
      ...(patterns.oneDuplicate ?? []),
    ].filter((v) => v > 0);

    const lastToken = tokens[tokens.length - 1];
    let trailingRun = 1;
    if (lastToken) {
      for (let i = tokens.length - 2; i >= 0; i -= 1) {
        if (tokens[i]!.sourceDigit === lastToken.sourceDigit) trailingRun += 1;
        else break;
      }
    }

    const expectedRun =
      runHints.length > 0
        ? Math.round(runHints.reduce((a, b) => a + b, 0) / runHints.length)
        : Math.max(trailingRun, 1);

    if (trailingRun > 0 && trailingRun < expectedRun) {
      return { phase: 'repeat', label: `S″ run 지속 (${trailingRun}/${expectedRun})` };
    }
    if (trailingRun >= expectedRun && expectedRun > 0) {
      return { phase: 'transition', label: `S″ run 종료 (${trailingRun}≥${expectedRun})` };
    }
    if ((patterns.oneDuplicate?.length ?? 0) > 0 && trailingRun <= 1) {
      return { phase: 'repeat', label: 'S″ 1중복 run' };
    }
  }

  const live = getLiveSegmentState(context);
  if (live && live.side === side) {
    const patterns = extractCodeValuesFromBaseSequence(live.completedRunLengths, side);
    const runHints = [
      ...(patterns.threeOrMore ?? []),
      ...(patterns.fiveOrMore ?? []),
      ...(patterns.oneDuplicate ?? []),
    ].filter((v) => v > 0);

    if (runHints.length > 0) {
      const expectedRun = Math.round(runHints.reduce((a, b) => a + b, 0) / runHints.length);
      if (live.currentRunProgress > 0 && live.currentRunProgress < expectedRun) {
        return { phase: 'repeat', label: `S run 지속 (${live.currentRunProgress}/${expectedRun})` };
      }
      if (live.currentRunProgress >= expectedRun) {
        return { phase: 'transition', label: `S run 종료 → digit 전환` };
      }
    }
  }

  return { phase: 'transition', label: 'Code/Values digit 전환' };
}

export function pickDigitByPatternRepeatJudgment(
  pool: readonly number[],
  patternScores: Record<number, number>,
  options: {
    master: string;
    prefix: string;
    result: AnalysisResult;
    activeSide: DigitClass;
    targetSubBand?: DigitSubBand;
  },
): DigitRepeatPickResult {
  if (pool.length === 0) {
    return { digit: -1, mode: 'pattern', reason: '후보 pool 없음' };
  }

  const { prefix } = options;

  if (prefix.length > 0) {
    type Row = { digit: number; score: number; note: string };
    const rows: Row[] = [];
    for (const d of pool) {
      if (wouldFormRepetitivePattern(prefix, d)) {
        rows.push({ digit: d, score: 0.01, note: 'ABAB/연속 차단' });
        continue;
      }
      rows.push({
        digit: d,
        score: patternScores[d] ?? 0.1,
        note: 'S″ 패턴 점수',
      });
    }
    rows.sort((a, b) => b.score - a.score || a.digit - b.digit);
    const best = rows[0] ?? { digit: pool[0]!, score: 0, note: 'fallback' };
    return {
      digit: best.digit,
      mode: 'pattern',
      reason: `패턴 점수 · 2자리~ (run 미사용) · digit ${best.digit} (${best.note})`,
    };
  }

  const context =
    options.prefix.length > 0 ? options.master + options.prefix : options.master;
  const { result, activeSide } = options;

  const subBand =
    options.targetSubBand ??
    (prefix.length > 0
      ? getDigitSubBand(Number(prefix[prefix.length - 1]))
      : null);

  const { phase, label: patternLabel } =
    subBand !== null && subBand !== undefined
      ? inferDigitPhaseFromSubBandPatterns(result, context, prefix, subBand)
      : inferDigitPhaseFromSubBandPatterns(
          result,
          context,
          prefix,
          activeSide === 'low' ? 'lowLow' : 'highLow',
        );

  type Row = { digit: number; score: number; note: string };
  const rows: Row[] = [];

  for (const d of pool) {
    if (wouldFormRepetitivePattern(prefix, d)) {
      rows.push({ digit: d, score: 0.01, note: 'ABAB/연속 차단' });
      continue;
    }

    let score = patternScores[d] ?? 0.1;
    const recent = countDigitInRecent(context, d, RECENT_LOOKBACK);
    const trailing = countTrailingSameDigit(prefix);
    const repeatsLast = prefix.length > 0 && Number(prefix[prefix.length - 1]) === d;
    const overused = recent >= OVERUSED_IN_RECENT;

    if (phase === 'repeat') {
      if (repeatsLast || recent >= 1) score *= REPEAT_PHASE_BOOST;
      rows.push({
        digit: d,
        score,
        note: `반복 · recent ${recent} · S″ ${patternLabel}`,
      });
      continue;
    }

    if (overused || (repeatsLast && trailing >= 1)) {
      score *= TRANSITION_OVERUSED_FACTOR;
      rows.push({
        digit: d,
        score,
        note: `전환 · recent ${recent} 과다 → 다른 digit`,
      });
      continue;
    }

    if (recent === 0) {
      score *= TRANSITION_FRESH_FACTOR;
    }
    rows.push({
      digit: d,
      score,
      note: `전환 · recent ${recent} · 미출현 digit`,
    });
  }

  rows.sort((a, b) => b.score - a.score || a.digit - b.digit);
  const best = rows[0] ?? { digit: pool[0]!, score: 0, note: 'fallback' };
  const mode: DigitRepeatPickMode = phase === 'repeat' ? 'repeat' : 'transition';

  return {
    digit: best.digit,
    mode,
    reason: `${phase === 'repeat' ? '반복' : '전환'} · ${patternLabel} · digit ${best.digit} (${best.note})`,
  };
}
