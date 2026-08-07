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

import type { AnalysisResult, DigitClass, SidePatterns } from './analysisEngine';
import { extractCodeValuesFromBaseSequence, filterDigitsByClass } from './analysisEngine';
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
  isCodeValuePatternField,
  isPatternCountField,
  subBandHintsFromSourceDigit,
} from './patternDigitGuard';
import {
  applySubBandPhaseToScores,
  type SubBandPhaseResult,
  virtualMasterDigits,
} from './subBandRepeatJudgment';

export { virtualMasterDigits } from './subBandRepeatJudgment';

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

/** 세분화 — Side PV 꼬리 마지막 source digit 구간 (현재 run 위치) */
const LAST_SOURCE_SUB_BAND_BOOST = 2.5;
/** 저고/고고 — S″ PV 점수가 경쟁력 있을 때 형제 세분 소폭 가점 */
const SUB_BAND_SIBLING_PATTERN_BOOST = 2;
const SUB_BAND_SIBLING_PATTERN_LEAD_BOOST = 2.5;

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

/** 패턴 value → S″ 토큰 (끝에서 n번째 동일 value) */
function resolveTokenForPatternValue(
  baseSequence: readonly number[],
  tokens: readonly PointValueToken[],
  value: number,
  occurrenceFromEnd = 0,
): PointValueToken | null {
  let seen = 0;
  for (let i = baseSequence.length - 1; i >= 0; i -= 1) {
    if (baseSequence[i] !== value) continue;
    if (seen === occurrenceFromEnd) {
      return tokens[i] ?? null;
    }
    seen += 1;
  }
  return null;
}

