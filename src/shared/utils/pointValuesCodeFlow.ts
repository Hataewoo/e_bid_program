/**
 * STEP2/3 Point Values (Low/High digit 열) → buildSideBaseSequence → Code/Values 10규칙.
 *
 * S run 길이(lowRunLengths)·1중복 세분화는 건드리지 않음.
 * 저·고 1단계는 기존 S Code/Values 유지, 2·3단계 세분화·digit 추천만 Point Values 사용.
 *
 * 저·고 4구간 대칭:
 * | 저점 | Low Point Values  | lowLow 0~1 | lowHigh 2~4 |
 * | 고점 | High Point Values | highLow 5~7 | highHigh 8~9 |
 */

import type { AnalysisResult, DigitClass } from './analysisEngine';
import { buildSideBaseSequence, filterDigitsByClass } from './analysisEngine';
import {
  analyzeCodeValueMainDetail,
  CODE_VALUE_MAIN_RULES,
  type CodeValueSubAnalysisRow,
} from './codeValueSubAnalysis';
import {
  getDigitsInSubBand,
  getSubBandLabel,
  getSubBandMainBand,
  type DigitBand,
  type DigitSubBand,
} from './digitSubBand';

const PATTERN_FIELD_WEIGHTS: Record<string, number> = {
  oneDuplicate: 1.0,
  commaAlpha_2_3: 0.85,
  plusAlpha_3_2: 0.85,
  plusAlpha_4_3: 0.8,
  plusAlpha_4_4: 0.75,
  threeOrMore: 0.7,
  fiveOrMore: 0.65,
  oneBetween: 0.8,
  alphaPlus_3_2: 0.85,
  alphaPlus_4_3: 0.85,
};

const SUB_BANDS_FOR_MAIN: Record<DigitBand, readonly DigitSubBand[]> = {
  low: ['lowLow', 'lowHigh'],
  high: ['highLow', 'highHigh'],
};

/** mainBand별 digit → 세부 구간 (S′ singleton 매핑) */
const SINGLETON_SUB_BAND: Record<DigitBand, ReadonlyArray<{ digit: number; sub: DigitSubBand }>> = {
  low: [
    { digit: 0, sub: 'lowLow' },
    { digit: 1, sub: 'lowLow' },
    { digit: 2, sub: 'lowHigh' },
    { digit: 3, sub: 'lowHigh' },
    { digit: 4, sub: 'lowHigh' },
  ],
  high: [
    { digit: 5, sub: 'highLow' },
    { digit: 6, sub: 'highLow' },
    { digit: 7, sub: 'highLow' },
    { digit: 8, sub: 'highHigh' },
    { digit: 9, sub: 'highHigh' },
  ],
};

/** Master(+prefix)에서 STEP2 Low / STEP3 High Point Values digit 열 */
export function getSidePointValues(
  result: AnalysisResult,
  prefix: string,
  side: DigitClass,
): string {
  const full = prefix.length > 0 ? result.digits + prefix : result.digits;
  return filterDigitsByClass(full, side);
}

/** Low/High Point Values → 이명전기 S′ (단독 digit → 값, 연속 run → 길이) */
export function buildPointValuesSequence(pointValues: string): number[] {
  return buildSideBaseSequence(pointValues);
}

/** 세부 구간 digit만 순서 유지 추출 */
export function filterPointValuesToSubBand(pointValues: string, subBand: DigitSubBand): string {
  const allowed = new Set(getDigitsInSubBand(subBand));
  let out = '';
  for (let i = 0; i < pointValues.length; i += 1) {
    const d = Number(pointValues[i]);
    if (allowed.has(d)) out += pointValues[i];
  }
  return out;
}

export function analyzePointValuesPatterns(
  pointValues: string,
  side: DigitClass,
): {
  pointValues: string;
  baseSequence: number[];
  rows: CodeValueSubAnalysisRow[];
} {
  const baseSequence = buildPointValuesSequence(pointValues);
  const detail = analyzeCodeValueMainDetail(baseSequence, side);
  return {
    pointValues,
    baseSequence,
    rows: detail.rows,
  };
}

function equalWeightHints(items: readonly number[], weight: number): Array<{ item: number; weight: number }> {
  return items.map((item) => ({ item, weight }));
}

