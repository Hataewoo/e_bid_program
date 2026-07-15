import type { AnalysisResult, CodeValueStatRow } from './analysisEngine';
import { calcRate } from './analysisEngine';

export type ProbabilityDominantSide = 'low' | 'high' | 'balanced';

export interface SegmentProbability {
  segmentKey: string;
  label: string;
  probability: number;
  count: number;
}

export interface ProbabilityProfile {
  masterNo: string;
  totalDigits: number;
  /** 0~9 각 자릿수 출현 확률(%) — 합 ≈ 100 */
  digitProbability: Record<number, number>;
  segments: SegmentProbability[];
  dominantSide: ProbabilityDominantSide;
}

const EMPTY_DIGIT_PROB: Record<number, number> = Object.fromEntries(
  Array.from({ length: 10 }, (_, d) => [d, 10]),
) as Record<number, number>;

function resolveDominantSide(result: AnalysisResult): ProbabilityDominantSide {
  const gap = Math.abs(result.lowRate - result.highRate);
  if (gap < 5) return 'balanced';
  return result.lowRate > result.highRate ? 'low' : 'high';
}

function countDigits(digits: string): Map<number, number> {
  const counts = new Map<number, number>();
  for (const ch of digits) {
    const d = Number(ch);
    if (!Number.isInteger(d) || d < 0 || d > 9) continue;
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  return counts;
}

function toDigitProbability(counts: Map<number, number>, total: number): Record<number, number> {
  if (total <= 0) return { ...EMPTY_DIGIT_PROB };
  const out: Record<number, number> = {};
  for (let d = 0; d <= 9; d += 1) {
    out[d] = calcRate(counts.get(d) ?? 0, total);
  }
  return out;
}

function applyCodeBoost(
  probs: Record<number, number>,
  codeStats: CodeValueStatRow[],
): Record<number, number> {
  const boosted = { ...probs };
  const top = [...codeStats].sort((a, b) => b.count - a.count).slice(0, 3);
  if (top.length === 0) return boosted;

  for (const row of top) {
    if (!row.code?.trim() || row.count <= 0) continue;
    const weight = Math.min(0.35, row.percent / 200);
    for (const ch of row.code.replace(/\D/g, '')) {
      const d = Number(ch);
      if (!Number.isInteger(d) || d < 0 || d > 9) continue;
      boosted[d] = (boosted[d] ?? 0) + weight;
    }
  }

  const sum = Object.values(boosted).reduce((a, b) => a + b, 0);
  if (sum <= 0) return probs;
  const out: Record<number, number> = {};
  for (let d = 0; d <= 9; d += 1) {
    out[d] = Math.round(((boosted[d] ?? 0) / sum) * 1000) / 10;
  }
  return out;
}

function applySideBoost(
  probs: Record<number, number>,
  side: ProbabilityDominantSide,
  strength = 1.12,
): Record<number, number> {
  if (side === 'balanced') return probs;
  const boosted: Record<number, number> = { ...probs };
  for (let d = 0; d <= 9; d += 1) {
    const isLow = d <= 4;
    const match = side === 'low' ? isLow : !isLow;
    if (match) boosted[d] = (boosted[d] ?? 0) * strength;
  }
  const sum = Object.values(boosted).reduce((a, b) => a + b, 0);
  if (sum <= 0) return probs;
  const out: Record<number, number> = {};
  for (let d = 0; d <= 9; d += 1) {
    out[d] = Math.round(((boosted[d] ?? 0) / sum) * 1000) / 10;
  }
  return out;
}

function buildSegmentList(
  result: AnalysisResult,
  digitProbability: Record<number, number>,
  codeStats: CodeValueStatRow[],
): SegmentProbability[] {
  const segments: SegmentProbability[] = [];

  for (let d = 0; d <= 9; d += 1) {
    const count = result.digits.split('').filter((ch) => Number(ch) === d).length;
    segments.push({
      segmentKey: `digit:${d}`,
      label: `숫자 ${d}`,
      probability: digitProbability[d] ?? 0,
      count,
    });
  }

  segments.push({
    segmentKey: 'band:low',
    label: '저점(0~4)',
    probability: result.lowRate,
    count: result.lowCount,
  });
  segments.push({
    segmentKey: 'band:high',
    label: '고점(5~9)',
    probability: result.highRate,
    count: result.highCount,
  });

  for (const row of [...codeStats].sort((a, b) => b.count - a.count).slice(0, 5)) {
    if (row.count <= 0) continue;
    segments.push({
      segmentKey: `code:${row.code}`,
      label: `Code ${row.code}`,
      probability: row.percent,
      count: row.count,
    });
  }

  return segments;
}

export function createEmptyProbabilityProfile(masterNo: string): ProbabilityProfile {
  return {
    masterNo,
    totalDigits: 0,
    digitProbability: { ...EMPTY_DIGIT_PROB },
    segments: [],
    dominantSide: 'balanced',
  };
}

/** Master Value + Code 통계 → 구간별 확률 프로필 */
export function buildProbabilityProfile(
  result: AnalysisResult,
  codeStats: CodeValueStatRow[],
): ProbabilityProfile {
  if (result.totalCount <= 0) {
    return createEmptyProbabilityProfile(result.masterNo);
  }

  const counts = countDigits(result.digits);
  let digitProbability = toDigitProbability(counts, result.totalCount);
  digitProbability = applyCodeBoost(digitProbability, codeStats);

  const dominantSide = resolveDominantSide(result);
  const segments = buildSegmentList(result, digitProbability, codeStats);

  return {
    masterNo: result.masterNo,
    totalDigits: result.totalCount,
    digitProbability,
    segments,
    dominantSide,
  };
}

/** 정수부(2자리) / 소수부(4자리) 투찰율용 가중 확률 */
export function buildPositionWeights(profile: ProbabilityProfile): Record<number, number>[] {
  const base = profile.digitProbability;
  const intWeights = applySideBoost(base, profile.dominantSide, 1.15);
  const decWeights = applySideBoost(base, profile.dominantSide, 1.05);
  return [intWeights, intWeights, decWeights, decWeights, decWeights, decWeights];
}

/** 저점·고점 각각의 가중치 — 통합 추천 시 양쪽 후보를 동시에 점수화 */
export function buildDualBandPositionWeights(profile: ProbabilityProfile): {
  low: Record<number, number>[];
  high: Record<number, number>[];
} {
  const base = profile.digitProbability;
  const lowInt = applySideBoost(base, 'low', 1.15);
  const highInt = applySideBoost(base, 'high', 1.15);
  const lowDec = applySideBoost(base, 'low', 1.05);
  const highDec = applySideBoost(base, 'high', 1.05);
  return {
    low: [lowInt, lowInt, lowDec, lowDec, lowDec, lowDec],
    high: [highInt, highInt, highDec, highDec, highDec, highDec],
  };
}

export function getTopDigitsByWeight(
  weights: Record<number, number>,
  topN: number,
): { digit: number; weight: number }[] {
  return Array.from({ length: 10 }, (_, d) => ({ digit: d, weight: weights[d] ?? 0 }))
    .sort((a, b) => b.weight - a.weight || a.digit - b.digit)
    .slice(0, Math.max(1, Math.min(10, topN)));
}
