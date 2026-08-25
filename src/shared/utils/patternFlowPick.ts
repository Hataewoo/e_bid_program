/**
 * 패턴 흐름 전용 추천
 * - CodeValues Values(1,1,2,6…) = run·반복 횟수 참고 ONLY — digit 매핑 금지
 * - 추천 digit = Master / Point Values sourceDigit 만
 * - 절대 빈도수·점수 합산 없음 — run 지속/전환 + source 꼬리 alternation
 */

import type { AnalysisResult, DigitClass } from './analysisEngine';
import {
  analyzeCodeValueSubDetail,
  extractCodeValuesFromBaseSequence,
  type CodeValueSubAnalysisRow,
} from './codeValueSubAnalysis';
import { buildRuns, toClassSequence } from './analysisEngine';
import {
  buildPointValueTokens,
  filterPointValuesToSubBand,
  getSidePointValues,
  type PointValueToken,
} from './pointValuesCodeFlow';
import {
  getDigitBand,
  getDigitSubBand,
  getDigitsInSubBand,
  getMainBandLabel,
  getSubBandLabel,
  getSubBandMainBand,
  type DigitBand,
  type DigitSubBand,
} from './digitSubBand';
import {
  findLastDigitInMainBand,
  inferMainBandPhaseFromSequence,
  inferSubBandPhase,
  virtualMasterDigits,
} from './subBandRepeatJudgment';
import { wouldFormRepetitivePattern } from './patternRepeatGuard';
import { sliceRecentDigitScoreTail } from './recentCompare';
import { DIGIT_PREDICTION_WEIGHTS } from './digitPredictionWeights';
import {
  flowOrderFromMasterSequence,
  masterDigitsInSubBandSequence,
} from './masterDigitSequence';

export type PatternFlowPickMode = 'repeat' | 'transition' | 'pattern';

export interface PatternFlowPickResult {
  digit: number;
  mode: PatternFlowPickMode;
  reason: string;
}

const SUB_BANDS_FOR_MAIN: Record<DigitBand, readonly DigitSubBand[]> = {
  low: ['lowLow', 'lowHigh'],
  high: ['highLow', 'highHigh'],
};

function sideToBand(side: DigitClass): DigitBand {
  return side === 'low' ? 'low' : 'high';
}

/** CodeValues S 시퀀스 — run 길이 힌트만 (Values ≠ digit) */
function expectedRunFromCodeValues(baseSequence: readonly number[], side: DigitClass): number {
  if (baseSequence.length === 0) return 1;
  const patterns = extractCodeValuesFromBaseSequence([...baseSequence], side);
  const runHints = [
    ...(patterns.oneDuplicate ?? []),
    ...(patterns.threeOrMore ?? []),
    ...(patterns.fiveOrMore ?? []),
  ].filter((v) => v > 0);
  if (runHints.length === 0) return 1;
  return Math.round(runHints.reduce((a, b) => a + b, 0) / runHints.length);
}

/** ① 저·고 — S run 1사이 최우선·1중복·run 종합 (빈도 합산 없음) */
function inferMainBandPhase(
  result: AnalysisResult,
  prefix: string,
): { phase: 'repeat' | 'transition'; side: DigitClass; label: string } {
  const context = virtualMasterDigits(result, prefix);
  const liveRuns = buildRuns(toClassSequence(context));

  if (liveRuns.length === 0) {
    const tail = Number(context[context.length - 1]);
    const band = getDigitBand(tail) ?? 'low';
    const side: DigitClass = band === 'low' ? 'low' : 'high';
    return { phase: 'repeat', side, label: `run 없음 → 꼬리 source ${tail}` };
  }

  const lastRun = liveRuns[liveRuns.length - 1]!;
  const side = lastRun.cls;
  const mainBand = sideToBand(side);
  const sSequence = side === 'low' ? result.lowRunLengths : result.highRunLengths;
  const lastDigit =
    findLastDigitInMainBand(context, mainBand) ?? Number(context[context.length - 1] ?? -1);

  const seqPhase = inferMainBandPhaseFromSequence(sSequence, side, lastRun.length, lastDigit);
  const finalSide: DigitClass =
    seqPhase.phase === 'repeat' ? side : side === 'low' ? 'high' : 'low';

  return {
    phase: seqPhase.phase,
    side: finalSide,
    label: seqPhase.label,
  };
}

