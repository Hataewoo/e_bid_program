import type { ProbabilityProfile } from './probabilityEngine';
import {
  buildDualBandPositionWeights,
  createEmptyProbabilityProfile,
  getTopDigitsByWeight,
} from './probabilityEngine';

/** 투찰율 정수부 전체 허용 범위 (±3%) */
export const BID_RATE_INTEGER_MIN = 97;
export const BID_RATE_INTEGER_MAX = 103;
/** 저점 정수부 상한 / 고점 정수부 하한 */
export const BID_RATE_MIDPOINT = 100;
export const BID_RATE_LOW_BAND_MAX = 100;
export const BID_RATE_HIGH_BAND_MIN = 100;

/** 중간지점: 99.5000 이상 ~ 100.5000 미만 */
export const BID_RATE_MIDDLE_MIN = 99.5;
export const BID_RATE_MIDDLE_MAX = 100.5;

export type RateBand = 'low' | 'high' | 'middle';

/** auto: 저·고점 통합 | low/high/middle: 해당 구간만 */
export type RateRecommendMode = 'auto' | 'low' | 'high' | 'middle';

export interface RateRecommendOptions {
  /** 추천 개수 (1~100) */
  count?: number;
  /** 추천 모드 */
  mode?: RateRecommendMode;
  /** 투찰율 정수부 하한 (기본 97) */
  minInteger?: number;
  /** 투찰율 정수부 상한 (기본 103) */
  maxInteger?: number;
  /** 자리당 후보 숫자 개수 (조합 폭) */
  topDigitsPerPosition?: number;
}

export interface RateRecommendation {
  rank: number;
  rate: string;
  probability: number;
  /** 저점 / 고점 / 중간지점 */
  band: RateBand;
  rationale: string[];
}

export interface RateRecommendResult {
  masterNo: string;
  recommendations: RateRecommendation[];
  options: Required<RateRecommendOptions>;
}

const DEFAULT_OPTIONS: Required<RateRecommendOptions> = {
  count: 10,
  mode: 'auto',
  minInteger: BID_RATE_INTEGER_MIN,
  maxInteger: BID_RATE_INTEGER_MAX,
  topDigitsPerPosition: 4,
};

function normalizeMode(mode?: RateRecommendMode): RateRecommendMode {
  if (mode === 'low' || mode === 'high' || mode === 'auto' || mode === 'middle') return mode;
  return DEFAULT_OPTIONS.mode;
}

function clampIntegerOption(value: number, fallback: number): number {
  return Math.min(BID_RATE_INTEGER_MAX, Math.max(BID_RATE_INTEGER_MIN, value ?? fallback));
}

function normalizeOptions(options?: RateRecommendOptions): Required<RateRecommendOptions> {
  return {
    count: Math.min(100, Math.max(1, options?.count ?? DEFAULT_OPTIONS.count)),
    mode: normalizeMode(options?.mode),
    minInteger: clampIntegerOption(
      options?.minInteger ?? DEFAULT_OPTIONS.minInteger,
      BID_RATE_INTEGER_MIN,
    ),
    maxInteger: clampIntegerOption(
      options?.maxInteger ?? DEFAULT_OPTIONS.maxInteger,
      BID_RATE_INTEGER_MAX,
    ),
    topDigitsPerPosition: Math.min(
      10,
      Math.max(2, options?.topDigitsPerPosition ?? DEFAULT_OPTIONS.topDigitsPerPosition),
    ),
  };
}

/** 저점·고점 각 구간의 정수부 후보 (97~100, 100~103) */
export function listBandIntegerParts(
  band: RateBand,
  options: Required<RateRecommendOptions>,
): number[] {
  const globalMin = Math.min(options.minInteger, options.maxInteger);
  const globalMax = Math.max(options.minInteger, options.maxInteger);

  const bandMin =
    band === 'low'
      ? Math.max(BID_RATE_INTEGER_MIN, globalMin)
      : Math.max(BID_RATE_HIGH_BAND_MIN, globalMin);
  const bandMax =
    band === 'low'
      ? Math.min(BID_RATE_LOW_BAND_MAX, globalMax)
      : Math.min(BID_RATE_INTEGER_MAX, globalMax);

  if (bandMin > bandMax) return [];

  const out: number[] = [];
  for (let value = bandMin; value <= bandMax; value += 1) {
    out.push(value);
  }
  return out;
}

function formatRate(intPart: number, decDigits: number[]): string {
  const dec = decDigits.map((d) => d % 10).join('');
  return `${intPart}.${dec.padEnd(4, '0').slice(0, 4)}`;
}