/** S′/S″ 값 → 세부 구간 (저·고 대칭) */
export function pointSequenceValueToSubBandHints(
  value: number,
  mainBand: DigitBand,
): Array<{ sub: DigitSubBand; weight: number }> {
  const hints: Array<{ sub: DigitSubBand; weight: number }> = [];

  for (const entry of SINGLETON_SUB_BAND[mainBand]) {
    if (entry.digit === value) {
      hints.push({ sub: entry.sub, weight: 1 });
    }
  }
  if (hints.length > 0) return hints;

  const [lowSub, highSub] = SUB_BANDS_FOR_MAIN[mainBand];

  if (mainBand === 'low') {
    if (value === 2) {
      return [
        { sub: lowSub, weight: 0.5 },
        { sub: highSub, weight: 0.5 },
      ];
    }
    if (value >= 3) return [{ sub: highSub, weight: 0.55 }];
    return [];
  }

  if (value === 2) {
    return [
      { sub: lowSub, weight: 0.5 },
      { sub: highSub, weight: 0.5 },
    ];
  }
  if (value >= 3 && value <= 4) return [{ sub: lowSub, weight: 0.55 }];
  if (value >= 8) return [{ sub: highSub, weight: 0.55 }];
  return [];
}

/** S″ 값 → 구간 내 digit (0/1 · 2~4 · 5~7 · 8/9 대칭) */
export function pointSequenceValueToDigitHints(
  value: number,
  subBand: DigitSubBand,
): Array<{ digit: number; weight: number }> {
  const pool = getDigitsInSubBand(subBand);
  if (pool.includes(value)) return [{ digit: value, weight: 1 }];

  if (value === 2) {
    return equalWeightHints(pool, 0.5).map(({ item, weight }) => ({ digit: item, weight }));
  }

  if (subBand === 'lowHigh' && value >= 3 && value <= 4) {
    return [{ digit: value, weight: 0.85 }];
  }
  if (subBand === 'highLow' && value >= 3 && value <= 4) {
    return equalWeightHints(pool, 0.35).map(({ item, weight }) => ({ digit: item, weight }));
  }
  if (subBand === 'highHigh' && value >= 3) {
    return equalWeightHints(pool, 0.45).map(({ item, weight }) => ({ digit: item, weight }));
  }

  return [];
}

function applySequenceTailToSubBandScores(
  baseSequence: number[],
  mainBand: DigitBand,
  scores: Map<DigitSubBand, number>,
  tailSize = 3,
): void {
  for (const v of baseSequence.slice(-tailSize)) {
    for (const hint of pointSequenceValueToSubBandHints(v, mainBand)) {
      scores.set(hint.sub, (scores.get(hint.sub) ?? 0) + 0.35 * hint.weight);
    }
  }
}

function scoreRowsToSubBand(
  rows: CodeValueSubAnalysisRow[],
  mainBand: DigitBand,
  reasons: string[],
): Map<DigitSubBand, number> {
  const scores = new Map<DigitSubBand, number>();
  for (const sub of SUB_BANDS_FOR_MAIN[mainBand]) {
    scores.set(sub, 0);
  }

  for (const row of rows) {
    if (row.values.length === 0) continue;
    const rule = CODE_VALUE_MAIN_RULES.find((r) => r.code === row.code);
    const weight = rule ? (PATTERN_FIELD_WEIGHTS[rule.field] ?? 0.5) : 0.5;
    for (const v of row.values.slice(-2)) {
      for (const hint of pointSequenceValueToSubBandHints(v, mainBand)) {
        scores.set(hint.sub, (scores.get(hint.sub) ?? 0) + weight * hint.weight * (1 + v * 0.05));
        reasons.push(`Point Values ${row.code} ${v} → ${getSubBandLabel(hint.sub)}`);
      }
    }
  }

  return scores;
}

/** Low/High Point Values + Code/Values → 세부 구간 (저·고 동일 파이프라인) */
export function resolveSubBandFromPointValues(
  result: AnalysisResult,
  prefix: string,
  mainBand: DigitBand,
): { sub: DigitSubBand; reasons: string[]; rows: CodeValueSubAnalysisRow[] } {
  const reasons: string[] = [];
  const side: DigitClass = mainBand === 'low' ? 'low' : 'high';
  const pointValues = getSidePointValues(result, prefix, side);
  const pointLabel = mainBand === 'low' ? 'Low Point Values' : 'High Point Values';

  if (pointValues.length === 0) {
    const fallback = mainBand === 'low' ? 'lowHigh' : 'highLow';
    reasons.push(`${pointLabel} 없음 → 기본 세부 구간`);
    return { sub: fallback, reasons, rows: [] };
  }

  const { baseSequence, rows } = analyzePointValuesPatterns(pointValues, side);
  reasons.push(`${pointLabel} S′ [${baseSequence.slice(-6).join(', ')}]`);

  const scores = scoreRowsToSubBand(rows, mainBand, reasons);
  applySequenceTailToSubBandScores(baseSequence, mainBand, scores);
  if (baseSequence.length > 0) {
    reasons.push(`S′ 꼬리 [${baseSequence.slice(-3).join(', ')}]`);
  }

  let best: DigitSubBand = SUB_BANDS_FOR_MAIN[mainBand][0]!;
  let bestScore = -1;
  for (const [sub, score] of scores) {
    if (score > bestScore) {
      bestScore = score;
      best = sub;
    }
  }

  if (bestScore <= 0) {
    best = mainBand === 'low' ? 'lowHigh' : 'highLow';
    reasons.push(`${pointLabel} 힌트 없음 → 기본 세부 구간`);
  }

  reasons.push(`세부 구간 ${getSubBandLabel(best)}`);
  return { sub: best, reasons, rows };
}