export function resolveMainBandFromPatternFlow(
  result: AnalysisResult,
  prefix: string,
): { band: DigitBand; side: DigitClass; reasons: string[] } {
  const virtualNote =
    prefix.length > 0
      ? [`가상 Master: 원본 ${result.digits.length}자 + append [${prefix}]`]
      : [];
  const phase = inferMainBandPhase(result, prefix);
  const band = sideToBand(phase.side);

  return {
    band,
    side: phase.side,
    reasons: [
      ...virtualNote,
      '① CodeValues S run — 1사이 최우선·1중복·run 종합 (Values≠digit)',
      phase.label,
      `→ ${getMainBandLabel(band)}`,
    ],
  };
}

function subBandCodeValueRows(
  result: AnalysisResult,
  prefix: string,
  mainBand: DigitBand,
  subBand: DigitSubBand,
): CodeValueSubAnalysisRow[] {
  const side: DigitClass = mainBand === 'low' ? 'low' : 'high';
  const filtered = filterPointValuesToSubBand(getSidePointValues(result, prefix, side), subBand);
  const sPrime = buildPointValueTokens(filtered).map((t) => t.value);
  return analyzeCodeValueSubDetail(sPrime, side).rows;
}

export { subBandCodeValueRows as getSubBandCodeValueRows };

/** ② 세분화 — S″ CodeValues run 지속/전환 (source digit 기준) */
export function resolveSubBandFromPatternFlow(
  result: AnalysisResult,
  prefix: string,
  mainBand: DigitBand,
): { sub: DigitSubBand; reasons: string[]; rows: CodeValueSubAnalysisRow[] } {
  const candidates = SUB_BANDS_FOR_MAIN[mainBand];
  const context = virtualMasterDigits(result, prefix);
  const lastDigit = findLastDigitInMainBand(context, mainBand);
  const currentSub = lastDigit !== null ? getDigitSubBand(lastDigit) : null;
  const reasons: string[] = ['② 세분화 — 1사이 최우선·1중복·run 종합 (마지막 digit 기준, Values≠digit)'];

  if (!currentSub || !candidates.includes(currentSub)) {
    const sub = candidates[0]!;
    reasons.push(`세분 source 없음 → ${getSubBandLabel(sub)}`);
    return { sub, reasons, rows: subBandCodeValueRows(result, prefix, mainBand, sub) };
  }

  const phase = inferSubBandPhase(result, prefix, mainBand, currentSub);
  const sibling = candidates.find((c) => c !== currentSub) ?? currentSub;

  if (phase.phase === 'repeat') {
    reasons.push(`${phase.label} → ${getSubBandLabel(currentSub)} 유지 (source ${lastDigit})`);
    return {
      sub: currentSub,
      reasons,
      rows: subBandCodeValueRows(result, prefix, mainBand, currentSub),
    };
  }

  reasons.push(`${phase.label} → ${getSubBandLabel(sibling)} 전환 (source ${lastDigit})`);
  return {
    sub: sibling,
    reasons,
    rows: subBandCodeValueRows(result, prefix, mainBand, sibling),
  };
}

/** S″ 꼬리 — 현재 source digit run 길이 (token.value, isRun 반영) */
function currentSourceRunLength(tokens: readonly PointValueToken[]): number {
  const last = tokens.at(-1);
  if (!last) return 0;
  return last.isRun ? last.value : 1;
}

/** S″ CodeValues — 해당 source digit run 기대 길이 (Values는 참고만) */
function expectedSourceRunLength(
  tokens: readonly PointValueToken[],
  sourceDigit: number,
  side: DigitClass,
): number {
  const sPrime = tokens.map((t) => t.value);
  const fromPatterns = expectedRunFromCodeValues(sPrime, side);
  const sourceRuns = tokens.filter((t) => t.sourceDigit === sourceDigit).map((t) => t.value);
  if (sourceRuns.length > 0) {
    return Math.max(fromPatterns, sourceRuns[sourceRuns.length - 1]!);
  }
  return fromPatterns;
}

