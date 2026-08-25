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
  inferSubBandPhase,
  virtualMasterDigits,
} from './subBandRepeatJudgment';
import { wouldFormRepetitivePattern } from './patternRepeatGuard';
import { sliceRecentDigitScoreTail } from './recentCompare';

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

/** ① 저·고 — S run CodeValues 패턴 (빈도 합산 없음) */
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
  const sSequence = side === 'low' ? result.lowRunLengths : result.highRunLengths;
  const expected = expectedRunFromCodeValues(sSequence, side);

  if (lastRun.length < expected) {
    return {
      phase: 'repeat',
      side,
      label: `S run ${side === 'low' ? '저점' : '고점'} 지속 (${lastRun.length}/${expected}, CodeValues 참고)`,
    };
  }

  const opposite: DigitClass = side === 'low' ? 'high' : 'low';
  return {
    phase: 'transition',
    side: opposite,
    label: `S run 종료 (${lastRun.length}≥${expected}) → ${opposite === 'low' ? '저점' : '고점'} 전환`,
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
      '① CodeValues S run 패턴 (Values≠digit, 빈도 합산 없음)',
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
  const reasons: string[] = ['② 세분화 — 1사이 패턴 1순위 (Values≠digit, 반복/종료 판단)'];

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
): { phase: 'repeat' | 'transition'; label: string; sourceDigit: number | null } {
  const mainBand = getSubBandMainBand(subBand);
  const side: DigitClass = mainBand === 'low' ? 'low' : 'high';
  const pointValues = getSidePointValues(result, prefix, side);
  const filtered = filterPointValuesToSubBand(pointValues, subBand);
  const tokens = sliceRecentDigitScoreTail(buildPointValueTokens(filtered));

  if (tokens.length === 0) {
    return { phase: 'transition', label: `${getSubBandLabel(subBand)} S″ 없음`, sourceDigit: null };
  }

  const lastToken = tokens[tokens.length - 1]!;
  const sourceDigit = lastToken.sourceDigit;
  const currentRun = currentSourceRunLength(tokens);
  const expected = expectedSourceRunLength(tokens, sourceDigit, side);

  if (currentRun <= expected) {
    return {
      phase: 'repeat',
      label: `source ${sourceDigit} run ${currentRun}/${expected} (S″ Values 참고)`,
      sourceDigit,
    };
  }

  return {
    phase: 'transition',
    label: `source ${sourceDigit} run ${currentRun}≥${expected} → digit 전환`,
    sourceDigit,
  };
}

/**
 * CodeValues Values(1,2,3…)가 run 길이일 때 digit으로 오매핑 차단.
 * pool digit이 어떤 token의 value와 같지만 sourceDigit이 다르면 추천 불가.
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

/** source digit 꼬리 alternation — 전환 시 다음 source */
function pickTransitionSourceDigit(
  tokens: readonly PointValueToken[],
  pool: readonly number[],
  lastSource: number | null,
): number {
  const seq = tokens.map((t) => t.sourceDigit).filter((d) => pool.includes(d));
  const tail = seq.at(-1) ?? lastSource;
  const prev = seq.at(-2);

  if (tail !== undefined && prev === tail) {
    return pool.find((d) => d !== tail && !isBlockedPatternValueDigit(d, tokens)) ?? pool[0]!;
  }
  if (tail !== undefined && prev !== undefined && prev !== tail) {
    const candidate = prev;
    if (pool.includes(candidate) && !isBlockedPatternValueDigit(candidate, tokens)) return candidate;
  }
  if (lastSource !== null) {
    const alt = pool.find((d) => d !== lastSource && !isBlockedPatternValueDigit(d, tokens));
    if (alt !== undefined) return alt;
  }
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

/** ③ digit — sourceDigit run 흐름 (CodeValues Values ≠ digit) */
export function pickDigitByPatternFlow(
  pool: readonly number[],
  result: AnalysisResult,
  prefix: string,
  subBand: DigitSubBand,
): PatternFlowPickResult {
  if (pool.length === 0) {
    return { digit: -1, mode: 'pattern', reason: '후보 pool 없음' };
  }

  const side: DigitClass = getSubBandMainBand(subBand) === 'low' ? 'low' : 'high';
  const filtered = filterPointValuesToSubBand(getSidePointValues(result, prefix, side), subBand);
  const tokens = sliceRecentDigitScoreTail(buildPointValueTokens(filtered));
  const phase = inferDigitFlowPhase(result, prefix, subBand);
  const lastSource = phase.sourceDigit ?? tokens.at(-1)?.sourceDigit ?? null;

  const sPrimeTail = tokens
    .slice(-4)
    .map((t) => (t.sourceDigit === t.value ? String(t.sourceDigit) : `${t.value}(→${t.sourceDigit})`))
    .join(',');

  if (phase.phase === 'repeat' && lastSource !== null && pool.includes(lastSource)) {
    const digit =
      pickFirstAllowed([lastSource], prefix, tokens, lastSource) ??
      (isBlockedPatternValueDigit(lastSource, tokens) ? null : lastSource);
    if (digit !== null) {
      return {
        digit,
        mode: 'repeat',
        reason: `이번 차례 · ${phase.label} · S″[${sPrimeTail}] → source digit ${digit}`,
      };
    }
  }

  const transitionDigit = pickTransitionSourceDigit(tokens, pool, lastSource);
  if (!isBlockedPatternValueDigit(transitionDigit, tokens) && !wouldFormRepetitivePattern(prefix, transitionDigit)) {
    return {
      digit: transitionDigit,
      mode: 'transition',
      reason: `전환 · ${phase.label} · S″[${sPrimeTail}] → source digit ${transitionDigit}`,
    };
  }

  const order = flowOrderFromSourceDigits(
    tokens,
    pool,
    phase.phase === 'repeat' ? lastSource : null,
  );
  const fallback = pickFirstAllowed(order, prefix, tokens) ?? pool.find((d) => !isBlockedPatternValueDigit(d, tokens)) ?? pool[0]!;
  return {
    digit: fallback,
    mode: 'pattern',
    reason: `패턴 흐름 · S″[${sPrimeTail}] → source digit ${fallback}`,
  };
}

/** UI 정렬 — source digit flow 순서 (가점·빈도 아님) */
export function patternFlowRankScores(
  pool: readonly number[],
  result: AnalysisResult,
  prefix: string,
  subBand: DigitSubBand,
): Record<number, number> {
  const side: DigitClass = getSubBandMainBand(subBand) === 'low' ? 'low' : 'high';
  const filtered = filterPointValuesToSubBand(getSidePointValues(result, prefix, side), subBand);
  const tokens = sliceRecentDigitScoreTail(buildPointValueTokens(filtered));
  const phase = inferDigitFlowPhase(result, prefix, subBand);
  const lastSource = phase.sourceDigit ?? tokens.at(-1)?.sourceDigit ?? null;
  const order = flowOrderFromSourceDigits(
    tokens,
    pool,
    phase.phase === 'repeat' ? lastSource : null,
  );
  const scores: Record<number, number> = {};
  const n = order.length;
  for (let i = 0; i < order.length; i += 1) {
    scores[order[i]!] = n - i;
  }
  for (const d of pool) {
    if (scores[d] === undefined) scores[d] = 0.1;
  }
  return scores;
}

export function getSubBandDigitPool(sub: DigitSubBand): readonly number[] {
  return getDigitsInSubBand(sub);
}