function scoreRowsToDigits(
  rows: CodeValueSubAnalysisRow[],
  subBand: DigitSubBand,
  reasons: string[],
): Record<number, number> {
  const pool = getDigitsInSubBand(subBand);
  const scores: Record<number, number> = Object.fromEntries(pool.map((d) => [d, 0.1]));

  for (const row of rows) {
    if (row.values.length === 0) continue;
    const rule = CODE_VALUE_MAIN_RULES.find((r) => r.code === row.code);
    const weight = rule ? (PATTERN_FIELD_WEIGHTS[rule.field] ?? 0.5) : 0.5;
    for (const v of row.values.slice(-2)) {
      for (const hint of pointSequenceValueToDigitHints(v, subBand)) {
        if (!pool.includes(hint.digit)) continue;
        scores[hint.digit] = (scores[hint.digit] ?? 0.1) + weight * hint.weight * (1 + v * 0.05);
        reasons.push(`Point Values ${row.code} ${v} → digit ${hint.digit}`);
      }
    }
  }

  return scores;
}

/** 세부 구간 확정 후 Point Values(해당 digit만) → digit 점수 (4구간 동일) */
export function scoreDigitsFromPointValues(
  result: AnalysisResult,
  prefix: string,
  subBand: DigitSubBand,
): { scores: Record<number, number>; codes: string[]; digitReasons: string[] } {
  const side: DigitClass = getSubBandMainBand(subBand) === 'low' ? 'low' : 'high';
  const pointLabel = side === 'low' ? 'Low Point Values' : 'High Point Values';
  const pointValues = filterPointValuesToSubBand(
    getSidePointValues(result, prefix, side),
    subBand,
  );
  const digitReasons: string[] = [];
  const codes: string[] = [];

  if (pointValues.length === 0) {
    return { scores: Object.fromEntries(getDigitsInSubBand(subBand).map((d) => [d, 0.1])), codes, digitReasons };
  }

  const { baseSequence, rows } = analyzePointValuesPatterns(pointValues, side);
  digitReasons.push(`${pointLabel}(${getSubBandLabel(subBand)}) S″ [${baseSequence.slice(-6).join(', ')}]`);

  for (const row of rows) {
    if (row.values.length > 0) codes.push(`PV ${row.code}`);
  }

  const patternScores = scoreRowsToDigits(rows, subBand, digitReasons);

  for (const v of baseSequence.slice(-3)) {
    for (const hint of pointSequenceValueToDigitHints(v, subBand)) {
      patternScores[hint.digit] =
        (patternScores[hint.digit] ?? 0.1) + 0.35 * hint.weight;
    }
  }
  if (baseSequence.length > 0) {
    digitReasons.push(`S″ 꼬리 [${baseSequence.slice(-3).join(', ')}]`);
  }

  return { scores: patternScores, codes, digitReasons };
}

/** 4구간 모두 Point Values + 10규칙 파이프라인 지원 여부 */
export function verifyPointValuesSubBandAnalysis(mainBand: DigitBand): {
  subBands: DigitSubBand[];
  allSupported: boolean;
  details: Array<{
    subBand: DigitSubBand;
    samplePointValues: string;
    baseSequence: number[];
    activeRules: string[];
    digitHints: number[];
  }>;
} {
  const samples: Record<DigitSubBand, string> = {
    lowLow: '00101',
    lowHigh: '23423',
    highLow: '56765',
    highHigh: '898',
  };

  const subBands = [...SUB_BANDS_FOR_MAIN[mainBand]];
  const side: DigitClass = mainBand === 'low' ? 'low' : 'high';
  const details = subBands.map((subBand) => {
    const sample = samples[subBand];
    const filtered = filterPointValuesToSubBand(sample, subBand);
    const baseSequence = buildPointValuesSequence(filtered);
    const { rows } = analyzePointValuesPatterns(filtered, side);
    const activeRules = rows.filter((r) => r.values.length > 0).map((r) => r.code);
    const digitHints = baseSequence.flatMap((v) =>
      pointSequenceValueToDigitHints(v, subBand).map((h) => h.digit),
    );
    return { subBand, samplePointValues: filtered, baseSequence, activeRules, digitHints };
  });

  const allSupported = details.every(
    (d) => d.baseSequence.length > 0 && d.digitHints.length > 0,
  );

  return { subBands, allSupported, details };
}