function inferDigitFlowPhase(
  result: AnalysisResult,
  prefix: string,
  subBand: DigitSubBand,
): { phase: 'repeat' | 'transition'; label: string; tailMasterDigit: number | null } {
  const mainBand = getSubBandMainBand(subBand);
  const side: DigitClass = mainBand === 'low' ? 'low' : 'high';
  const pointValues = getSidePointValues(result, prefix, side);
  const filtered = filterPointValuesToSubBand(pointValues, subBand);
  const tokens = sliceRecentDigitScoreTail(buildPointValueTokens(filtered));
  const masterSeq = masterDigitsInSubBandSequence(result, prefix, subBand);
  const tailMasterDigit = masterSeq.at(-1) ?? null;

  if (tokens.length === 0) {
    return {
      phase: 'transition',
      label: `${getSubBandLabel(subBand)} S″ 없음`,
      tailMasterDigit,
    };
  }

  if (tailMasterDigit === null) {
    return {
      phase: 'transition',
      label: `${getSubBandLabel(subBand)} master seq 없음`,
      tailMasterDigit: null,
    };
  }

  const currentRun = currentSourceRunLength(tokens);
  const expected = expectedSourceRunLength(tokens, tailMasterDigit, side);

  if (currentRun <= expected) {
    return {
      phase: 'repeat',
      label: `master ${tailMasterDigit} run ${currentRun}/${expected} (S″ Values 참고)`,
      tailMasterDigit,
    };
  }

  return {
    phase: 'transition',
    label: `master ${tailMasterDigit} run ${currentRun}≥${expected} → digit 전환`,
    tailMasterDigit,
  };
}

/** Runtime PatternFlow direction — history only (for conditional gating). */
export function inferPatternFlowPhaseDirection(
  result: AnalysisResult,
  prefix: string,
  subBand: DigitSubBand,
): 'repeat' | 'transition' {
  return inferDigitFlowPhase(result, prefix, subBand).phase;
}

/**
 * Legacy guard — NOT used in final digitCandidateScoring.
 * Prevents confusing Pattern Code Value (run length) with MasterDigit in deprecated pickers.
 */
export function isBlockedPatternValueDigit(
  digit: number,
  tokens: readonly PointValueToken[],
): boolean {
  for (const t of tokens) {
    if (t.value === digit && t.sourceDigit !== digit) return true;
  }
  return false;
}

export interface PatternFlowDigitScore {
  score: number;
  mode: PatternFlowPickMode;
  reason: string;
}

/** Score all digits 0–9 from S″ source-digit flow (no pool.find order bias). */
export function computePatternFlowDigitScores(
  result: AnalysisResult,
  prefix: string,
  subBand: DigitSubBand,
): Map<number, PatternFlowDigitScore> {
  const w = DIGIT_PREDICTION_WEIGHTS;
  const side: DigitClass = getSubBandMainBand(subBand) === 'low' ? 'low' : 'high';
  const pointValues = getSidePointValues(result, prefix, side);
  let filtered = filterPointValuesToSubBand(pointValues, subBand);
  if (filtered.length === 0) filtered = pointValues;
  const tokens = sliceRecentDigitScoreTail(buildPointValueTokens(filtered));
  const phase = inferDigitFlowPhase(result, prefix, subBand);
  const masterSeq = masterDigitsInSubBandSequence(result, prefix, subBand);
  const lastSource = phase.tailMasterDigit ?? masterSeq.at(-1) ?? null;
  const allDigits = Array.from({ length: 10 }, (_, i) => i);
  const order = flowOrderFromMasterSequence(
    masterSeq,
    allDigits,
    phase.phase === 'repeat' ? lastSource : null,
  );

  const sPrimeTail = tokens
    .slice(-4)
    .map((t) => (t.sourceDigit === t.value ? String(t.sourceDigit) : `${t.value}(→${t.sourceDigit})`))
    .join(',');

  const out = new Map<number, PatternFlowDigitScore>();
  const n = order.length;

  for (let i = 0; i < order.length; i += 1) {
    const digit = order[i]!;
    const rankScore = (n - i) / Math.max(1, n);
    let mode: PatternFlowPickMode = 'pattern';
    if (phase.phase === 'repeat' && digit === lastSource) mode = 'repeat';
    else if (phase.phase === 'transition' && digit !== lastSource) mode = 'transition';

    const score =
      rankScore * w.patternFlow * (mode === 'repeat' ? 1.35 : 1) +
      (digit === lastSource && lastSource !== null ? w.patternFlow * 0.4 : 0);
    out.set(digit, {
      score,
      mode,
      reason:
        mode === 'repeat'
          ? `이번 차례 · ${phase.label} · S″[${sPrimeTail}] → ${digit}`
          : mode === 'transition'
            ? `전환 · ${phase.label} · S″[${sPrimeTail}] → ${digit}`
            : `패턴 흐름 · S″[${sPrimeTail}] → ${digit}`,
    });
  }

  return out;
}

