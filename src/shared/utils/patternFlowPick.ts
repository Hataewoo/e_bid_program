/**
 * 패턴 흐름 전용 추천 — 가점·점수 합산 없음
 * S / S″ Code/Values repeat·transition + 토큰 꼬리 순서만 사용
 */

import type { AnalysisResult, DigitClass } from './analysisEngine';
import { extractCodeValuesFromBaseSequence } from './codeValueSubAnalysis';
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
  getSubBandLabel,
  getSubBandMainBand,
  type DigitBand,
  type DigitSubBand,
} from './digitSubBand';
import {
  virtualMasterDigits,
} from './subBandRepeatJudgment';
import { wouldFormRepetitivePattern } from './patternRepeatGuard';
import { sliceRecentDigitScoreTail } from './recentCompare';
import { RUN_SUFFIX_MATCH_MAX } from './recentCompare';

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

/** 2자리~ ① 저·고 — run suffix 흐름 (점수·가점 없음) */
export function resolveMainBandFromPatternFlow(
  result: AnalysisResult,
  prefix: string,
): { band: DigitBand; side: DigitClass; reasons: string[] } {
  const context = virtualMasterDigits(result, prefix);
  const reasons: string[] = ['① 패턴 흐름 — run suffix (점수 합산 없음)'];

  let low = 0;
  let high = 0;
  const liveRuns = buildRuns(toClassSequence(context));
  const suffixLen = Math.min(RUN_SUFFIX_MATCH_MAX, liveRuns.length);

  if (suffixLen === 0) {
    reasons.push('run 이력 없음 → 꼬리 digit');
    const tail = Number(context[context.length - 1]);
    const band = getDigitBand(tail) ?? 'low';
    return { band, side: band === 'low' ? 'low' : 'high', reasons };
  }

  const liveSuffix = liveRuns
    .slice(-suffixLen)
    .map((r) => `${r.cls}:${r.length}`)
    .join('|');
  const allRuns = buildRuns(toClassSequence(result.digits));

  for (let i = suffixLen; i < allRuns.length; i += 1) {
    const histSuffix = allRuns
      .slice(i - suffixLen, i)
      .map((r) => `${r.cls}:${r.length}`)
      .join('|');
    if (histSuffix !== liveSuffix) continue;
    const nextRun = allRuns[i];
    if (!nextRun) continue;
    if (nextRun.cls === 'low') low += 1;
    else high += 1;
  }

  reasons.push(`run ${liveSuffix} → 다음 run 저${low} / 고${high}`);

  if (low === high) {
    const tail = Number(context[context.length - 1]);
    const band = getDigitBand(tail);
    if (band) {
      reasons.push(`동률 → 꼬리 digit ${tail}`);
      return { band, side: band === 'low' ? 'low' : 'high', reasons };
    }
  }

  const side: DigitClass = low > high ? 'low' : 'high';
  return { band: sideToBand(side), side, reasons };
}

function subBandSequenceFromSide(
  pointValues: string,
  mainBand: DigitBand,
): DigitSubBand[] {
  const tokens = sliceRecentDigitScoreTail(buildPointValueTokens(pointValues));
  const seq: DigitSubBand[] = [];
  for (const t of tokens) {
    const sub = getDigitSubBand(t.sourceDigit);
    if (sub && getSubBandMainBand(sub) === mainBand) seq.push(sub);
  }
  return seq;
}

/** S″ sub-band 꼬리 — 연속=형제 전환, 교차=교차 유지 (점수 없음) */
function resolveSubBandByAlternation(
  subSeq: readonly DigitSubBand[],
  candidates: readonly DigitSubBand[],
): { sub: DigitSubBand; label: string } {
  const tailSub = subSeq.at(-1) ?? candidates[0]!;
  const prevSub = subSeq.at(-2);
  const sibling = candidates.find((c) => c !== tailSub) ?? tailSub;

  if (prevSub === undefined) {
    return { sub: tailSub, label: `${getSubBandLabel(tailSub)} 꼬리` };
  }
  if (prevSub === tailSub) {
    return { sub: sibling, label: `${getSubBandLabel(tailSub)} 연속 → ${getSubBandLabel(sibling)}` };
  }
  return { sub: sibling, label: `${getSubBandLabel(prevSub)}↔${getSubBandLabel(tailSub)} → ${getSubBandLabel(sibling)}` };
}

/** ② 세분화 — S″ sub-band 꼬리 alternation (점수 없음) */
export function resolveSubBandFromPatternFlow(
  result: AnalysisResult,
  prefix: string,
  mainBand: DigitBand,
): { sub: DigitSubBand; reasons: string[] } {
  const reasons: string[] = [];
  const side: DigitClass = mainBand === 'low' ? 'low' : 'high';
  const candidates = SUB_BANDS_FOR_MAIN[mainBand];
  const pointValues = getSidePointValues(result, prefix, side);

  const subSeq = subBandSequenceFromSide(pointValues, mainBand);
  if (subSeq.length === 0) {
    const sub = candidates[0]!;
    reasons.push(`② S″ 없음 → ${getSubBandLabel(sub)}`);
    return { sub, reasons };
  }

  const { sub, label } = resolveSubBandByAlternation(subSeq, candidates);
  reasons.push(`② ${label}`);
  reasons.push(`② 패턴 흐름 → ${getSubBandLabel(sub)}`);
  return { sub, reasons };
}

