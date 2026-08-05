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
import { filterDigitsByClass } from './analysisEngine';
import {
  analyzeCodeValueMainDetail,
  CODE_VALUE_MAIN_RULES,
  getPatternValuesMatchCount,
  type CodeValueSubAnalysisRow,
} from './codeValueSubAnalysis';
import {
  getDigitSubBand,
  getDigitsInSubBand,
  getMainBandLabel,
  getSubBandLabel,
  getSubBandMainBand,
  type DigitBand,
  type DigitSubBand,
} from './digitSubBand';
import {
  RECENT_DISPLAY_TAIL,
  sliceRecentDigitScoreTail,
  fullMasterSequence,
} from './recentCompare';
import {
  digitHintsFromMasterSource,
  digitHintsFromPointValueToken,
  isPatternCountField,
} from './patternDigitGuard';

/** S′/S″ 한 토큰 — run 길이(value)와 Raw source digit 분리 */
export interface PointValueToken {
  /** S′ 값 (단독 digit 또는 run 길이) */
  value: number;
  /** Raw Point Values에서의 실제 digit (777 → value 3, sourceDigit 7) */
  sourceDigit: number;
  isRun: boolean;
}

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

/** Master(+prefix)에서 STEP2 Low / STEP3 High Point Values digit 열 */
export function getSidePointValues(
  result: AnalysisResult,
  prefix: string,
  side: DigitClass,
): string {
  const full = prefix.length > 0 ? result.digits + prefix : result.digits;
  return filterDigitsByClass(full, side);
}

/** Low/High Point Values → S′ 토큰 (run 길이 ↔ source digit 보존) */
export function buildPointValueTokens(pointValues: string): PointValueToken[] {
  const tokens: PointValueToken[] = [];
  if (!pointValues) return tokens;

  let i = 0;
  while (i < pointValues.length) {
    const ch = pointValues[i]!;
    const sourceDigit = Number(ch);
    let length = 1;
    i += 1;
    while (i < pointValues.length && pointValues[i] === ch) {
      length += 1;
      i += 1;
    }
    if (length === 1) {
      tokens.push({ value: sourceDigit, sourceDigit, isRun: false });
    } else {
      tokens.push({ value: length, sourceDigit, isRun: true });
    }
  }
  return tokens;
}

/** Low/High Point Values → 이명전기 S′ (단독 digit → 값, 연속 run → 길이) */
export function buildPointValuesSequence(pointValues: string): number[] {
  return buildPointValueTokens(pointValues).map((token) => token.value);
}

/** 패턴 Values의 S′ 값 → source digit (끝에서 n번째 동일 value) */
export function resolveSourceDigitForPatternValue(
  baseSequence: readonly number[],
  tokens: readonly PointValueToken[],
  value: number,
  occurrenceFromEnd = 0,
): number | null {
  let seen = 0;
  for (let i = baseSequence.length - 1; i >= 0; i -= 1) {
    if (baseSequence[i] !== value) continue;
    if (seen === occurrenceFromEnd) {
      return tokens[i]?.sourceDigit ?? null;
    }
    seen += 1;
  }
  return null;
}

function resolveRecentValueSources(
  values: readonly number[],
  baseSequence: readonly number[],
  tokens: readonly PointValueToken[],
): Array<{ value: number; sourceDigit: number | null }> {
  const occurrenceFromEnd = new Map<number, number>();
  const resolved: Array<{ value: number; sourceDigit: number | null }> = [];
  for (const value of fullMasterSequence(values)) {
    const occ = occurrenceFromEnd.get(value) ?? 0;
    resolved.push({
      value,
      sourceDigit: resolveSourceDigitForPatternValue(baseSequence, tokens, value, occ),
    });
    occurrenceFromEnd.set(value, occ + 1);
  }
  return resolved;
}

function formatPatternValueLabel(value: number, sourceDigit: number | null): string {
  if (sourceDigit === null) return String(value);
  if (sourceDigit === value) return String(value);
  return `${value}(→${sourceDigit})`;
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
  tokens: PointValueToken[];
  rows: CodeValueSubAnalysisRow[];
} {
  const tokens = buildPointValueTokens(pointValues);
  const baseSequence = tokens.map((token) => token.value);
  const detail = analyzeCodeValueMainDetail(baseSequence, side);
  return {
    pointValues,
    baseSequence,
    tokens,
    rows: detail.rows,
  };
}