function flowOrderFromSourceDigits(
  tokens: readonly PointValueToken[],
  pool: readonly number[],
  preferRepeatDigit?: number | null,
): number[] {
  const seen = new Set<number>();
  const order: number[] = [];

  if (
    preferRepeatDigit !== null &&
    preferRepeatDigit !== undefined &&
    pool.includes(preferRepeatDigit)
  ) {
    order.push(preferRepeatDigit);
    seen.add(preferRepeatDigit);
  }

  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    const d = tokens[i]!.sourceDigit;
    if (pool.includes(d) && !seen.has(d)) {
      order.push(d);
      seen.add(d);
    }
  }
  for (const d of pool) {
    if (!seen.has(d)) order.push(d);
  }
  return order;
}

/** @deprecated internal — kept for legacy transition helper only */
function pickTransitionSourceDigit(
  tokens: readonly PointValueToken[],
  pool: readonly number[],
  lastSource: number | null,
): number {
  const scores = new Map<number, number>();
  const seq = tokens.map((t) => t.sourceDigit);
  const tail = seq.at(-1) ?? lastSource;
  const prev = seq.at(-2);

  if (tail !== undefined && prev !== undefined && prev !== tail && pool.includes(prev)) {
    scores.set(prev, (scores.get(prev) ?? 0) + 3);
  }
  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    const d = tokens[i]!.sourceDigit;
    if (!pool.includes(d) || d === lastSource) continue;
    if (isBlockedPatternValueDigit(d, tokens)) continue;
    scores.set(d, (scores.get(d) ?? 0) + (tokens.length - i) * 0.5);
  }

  let best: number | null = null;
  let bestScore = -Infinity;
  for (const [d, s] of scores) {
    if (s > bestScore) {
      bestScore = s;
      best = d;
    }
  }
  if (best !== null) return best;
  return pool.find((d) => !isBlockedPatternValueDigit(d, tokens)) ?? pool[0]!;
}

function pickFirstAllowed(
  order: readonly number[],
  prefix: string,
  tokens: readonly PointValueToken[],
  prefer?: number,
): number | null {
  if (
    prefer !== undefined &&
    order.includes(prefer) &&
    !wouldFormRepetitivePattern(prefix, prefer) &&
    !isBlockedPatternValueDigit(prefer, tokens)
  ) {
    return prefer;
  }
  for (const d of order) {
    if (isBlockedPatternValueDigit(d, tokens)) continue;
    if (!wouldFormRepetitivePattern(prefix, d)) return d;
  }
  return order.find((d) => !isBlockedPatternValueDigit(d, tokens)) ?? null;
}

/** ③ digit — sourceDigit run 흐름; pool 내 최고 flow score 선택 */
export function pickDigitByPatternFlow(
  pool: readonly number[],
  result: AnalysisResult,
  prefix: string,
  subBand: DigitSubBand,
): PatternFlowPickResult {
  if (pool.length === 0) {
    return { digit: -1, mode: 'pattern', reason: '후보 pool 없음' };
  }

  const flowScores = computePatternFlowDigitScores(result, prefix, subBand);
  let best: PatternFlowPickResult | null = null;

  for (const digit of pool) {
    if (wouldFormRepetitivePattern(prefix, digit)) continue;
    const fs = flowScores.get(digit);
    if (!fs) continue;
    if (!best || fs.score > flowScores.get(best.digit)!.score) {
      best = { digit, mode: fs.mode, reason: fs.reason };
    }
  }

  if (best) return best;

  const side: DigitClass = getSubBandMainBand(subBand) === 'low' ? 'low' : 'high';
  const filtered = filterPointValuesToSubBand(getSidePointValues(result, prefix, side), subBand);
  const tokens = sliceRecentDigitScoreTail(buildPointValueTokens(filtered));
  const fallback = pool.find((d) => !isBlockedPatternValueDigit(d, tokens)) ?? pool[0]!;
  return { digit: fallback, mode: 'pattern', reason: `패턴 흐름 fallback → ${fallback}` };
}

/** UI 정렬 — integrated flow scores for all digits */
export function patternFlowRankScores(
  pool: readonly number[],
  result: AnalysisResult,
  prefix: string,
  subBand: DigitSubBand,
): Record<number, number> {
  const flowScores = computePatternFlowDigitScores(result, prefix, subBand);
  const scores: Record<number, number> = {};
  for (const d of pool) {
    scores[d] = flowScores.get(d)?.score ?? 0.1;
  }
  for (let d = 0; d <= 9; d += 1) {
    if (scores[d] === undefined && flowScores.has(d)) {
      scores[d] = flowScores.get(d)!.score;
    }
  }
  return scores;
}

export function getSubBandDigitPool(sub: DigitSubBand): readonly number[] {
  return getDigitsInSubBand(sub);
}