function flowOrderFromTokens(
  tokens: readonly PointValueToken[],
  pool: readonly number[],
): number[] {
  const order: number[] = [];
  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    const d = tokens[i]!.sourceDigit;
    if (pool.includes(d) && !order.includes(d)) order.push(d);
  }
  for (const d of pool) {
    if (!order.includes(d)) order.push(d);
  }
  return order;
}

function pickFirstAllowed(
  order: readonly number[],
  prefix: string,
  prefer?: number,
): number | null {
  if (prefer !== undefined && order.includes(prefer) && !wouldFormRepetitivePattern(prefix, prefer)) {
    return prefer;
  }
  for (const d of order) {
    if (!wouldFormRepetitivePattern(prefix, d)) return d;
  }
  return order[0] ?? null;
}

function inferDigitFlowPhase(
  result: AnalysisResult,
  prefix: string,
  subBand: DigitSubBand,
): { phase: 'repeat' | 'transition'; label: string } {
  const mainBand = getSubBandMainBand(subBand);
  const side: DigitClass = mainBand === 'low' ? 'low' : 'high';
  const pointValues = getSidePointValues(result, prefix, side);
  const sideTokens = sliceRecentDigitScoreTail(buildPointValueTokens(pointValues));
  const inSub = sideTokens.filter((t) => getDigitSubBand(t.sourceDigit) === subBand);

  if (inSub.length === 0) {
    return { phase: 'transition', label: `${getSubBandLabel(subBand)} digit 전환` };
  }

  const last = inSub[inSub.length - 1]!;
  let trailingSame = 1;
  for (let i = inSub.length - 2; i >= 0; i -= 1) {
    if (inSub[i]!.sourceDigit === last.sourceDigit) trailingSame += 1;
    else break;
  }

  const filtered = filterPointValuesToSubBand(pointValues, subBand);
  const sPrime = buildPointValueTokens(filtered).map((t) => t.value);
  const patterns = extractCodeValuesFromBaseSequence(sPrime, side);
  const runHints = [
    ...(patterns.threeOrMore ?? []),
    ...(patterns.fiveOrMore ?? []),
    ...(patterns.oneDuplicate ?? []),
  ].filter((v) => v > 0);
  const expected =
    runHints.length > 0
      ? Math.round(runHints.reduce((a, b) => a + b, 0) / runHints.length)
      : 1;

  if (trailingSame < expected) {
    return {
      phase: 'repeat',
      label: `${getSubBandLabel(subBand)} digit ${last.sourceDigit} run ${trailingSame}/${expected}`,
    };
  }
  return {
    phase: 'transition',
    label: `${getSubBandLabel(subBand)} digit ${last.sourceDigit} → 전환`,
  };
}

/** ③ digit — S″ 토큰 꼬리 순서 + repeat/transition (점수 없음) */
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
  const order = flowOrderFromTokens(tokens, pool);
  const lastSource = tokens.at(-1)?.sourceDigit ?? null;

  const phase = inferDigitFlowPhase(result, prefix, subBand);
  const tailLabel = tokens
    .slice(-3)
    .map((t) => String(t.sourceDigit))
    .join(',');

  if (phase.phase === 'repeat' && lastSource !== null && pool.includes(lastSource)) {
    const digit = pickFirstAllowed(order, prefix, lastSource) ?? pool[0]!;
    return {
      digit,
      mode: 'repeat',
      reason: `패턴 흐름 · ${phase.label} · S″[${tailLabel}] → digit ${digit}`,
    };
  }

  for (const d of order) {
    if (lastSource !== null && d === lastSource) continue;
    if (wouldFormRepetitivePattern(prefix, d)) continue;
    return {
      digit: d,
      mode: 'transition',
      reason: `패턴 흐름 · ${phase.label} · S″[${tailLabel}] → digit ${d}`,
    };
  }

  const fallback = pickFirstAllowed(order, prefix) ?? pool[0]!;
  return {
    digit: fallback,
    mode: 'pattern',
    reason: `패턴 흐름 · S″[${tailLabel}] → digit ${fallback}`,
  };
}

/** UI 정렬용 — flow 순서 rank (가점 아님) */
export function patternFlowRankScores(
  pool: readonly number[],
  result: AnalysisResult,
  prefix: string,
  subBand: DigitSubBand,
): Record<number, number> {
  const side: DigitClass = getSubBandMainBand(subBand) === 'low' ? 'low' : 'high';
  const filtered = filterPointValuesToSubBand(getSidePointValues(result, prefix, side), subBand);
  const tokens = sliceRecentDigitScoreTail(buildPointValueTokens(filtered));
  const order = flowOrderFromTokens(tokens, pool);
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