/** XX.XXXX 투찰율을 숫자 값으로 변환 (예: 99.5678 → 99.5678) */
export function parseRateValue(intPart: number, decDigits: number[]): number {
  const dec = decDigits.map((d) => d % 10).join('').padEnd(4, '0').slice(0, 4);
  return intPart + Number(dec) / 10_000;
}

/** 99.5000 ≤ rate < 100.5000 */
export function isMiddleRate(intPart: number, decDigits: number[]): boolean {
  const value = parseRateValue(intPart, decDigits);
  return value >= BID_RATE_MIDDLE_MIN && value < BID_RATE_MIDDLE_MAX;
}

export function listMiddleIntegerParts(options: Required<RateRecommendOptions>): number[] {
  const globalMin = Math.min(options.minInteger, options.maxInteger);
  const globalMax = Math.max(options.minInteger, options.maxInteger);
  return [99, 100].filter((value) => value >= globalMin && value <= globalMax);
}

function parseIntegerDigits(value: number): number[] {
  return String(value)
    .split('')
    .map((ch) => Number(ch));
}

function scoreIntegerPart(intPart: number, weights: Record<number, number>): number {
  let score = 1;
  for (const digit of parseIntegerDigits(intPart)) {
    score *= Math.max((weights[digit] ?? 0.1) / 100, 0.001);
  }
  return score;
}

function scoreDecimalPart(
  decDigits: number[],
  decWeights: Record<number, number>[],
): number {
  let score = 1;
  for (let i = 0; i < decDigits.length; i += 1) {
    const weights = decWeights[i] ?? decWeights[0] ?? {};
    const digit = decDigits[i] ?? 0;
    score *= Math.max((weights[digit] ?? 0.1) / 100, 0.001);
  }
  return score;
}

function pickTopCandidates(
  rows: { digit: number; weight: number }[],
  topN: number,
): { digit: number; weight: number }[] {
  if (rows.length === 0) return [{ digit: 0, weight: 0.1 }];
  return rows.slice(0, Math.max(1, Math.min(topN, rows.length)));
}

function bandLabel(band: RateBand): string {
  if (band === 'low') return '저점(≤100%)';
  if (band === 'high') return '고점(≥100%)';
  return '중간지점(99.5~100.5)';
}

function buildRationale(
  intPart: number,
  decDigits: number[],
  band: RateBand,
  profile: ProbabilityProfile,
): string[] {
  const intDigits = parseIntegerDigits(intPart);
  const intProbSummary = intDigits
    .map((d) => `${d}(${(profile.digitProbability[d] ?? 0).toFixed(1)}%)`)
    .join(', ');
  const lines = [
    `구간 ${bandLabel(band)} · 정수부 ${intPart} — ${intProbSummary}`,
    `소수부 — ${decDigits.join('')}`,
  ];
  const topSeg = [...profile.segments]
    .filter((s) => s.segmentKey.startsWith('code:'))
    .sort((a, b) => b.probability - a.probability)[0];
  if (topSeg) {
    lines.push(`최다 Code: ${topSeg.label} (${topSeg.probability.toFixed(1)}%)`);
  }
  const lowSeg = profile.segments.find((s) => s.segmentKey === 'band:low');
  const highSeg = profile.segments.find((s) => s.segmentKey === 'band:high');
  if (lowSeg && highSeg) {
    lines.push(`Master 저점 ${lowSeg.probability.toFixed(1)}% · 고점 ${highSeg.probability.toFixed(1)}%`);
  }
  return lines;
}

type ScoredCandidate = {
  intPart: number;
  decDigits: number[];
  band: RateBand;
  score: number;
};

function buildDecimalCandidateLists(
  decWeightRows: Record<number, number>[],
  profile: ProbabilityProfile,
  topN: number,
) {
  return decWeightRows.map((row) =>
    pickTopCandidates(getTopDigitsByWeight(row ?? profile.digitProbability, topN), topN),
  );
}

function scoreBandCandidates(
  profile: ProbabilityProfile,
  opts: Required<RateRecommendOptions>,
  band: RateBand,
  positionWeights: Record<number, number>[],
): ScoredCandidate[] {
  const intWeights = positionWeights[0] ?? profile.digitProbability;
  const decWeightRows = [
    positionWeights[2] ?? profile.digitProbability,
    positionWeights[3] ?? profile.digitProbability,
    positionWeights[4] ?? profile.digitProbability,
    positionWeights[5] ?? profile.digitProbability,
  ];
  const [d0List, d1List, d2List, d3List] = buildDecimalCandidateLists(
    decWeightRows,
    profile,
    opts.topDigitsPerPosition,
  );

  const scored: ScoredCandidate[] = [];

  for (const intPart of listBandIntegerParts(band, opts)) {
    const intScore = scoreIntegerPart(intPart, intWeights);
    for (const a of d0List) {
      for (const b of d1List) {
        for (const c of d2List) {
          for (const d of d3List) {
            const decDigits = [a.digit, b.digit, c.digit, d.digit];
            const score = intScore * scoreDecimalPart(decDigits, decWeightRows);
            scored.push({ intPart, decDigits, band, score });
          }
        }
      }
    }
  }

  return scored;
}