/** S′/S″ 값 → 세부 구간 (source digit 우선 — 패턴 value로 digit·구간 직접 매핑 금지) */
export function pointSequenceValueToSubBandHints(
  value: number,
  mainBand: DigitBand,
  sourceDigit?: number,
): Array<{ sub: DigitSubBand; weight: number }> {
  if (sourceDigit !== undefined && Number.isInteger(sourceDigit)) {
    const sub = getDigitSubBand(sourceDigit);
    if (sub && getSubBandMainBand(sub) === mainBand) {
      return [{ sub, weight: 1 }];
    }
  }

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

/** S″ 값 → 구간 내 digit — Master source digit만 */
export function pointSequenceValueToDigitHints(
  value: number,
  subBand: DigitSubBand,
  sourceDigit?: number,
): Array<{ digit: number; weight: number }> {
  void value;
  return digitHintsFromMasterSource(sourceDigit, getDigitsInSubBand(subBand));
}

/** Point Value 토큰 → digit (source digit만) */
export function pointValueTokenToDigitHints(
  token: PointValueToken,
  subBand: DigitSubBand,
): Array<{ digit: number; weight: number }> {
  return digitHintsFromPointValueToken(token, getDigitsInSubBand(subBand));
}

function applySequenceTailToSubBandScores(
  tokens: readonly PointValueToken[],
  mainBand: DigitBand,
  scores: Map<DigitSubBand, number>,
): void {
  for (const token of tokens) {
    for (const hint of pointSequenceValueToSubBandHints(
      token.value,
      mainBand,
      token.sourceDigit,
    )) {
      scores.set(hint.sub, (scores.get(hint.sub) ?? 0) + 0.35 * hint.weight);
    }
  }
}

function scoreRowsToSubBand(
  rows: CodeValueSubAnalysisRow[],
  mainBand: DigitBand,
  baseSequence: readonly number[],
  tokens: readonly PointValueToken[],
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
    for (const { value: v, sourceDigit } of resolveRecentValueSources(
      row.values,
      baseSequence,
      tokens,
    )) {
      if (rule && isPatternCountField(rule.field) && sourceDigit === null) continue;
      for (const hint of pointSequenceValueToSubBandHints(
        v,
        mainBand,
        sourceDigit ?? undefined,
      )) {
        scores.set(hint.sub, (scores.get(hint.sub) ?? 0) + weight * hint.weight);
        reasons.push(
          `Point Values ${row.code} ${formatPatternValueLabel(v, sourceDigit)} → ${getSubBandLabel(hint.sub)}`,
        );
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

  const { baseSequence, tokens, rows } = analyzePointValuesPatterns(pointValues, side);
  reasons.push(`${pointLabel} S′ [${baseSequence.slice(-RECENT_DISPLAY_TAIL).join(', ')}]`);

  const scores = scoreRowsToSubBand(rows, mainBand, baseSequence, tokens, reasons);
  applySequenceTailToSubBandScores(tokens, mainBand, scores);
  if (tokens.length > 0) {
    const tailLabels = tokens
      .slice(-RECENT_DISPLAY_TAIL)
      .map((t) => formatPatternValueLabel(t.value, t.sourceDigit))
      .join(', ');
    reasons.push(`S′ 꼬리 [${tailLabels}]`);
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

function scoreDigitsFromPointValueTokens(
  tokens: readonly PointValueToken[],
  subBand: DigitSubBand,
  reasons: string[],
): Record<number, number> {
  const pool = getDigitsInSubBand(subBand);
  const scores: Record<number, number> = Object.fromEntries(pool.map((d) => [d, 0.1]));
  const scoringTokens = sliceRecentDigitScoreTail(tokens);

  if (tokens.length > scoringTokens.length) {
    reasons.push(
      `Point Values S″ digit 점수 — 최근 ${scoringTokens.length}토큰 (전체 ${tokens.length})`,
    );
  }

  for (const token of scoringTokens) {
    for (const hint of pointValueTokenToDigitHints(token, subBand)) {
      scores[hint.digit] = (scores[hint.digit] ?? 0.1) + 0.35 * hint.weight;
      reasons.push(
        `Point Values S″ ${formatPatternValueLabel(token.value, token.sourceDigit)} → digit ${hint.digit}`,
      );
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

  const { baseSequence, tokens, rows } = analyzePointValuesPatterns(pointValues, side);
  digitReasons.push(
    `${pointLabel}(${getSubBandLabel(subBand)}) S″ [${baseSequence.slice(-RECENT_DISPLAY_TAIL).join(', ')}]`,
  );

  for (const row of rows) {
    if (row.values.length > 0) codes.push(`PV ${row.code}`);
  }

  const patternScores = scoreDigitsFromPointValueTokens(tokens, subBand, digitReasons);

  if (tokens.length > 0) {
    const tailLabels = tokens
      .slice(-RECENT_DISPLAY_TAIL)
      .map((t) => formatPatternValueLabel(t.value, t.sourceDigit))
      .join(', ');
    digitReasons.push(`S″ 꼬리 [${tailLabels}]`);
  }

  return { scores: patternScores, codes, digitReasons };
}

export interface SubBandRuleCountRow {
  code: string;
  values: number[];
  count: number;
}

export interface SubBandPointValuesCountDetail {
  subBand: DigitSubBand;
  label: string;
  mainBand: DigitBand;
  filteredLength: number;
  baseSequenceTail: number[];
  activeRules: SubBandRuleCountRow[];
}

export interface SubBandComparisonDetail {
  mainBand: DigitBand;
  mainBandLabel: string;
  sPrimeTail: number[];
  scores: Partial<Record<DigitSubBand, number>>;
  selected: DigitSubBand;
}

export interface SubBandPointValuesCountsReport {
  details: SubBandPointValuesCountDetail[];
  lowComparison: SubBandComparisonDetail;
  highComparison: SubBandComparisonDetail;
}

const ALL_SUB_BANDS: readonly DigitSubBand[] = [
  'lowLow',
  'lowHigh',
  'highLow',
  'highHigh',
];

/** 저·고 각 2구간 S′ 10규칙 점수 (세분화 선택용) */
export function computeSubBandComparisonScores(
  result: AnalysisResult,
  prefix: string,
  mainBand: DigitBand,
): { scores: Partial<Record<DigitSubBand, number>>; sPrimeTail: number[] } {
  const side: DigitClass = mainBand === 'low' ? 'low' : 'high';
  const pointValues = getSidePointValues(result, prefix, side);
  const scores = new Map<DigitSubBand, number>();
  for (const sub of SUB_BANDS_FOR_MAIN[mainBand]) {
    scores.set(sub, 0);
  }

  if (pointValues.length === 0) {
    return { scores: Object.fromEntries(scores), sPrimeTail: [] };
  }

  const { baseSequence, tokens, rows } = analyzePointValuesPatterns(pointValues, side);
  const scoreMap = scoreRowsToSubBand(rows, mainBand, baseSequence, tokens, []);
  applySequenceTailToSubBandScores(tokens, mainBand, scoreMap);

  return {
    scores: Object.fromEntries(scoreMap),
    sPrimeTail: baseSequence.slice(-RECENT_DISPLAY_TAIL),
  };
}

function pickBestSubBand(
  scores: Partial<Record<DigitSubBand, number>>,
  candidates: readonly DigitSubBand[],
  fallback: DigitSubBand,
): DigitSubBand {
  let best = fallback;
  let bestScore = -1;
  for (const sub of candidates) {
    const score = scores[sub] ?? 0;
    if (score > bestScore) {
      bestScore = score;
      best = sub;
    }
  }
  return bestScore <= 0 ? fallback : best;
}

/** 4구간 Point Values + 10규칙 카운트 + 저·고 세분화 점수 비교 */
export function buildSubBandPointValueCounts(
  result: AnalysisResult,
  prefix: string,
): SubBandPointValuesCountsReport {
  const lowScores = computeSubBandComparisonScores(result, prefix, 'low');
  const highScores = computeSubBandComparisonScores(result, prefix, 'high');

  const details: SubBandPointValuesCountDetail[] = ALL_SUB_BANDS.map((subBand) => {
    const side: DigitClass = getSubBandMainBand(subBand) === 'low' ? 'low' : 'high';
    const filtered = filterPointValuesToSubBand(getSidePointValues(result, prefix, side), subBand);
    const tokens = buildPointValueTokens(filtered);
    const baseSequence = tokens.map((token) => token.value);
    const { rows } = analyzePointValuesPatterns(filtered, side);
    const activeRules = rows
      .filter((row) => row.values.length > 0)
      .map((row) => ({
        code: row.code,
        values: [...row.values],
        count: getPatternValuesMatchCount(row.values),
      }));

    return {
      subBand,
      label: getSubBandLabel(subBand),
      mainBand: getSubBandMainBand(subBand),
      filteredLength: filtered.length,
      baseSequenceTail: baseSequence.slice(-RECENT_DISPLAY_TAIL),
      activeRules,
    };
  });

  return {
    details,
    lowComparison: {
      mainBand: 'low',
      mainBandLabel: getMainBandLabel('low'),
      sPrimeTail: lowScores.sPrimeTail,
      scores: lowScores.scores,
      selected: pickBestSubBand(lowScores.scores, SUB_BANDS_FOR_MAIN.low, 'lowHigh'),
    },
    highComparison: {
      mainBand: 'high',
      mainBandLabel: getMainBandLabel('high'),
      sPrimeTail: highScores.sPrimeTail,
      scores: highScores.scores,
      selected: pickBestSubBand(highScores.scores, SUB_BANDS_FOR_MAIN.high, 'highLow'),
    },
  };
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
    const tokens = buildPointValueTokens(filtered);
    const baseSequence = tokens.map((token) => token.value);
    const { rows } = analyzePointValuesPatterns(filtered, side);
    const activeRules = rows.filter((r) => r.values.length > 0).map((r) => r.code);
    const digitHints = tokens.flatMap((token) =>
      pointSequenceValueToDigitHints(token.value, subBand, token.sourceDigit).map(
        (h) => h.digit,
      ),
    );
    return { subBand, samplePointValues: filtered, baseSequence, activeRules, digitHints };
  });

  const allSupported = details.every(
    (d) => d.baseSequence.length > 0 && d.digitHints.length > 0,
  );

  return { subBands, allSupported, details };
}