function resolveRecentValueSources(
  values: readonly number[],
  baseSequence: readonly number[],
  tokens: readonly PointValueToken[],
): Array<{ value: number; sourceDigit: number | null; isRun: boolean }> {
  const occurrenceFromEnd = new Map<number, number>();
  const resolved: Array<{ value: number; sourceDigit: number | null; isRun: boolean }> = [];
  for (const value of fullMasterSequence(values)) {
    const occ = occurrenceFromEnd.get(value) ?? 0;
    const token = resolveTokenForPatternValue(baseSequence, tokens, value, occ);
    resolved.push({
      value,
      sourceDigit: token?.sourceDigit ?? null,
      isRun: token?.isRun ?? false,
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

/** S′/S″·Code/Values → 세부 구간 — source digit만 (패턴 Values 직접 매핑 금지) */
export function pointSequenceValueToSubBandHints(
  value: number,
  mainBand: DigitBand,
  sourceDigit?: number,
  options?: { isRun?: boolean; patternField?: string },
): Array<{ sub: DigitSubBand; weight: number }> {
  void value;
  void options;
  return subBandHintsFromSourceDigit(sourceDigit, mainBand);
}

function fallbackSubBandFromPointValueTail(
  tokens: readonly PointValueToken[],
  mainBand: DigitBand,
): DigitSubBand | null {
  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    const token = tokens[i]!;
    const sub = getDigitSubBand(token.sourceDigit);
    if (sub && getSubBandMainBand(sub) === mainBand) return sub;
  }
  return null;
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
  for (const token of sliceRecentDigitScoreTail(tokens)) {
    for (const hint of pointSequenceValueToSubBandHints(
      token.value,
      mainBand,
      token.sourceDigit,
      { isRun: token.isRun },
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
    for (const { value: v, sourceDigit, isRun } of resolveRecentValueSources(
      row.values,
      baseSequence,
      tokens,
    )) {
      if (sourceDigit === null || sourceDigit === undefined) continue;
      // S″ count 규칙(1중복·3이상·5이상) — run 길이 토큰만 (단독 digit value 제외)
      if (isPatternCountField(rule?.field) && !isRun) continue;

      const hints = pointSequenceValueToSubBandHints(
        v,
        mainBand,
        sourceDigit,
        { patternField: rule?.field },
      );
      if (hints.length === 0) continue;
      for (const hint of hints) {
        scores.set(hint.sub, (scores.get(hint.sub) ?? 0) + weight * hint.weight);
        const label = formatPatternValueLabel(v, sourceDigit);
        const via = isCodeValuePatternField(rule?.field)
          ? `판단(${row.code}) → source ${sourceDigit}`
          : `source ${sourceDigit}`;
        reasons.push(
          `Point Values ${row.code} ${label} ${via} → ${getSubBandLabel(hint.sub)}`,
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
  const candidates = SUB_BANDS_FOR_MAIN[mainBand];

  if (pointValues.length === 0) {
    reasons.push(`${pointLabel} 없음 → Master 꼬리 source digit`);
    if (prefix.length > 0) {
      const masterTail = Number(result.digits[result.digits.length - 1]);
      if (Number.isInteger(masterTail)) {
        const tailSub = getDigitSubBand(masterTail);
        const tailMain = tailSub ? getSubBandMainBand(tailSub) : null;
        if (tailMain && tailMain !== mainBand) {
          const secondary = candidates[1] ?? candidates[0]!;
          reasons.push(`저·고 전환 append → ${getSubBandLabel(secondary)} 우선`);
          return { sub: secondary, reasons, rows: [] };
        }
      }
    }
    return { sub: candidates[0]!, reasons, rows: [] };
  }

  reasons.push(`${pointLabel} digit ${pointValues.length}자`);

  const perSubScores: Partial<Record<DigitSubBand, number>> = {};
  const rawPvScores: Partial<Record<DigitSubBand, number>> = {};
  let mergedRows: CodeValueSubAnalysisRow[] = [];

  for (const subBand of candidates) {
    const { score, rows } = scoreFilteredSubBandPointValues(result, prefix, subBand, reasons);
    perSubScores[subBand] = score;
    rawPvScores[subBand] = score;
    if (rows.length > 0) mergedRows = rows;
  }

  let phaseInfo: SubBandPhaseResult;
  if (prefix.length > 0) {
    reasons.push('② 2자리~ — S″ PV 패턴만 (run-phase 미사용)');
    phaseInfo = {
      phase: 'transition',
      label: '패턴 전용',
      currentSub: null,
      siblingSub: null,
    };
  } else {
    phaseInfo = applySubBandPhaseToScores(
      result,
      prefix,
      mainBand,
      perSubScores,
      candidates,
      reasons,
    );
  }

  applySubBandSiblingPatternBoost(perSubScores, rawPvScores, candidates, reasons);

  if (prefix.length === 0) {
    if (phaseInfo.phase === 'repeat' && phaseInfo.currentSub) {
      applyLastSourceDigitSubBandBoost(pointValues, perSubScores, candidates);
      const lastToken = buildPointValueTokens(pointValues).at(-1);
      if (lastToken) {
        reasons.push(
          `Side PV 마지막 source ${lastToken.sourceDigit} → ${getSubBandLabel(phaseInfo.currentSub)} run 가중`,
        );
      }
    } else {
      const lastToken = buildPointValueTokens(pointValues).at(-1);
      if (lastToken && phaseInfo.siblingSub) {
        reasons.push(
          `Side PV 마지막 source ${lastToken.sourceDigit} → ${getSubBandLabel(phaseInfo.siblingSub)} 전환 후보`,
        );
      }
    }
  }

  const normalizedPickScores: Partial<Record<DigitSubBand, number>> = {};
  for (const subBand of candidates) {
    const filtered = filteredPointValuesForSubBand(result, prefix, subBand);
    normalizedPickScores[subBand] = normalizeSubBandPatternScore(
      perSubScores[subBand] ?? 0,
      filtered,
    );
  }
  applyNormalizedSiblingTieBreak(normalizedPickScores, candidates, reasons);

  const best = pickBestSubBand(normalizedPickScores, candidates, pointValues);
  reasons.push(`세부 구간 ${getSubBandLabel(best)}`);
  return { sub: best, reasons, rows: mergedRows };
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

/** 레거시 STEP2/3 — 세분화 구간 Point Values + S′ + 10규칙 */
export interface StepSubBandLegacyDetail {
  subBand: DigitSubBand;
  side: DigitClass;
  filteredPointValues: string;
  sPrimeSequence: number[];
  patterns: SidePatterns;
}

export function formatSPrimeCommaList(sequence: readonly number[]): string {
  if (sequence.length === 0) return '';
  return sequence.join(', ');
}

/** STEP2 또는 STEP3에 해당하는 2개 세분화 구간 데이터 */
export function buildStepSubBandLegacyDetails(
  result: AnalysisResult,
  prefix: string,
  mainBand: DigitBand,
): StepSubBandLegacyDetail[] {
  const side: DigitClass = mainBand === 'low' ? 'low' : 'high';
  return SUB_BANDS_FOR_MAIN[mainBand].map((subBand) => {
    const filteredPointValues = filterPointValuesToSubBand(
      getSidePointValues(result, prefix, side),
      subBand,
    );
    const tokens = buildPointValueTokens(filteredPointValues);
    const sPrimeSequence = tokens.map((token) => token.value);
    const patterns = extractCodeValuesFromBaseSequence(sPrimeSequence, side);
    return { subBand, side, filteredPointValues, sPrimeSequence, patterns };
  });
}

const ALL_SUB_BANDS: readonly DigitSubBand[] = [
  'lowLow',
  'lowHigh',
  'highLow',
  'highHigh',
];

/** 4구간 각각 — 해당 digit만 필터한 Point Values + source digit 기반 패턴 점수 */
export function scoreEachSubBandFromFilteredPointValues(
  result: AnalysisResult,
  prefix: string,
): Map<DigitSubBand, number> {
  const merged = new Map<DigitSubBand, number>();
  for (const sub of ALL_SUB_BANDS) {
    merged.set(sub, 0);
  }

  for (const subBand of ALL_SUB_BANDS) {
    const filtered = filteredPointValuesForSubBand(result, prefix, subBand);
    const { score } = scoreFilteredSubBandPointValues(result, prefix, subBand, []);
    merged.set(subBand, normalizeSubBandPatternScore(score, filtered));
  }

  return merged;
}

/** 저·고 각 2구간 S′ 10규칙 점수 (세분화 선택용) */
export function computeSubBandComparisonScores(
  result: AnalysisResult,
  prefix: string,
  mainBand: DigitBand,
): { scores: Partial<Record<DigitSubBand, number>>; sPrimeTail: number[] } {
  const side: DigitClass = mainBand === 'low' ? 'low' : 'high';
  const pointValues = getSidePointValues(result, prefix, side);
  const scores: Partial<Record<DigitSubBand, number>> = {};
  let sPrimeTail: number[] = [];

  if (pointValues.length === 0) {
    for (const sub of SUB_BANDS_FOR_MAIN[mainBand]) scores[sub] = 0;
    return { scores, sPrimeTail };
  }

  for (const sub of SUB_BANDS_FOR_MAIN[mainBand]) {
    const filtered = filterPointValuesToSubBand(pointValues, sub);
    const { score, sPrimeTail: tail } = scoreFilteredSubBandPointValues(result, prefix, sub, []);
    scores[sub] = normalizeSubBandPatternScore(score, filtered);
    if (tail.length > 0) sPrimeTail = tail;
  }

  return { scores, sPrimeTail };
}

/** Side PV 필터 문자열 — 세분 구간별 */
function filteredPointValuesForSubBand(
  result: AnalysisResult,
  prefix: string,
  subBand: DigitSubBand,
): string {
  const mainBand = getSubBandMainBand(subBand);
  const side: DigitClass = mainBand === 'low' ? 'low' : 'high';
  return filterPointValuesToSubBand(getSidePointValues(result, prefix, side), subBand);
}

/** 토큰 수 편향 제거 — 최근 S″ 토큰 밀도로 형제 구간 비교 */
function normalizeSubBandPatternScore(rawScore: number, filteredPointValues: string): number {
  const tokens = sliceRecentDigitScoreTail(buildPointValueTokens(filteredPointValues));
  return rawScore / Math.max(1, tokens.length);
}

function applyLastSourceDigitSubBandBoost(
  pointValues: string,
  scores: Partial<Record<DigitSubBand, number>>,
  candidates: readonly DigitSubBand[],
): void {
  const tokens = buildPointValueTokens(pointValues);
  const last = tokens[tokens.length - 1];
  if (!last) return;
  const sub = getDigitSubBand(last.sourceDigit);
  if (sub && candidates.includes(sub)) {
    scores[sub] = (scores[sub] ?? 0) + LAST_SOURCE_SUB_BAND_BOOST;
  }
}

/** @deprecated raw 점수 형제 가점 — 정규화 동률 tie-break 로 대체 */
function applySubBandSiblingPatternBoost(
  _scores: Partial<Record<DigitSubBand, number>>,
  _rawPvScores: Partial<Record<DigitSubBand, number>>,
  _candidates: readonly DigitSubBand[],
  _reasons: string[],
): void {
  void _scores;
  void _rawPvScores;
  void _candidates;
  void _reasons;
}

/** 정규화 S″ 밀도가 비슷할 때만 형제 구간 tie-break */
function applyNormalizedSiblingTieBreak(
  scores: Partial<Record<DigitSubBand, number>>,
  candidates: readonly DigitSubBand[],
  reasons: string[],
): void {
  if (candidates.length < 2) return;

  const lower = candidates[0]!;
  const higher = candidates[1]!;
  const normLower = scores[lower] ?? 0;
  const normHigher = scores[higher] ?? 0;
  if (normLower <= 0 && normHigher <= 0) return;

  const diff = Math.abs(normHigher - normLower);
  if (diff > 0.08) return;

  const leader = normHigher >= normLower ? higher : lower;
  scores[leader] = (scores[leader] ?? 0) + SUB_BAND_SIBLING_PATTERN_BOOST * 0.5;
  reasons.push(
    `② ${getSubBandLabel(leader)} S″ 동률 근접 (+${(SUB_BAND_SIBLING_PATTERN_BOOST * 0.5).toFixed(1)}, ${normHigher.toFixed(2)} vs ${normLower.toFixed(2)})`,
  );
}

function pickBestSubBand(
  scores: Partial<Record<DigitSubBand, number>>,
  candidates: readonly DigitSubBand[],
  sidePointValues: string,
): DigitSubBand {
  const ranked = candidates
    .map((sub) => ({ sub, score: scores[sub] ?? 0 }))
    .sort((a, b) => b.score - a.score);

  const top = ranked[0];
  if (!top || top.score <= 0) {
    const tailSub = fallbackSubBandFromPointValueTail(
      buildPointValueTokens(sidePointValues),
      getSubBandMainBand(candidates[0]!),
    );
    if (tailSub && candidates.includes(tailSub)) return tailSub;
    return candidates[0] ?? candidates[candidates.length - 1]!;
  }

  const second = ranked[1];
  if (second && second.score === top.score) {
    const tailSub = fallbackSubBandFromPointValueTail(
      buildPointValueTokens(sidePointValues),
      getSubBandMainBand(candidates[0]!),
    );
    if (tailSub && candidates.includes(tailSub)) return tailSub;
  }

  return top.sub;
}

function scoreFilteredSubBandPointValues(
  result: AnalysisResult,
  prefix: string,
  subBand: DigitSubBand,
  reasons: string[],
): { score: number; rows: CodeValueSubAnalysisRow[]; sPrimeTail: number[] } {
  const mainBand = getSubBandMainBand(subBand);
  const side: DigitClass = mainBand === 'low' ? 'low' : 'high';
  const filtered = filterPointValuesToSubBand(getSidePointValues(result, prefix, side), subBand);
  if (filtered.length === 0) {
    return { score: 0, rows: [], sPrimeTail: [] };
  }

  const { baseSequence, tokens, rows } = analyzePointValuesPatterns(filtered, side);
  const scoreMap = scoreRowsToSubBand(rows, mainBand, baseSequence, tokens, reasons);
  applySequenceTailToSubBandScores(tokens, mainBand, scoreMap);
  const score = scoreMap.get(subBand) ?? 0;
  if (score > 0) {
    reasons.push(
      `${getSubBandLabel(subBand)} 필터 S′ [${baseSequence.slice(-RECENT_DISPLAY_TAIL).join(', ')}] → ${score.toFixed(1)}`,
    );
  }
  return { score, rows, sPrimeTail: baseSequence.slice(-RECENT_DISPLAY_TAIL) };
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

  const sidePointValues = (band: DigitBand) =>
    getSidePointValues(result, prefix, band === 'low' ? 'low' : 'high');

  return {
    details,
    lowComparison: {
      mainBand: 'low',
      mainBandLabel: getMainBandLabel('low'),
      sPrimeTail: lowScores.sPrimeTail,
      scores: lowScores.scores,
      selected: pickBestSubBand(lowScores.scores, SUB_BANDS_FOR_MAIN.low, sidePointValues('low')),
    },
    highComparison: {
      mainBand: 'high',
      mainBandLabel: getMainBandLabel('high'),
      sPrimeTail: highScores.sPrimeTail,
      scores: highScores.scores,
      selected: pickBestSubBand(highScores.scores, SUB_BANDS_FOR_MAIN.high, sidePointValues('high')),
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