function buildMiddlePositionWeights(profile: ProbabilityProfile): Record<number, number>[] {
  const base = profile.digitProbability;
  return [base, base, base, base, base, base];
}

function scoreMiddleCandidates(
  profile: ProbabilityProfile,
  opts: Required<RateRecommendOptions>,
): ScoredCandidate[] {
  const positionWeights = buildMiddlePositionWeights(profile);
  const intWeights = positionWeights[0] ?? profile.digitProbability;
  const decWeightRows = [
    positionWeights[2] ?? profile.digitProbability,
    positionWeights[3] ?? profile.digitProbability,
    positionWeights[4] ?? profile.digitProbability,
    positionWeights[5] ?? profile.digitProbability,
  ];
  const [d0List, d1List, d2List, d3List] = buildDecimalCandidateLists(
    decWeightRows,
    profile,
    opts.topDigitsPerPosition,
  );

  const scored: ScoredCandidate[] = [];

  for (const intPart of listMiddleIntegerParts(opts)) {
    const intScore = scoreIntegerPart(intPart, intWeights);
    for (const a of d0List) {
      for (const b of d1List) {
        for (const c of d2List) {
          for (const d of d3List) {
            const decDigits = [a.digit, b.digit, c.digit, d.digit];
            if (!isMiddleRate(intPart, decDigits)) continue;
            const score = intScore * scoreDecimalPart(decDigits, decWeightRows);
            scored.push({ intPart, decDigits, band: 'middle', score });
          }
        }
      }
    }
  }

  return scored;
}

/** 저점·고점 후보를 모두 생성한 뒤 동일 rate는 최고 점수만 유지 */
function mergeCandidatesByRate(candidates: ScoredCandidate[]): ScoredCandidate[] {
  const bestByRate = new Map<string, ScoredCandidate>();

  for (const row of candidates) {
    const rate = formatRate(row.intPart, row.decDigits);
    const existing = bestByRate.get(rate);
    if (!existing || row.score > existing.score) {
      bestByRate.set(rate, row);
    }
  }

  return [...bestByRate.values()];
}

function resolveBandsForMode(mode: RateRecommendMode): RateBand[] {
  if (mode === 'low') return ['low'];
  if (mode === 'high') return ['high'];
  return ['low', 'high'];
}

export function buildRateRecommendations(
  profile: ProbabilityProfile,
  options?: RateRecommendOptions,
): RateRecommendResult {
  const opts = normalizeOptions(options);

  if (profile.totalDigits <= 0) {
    return { masterNo: profile.masterNo, recommendations: [], options: opts };
  }

  const dualWeights = buildDualBandPositionWeights(profile);
  const pool =
    opts.mode === 'middle'
      ? scoreMiddleCandidates(profile, opts)
      : resolveBandsForMode(opts.mode).flatMap((band) =>
          scoreBandCandidates(
            profile,
            opts,
            band,
            band === 'low' ? dualWeights.low : dualWeights.high,
          ),
        );
  const merged = mergeCandidatesByRate(pool);

  merged.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return formatRate(a.intPart, a.decDigits).localeCompare(formatRate(b.intPart, b.decDigits));
  });

  const totalScore = merged.reduce((sum, row) => sum + row.score, 0) || 1;
  const recommendations: RateRecommendation[] = merged.slice(0, opts.count).map((row, index) => {
    const rawPct = totalScore > 0 ? (row.score / totalScore) * 100 : 0;
    const probability = rawPct > 0 && rawPct < 0.1 ? 0.1 : Math.round(rawPct * 10) / 10;
    return {
      rank: index + 1,
      rate: formatRate(row.intPart, row.decDigits),
      probability,
      band: row.band,
      rationale: buildRationale(row.intPart, row.decDigits, row.band, profile),
    };
  });

  return {
    masterNo: profile.masterNo,
    recommendations,
    options: opts,
  };
}

export function buildRateRecommendationsFromEmpty(masterNo: string): RateRecommendResult {
  return buildRateRecommendations(createEmptyProbabilityProfile(masterNo));
}
