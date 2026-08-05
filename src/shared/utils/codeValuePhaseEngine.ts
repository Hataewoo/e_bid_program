import {
  CODE_VALUE_ALPHA_MAX,
  extractCodeValuesFromBaseSequence,
  MATCH_RULES,
  PATTERN_FIELD_LABELS,
  STEP2_CODE_VALUE_RULES,
  type AnalysisResult,
  type BetweenMarkerRule,
  type DigitClass,
  type SidePatterns,
} from './analysisEngine';
import type { LiveSegmentState } from './runSegmentEngine';
import { pickBalancedDigitAvoidingPatternValue } from './patternDigitGuard';

const PATTERN_FIELDS = Object.keys(PATTERN_FIELD_LABELS) as (keyof SidePatterns)[];
const BETWEEN_FIELDS: (keyof SidePatterns)[] = [
  'oneBetween',
  'alphaPlus_3_2',
  'alphaPlus_4_3',
  'plusAlpha_4_4',
  'commaAlpha_2_3',
  'plusAlpha_3_2',
  'plusAlpha_4_3',
];

/** S·digit 추천 공통 풀 — 0~9 전부 (저·고점 구분 없음) */
export const ALL_S_DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

/** digit 추천 — 같은 숫자 연속 run 최소화 */
const MAX_DIGIT_STREAK = 1;

/** Master 참고 — 선택 Master Value 전체 S 패턴 */
export const RECENT_PATTERN_LOOKBACK_MIN = 0;
export const RECENT_PATTERN_LOOKBACK_MAX = Number.MAX_SAFE_INTEGER;
export const RECENT_PATTERN_LOOKBACK = Number.MAX_SAFE_INTEGER;

export interface PatternSlotRecommendation {
  field: keyof SidePatterns;
  patternLabel: string;
  nextS: number;
  phase: PatternPhaseKind;
  fit: number;
  reason: string;
}

export type PatternPhaseKind = 'repeat' | 'transition';

export interface PhaseRecommendation {
  phase: PatternPhaseKind;
  patternLabel: string;
  field: keyof SidePatterns;
  fit: number;
  /** 완료 시 S(primary run length)에 추가될 값 후보 */
  nextSValues: number[];
  expectedRunLength?: number;
  remainingInRun?: number;
  runEndsAfterNext?: boolean;
  nextClass?: DigitClass;
  reason: string;
}

export interface PatternTransitionHints {
  /** fromLabel → toLabel → 최근성 가중(0~1, 참고용·빈도 아님) */
  transitions: Map<string, Map<string, number>>;
}

export function sliceRecentRunLengths(
  runLengths: number[],
  lookback = RECENT_PATTERN_LOOKBACK,
): number[] {
  void lookback;
  return [...runLengths];
}

/** Master S 전체에서 해당 Code Value 필드 Values */
export function recentPatternFieldValues(
  masterS: number[],
  side: DigitClass,
  field: keyof SidePatterns,
  lookback = RECENT_PATTERN_LOOKBACK,
): number[] {
  void lookback;
  const patterns = extractCodeValuesFromBaseSequence(masterS, side);
  return [...(patterns[field] ?? [])];
}

function oppositeSide(side: DigitClass): DigitClass {
  return side === 'low' ? 'high' : 'low';
}

function valueInRuleRange(
  value: number,
  min: number | undefined,
  max: number | undefined,
): boolean {
  if (min === undefined) return false;
  const upper = max ?? CODE_VALUE_ALPHA_MAX;
  return value >= min && value <= upper;
}

function buildCountMatch(rule: BetweenMarkerRule): (value: number) => boolean {
  return (value: number) => {
    if (rule.countExact !== undefined) return value === rule.countExact;
    return valueInRuleRange(value, rule.countMin, rule.countMax);
  };
}

function buildMarkerMatch(rule: BetweenMarkerRule): (value: number) => boolean {
  return (value: number) => {
    if (rule.markerExact !== undefined) return value === rule.markerExact;
    return valueInRuleRange(value, rule.markerMin, rule.markerMax);
  };
}

export function dominantPatternLabel(s: number[], side: DigitClass): string {
  const patterns = extractCodeValuesFromBaseSequence(s, side);
  for (const field of PATTERN_FIELDS) {
    const values = patterns[field];
    if (values && values.length > 0) {
      return PATTERN_FIELD_LABELS[field][side];
    }
  }
  return 'S run';
}

/** Master 최근 S에서 패턴 전환 — 최신 전환만 참고 (빈도 누적 없음) */
export function buildPatternTransitionHints(
  runLengths: number[],
  side: DigitClass,
  lookback = RECENT_PATTERN_LOOKBACK,
): PatternTransitionHints {
  const recent = sliceRecentRunLengths(runLengths, lookback);
  const transitions = new Map<string, Map<string, number>>();
  let prev = '';

  for (let i = 0; i < recent.length; i += 1) {
    const prefix = recent.slice(0, i + 1);
    const label = dominantPatternLabel(prefix, side);
    if (prev && prev !== label) {
      const nextMap = transitions.get(prev) ?? new Map<string, number>();
      const weight = (i + 1) / recent.length;
      const prevWeight = nextMap.get(label) ?? 0;
      nextMap.set(label, Math.max(prevWeight, weight));
      transitions.set(prev, nextMap);
    }
    prev = label;
  }

  return { transitions };
}

function analyzeOpenBetween(
  s: number[],
  side: DigitClass,
  field: keyof SidePatterns,
  rule: BetweenMarkerRule,
  runProgress: number,
  recentMaster: number[],
  slotIndex: number,
): PhaseRecommendation | null {
  if (!rule.pairsOnly || rule.markerExact === undefined) return null;

  const isMarker = buildMarkerMatch(rule);
  const countMatch = buildCountMatch(rule);
  const label = PATTERN_FIELD_LABELS[field][side];
  const sideTag = side === 'low' ? '저점' : '고점';

  let lastMarkerIdx = -1;
  for (let i = s.length - 1; i >= 0; i -= 1) {
    if (isMarker(s[i]!)) {
      lastMarkerIdx = i;
      break;
    }
  }
  if (lastMarkerIdx < 0) return null;

  const gap = s.slice(lastMarkerIdx + 1);
  const qualifying = gap.filter(countMatch).length;
  const needMin = rule.countMin ?? rule.countExact ?? 1;
  const marker = rule.markerExact;
  const pool = buildNextSPoolFromPattern(field, side, recentMaster, slotIndex);

  if (qualifying >= needMin) {
    const rem = Math.max(0, marker - runProgress);
    const nextSValues =
      marker >= 0 && marker <= 9
        ? [marker, ...pool.filter((v) => v !== marker)]
        : pool;
    return {
      phase: 'transition',
      patternLabel: label,
      field,
      fit: 0.82,
      nextSValues: nextSValues.slice(0, 6),
      expectedRunLength: marker,
      remainingInRun: rem,
      runEndsAfterNext: rem <= 1 && runProgress >= marker - 1,
      nextClass: side,
      reason: `${sideTag} · ${label} gap ${qualifying}/${needMin} · 마커 ${marker}`,
    };
  }

  return {
    phase: 'repeat',
    patternLabel: label,
    field,
    fit: 0.7,
    nextSValues: pool.slice(0, 6),
    expectedRunLength: runProgress >= 2 ? runProgress : 1,
    remainingInRun: 0,
    runEndsAfterNext: false,
    nextClass: side,
    reason: `${sideTag} · ${label} gap ${qualifying}/${needMin} · Master [${pool.slice(0, 3).join(',')}]`,
  };
}

function trailingOnesCount(s: number[]): number {
  let count = 0;
  for (let i = s.length - 1; i >= 0; i -= 1) {
    if (s[i] === 1) count += 1;
    else break;
  }
  return count;
}

/** 0~9 균형 순서 — 슬롯 짝수: 저점(0~4) 우선, 홀수: 고점(5~9) 우선 */
export function balancedDigitOrder(slotIndex: number): number[] {
  const low = [0, 1, 2, 3, 4];
  const high = [5, 6, 7, 8, 9];
  const rot = (arr: number[], offset: number) => [
    ...arr.slice(offset % arr.length),
    ...arr.slice(0, offset % arr.length),
  ];
  const offset = Math.floor(slotIndex / 2) % 5;
  const lo = rot(low, offset);
  const hi = rot(high, offset);
  return slotIndex % 2 === 0 ? [...lo, ...hi] : [...hi, ...lo];
}

export function digitMatchesClass(digit: number, cls: DigitClass): boolean {
  return cls === 'low' ? digit >= 0 && digit <= 4 : digit >= 5 && digit <= 9;
}

/** 패턴 흐름 fallback — target class 내 digit 순환 (저·고점 교차 없음) */
export function classDigitOrder(cls: DigitClass, slotIndex: number): number[] {
  const pool = cls === 'low' ? [0, 1, 2, 3, 4] : [5, 6, 7, 8, 9];
  const offset = slotIndex % pool.length;
  return [...pool.slice(offset), ...pool.slice(0, offset)];
}

/** Master 패턴 최근값 → 없으면 균형 순서 */
function pickFromPatternRecent(
  recentVals: number[],
  slotIndex: number,
  used: Set<number>,
): number {
  for (let i = recentVals.length - 1; i >= 0; i -= 1) {
    const v = recentVals[i]!;
    if (v >= 0 && v <= 9 && !used.has(v)) return v;
  }
  for (const v of balancedDigitOrder(slotIndex)) {
    if (!used.has(v)) return v;
  }
  return ALL_S_DIGITS.find((v) => !used.has(v)) ?? slotIndex % 10;
}

function buildNextSPoolFromPattern(
  field: keyof SidePatterns,
  side: DigitClass,
  recentMaster: number[],
  slotIndex: number,
): number[] {
  const recentVals = recentPatternFieldValues(recentMaster, side, field);
  const fromMaster = [...recentVals]
    .reverse()
    .filter((v, i, arr) => v >= 0 && v <= 9 && arr.indexOf(v) === i);
  const balanced = balancedDigitOrder(slotIndex);
  return [...fromMaster, ...balanced].filter((v, i, arr) => arr.indexOf(v) === i);
}

/** @deprecated 가산점 제거 — 균형 순환만 반환 */
export function scoreNextSValue(
  value: number,
  completedS: number[],
  runProgress: number,
): number {
  void completedS;
  void runProgress;
  return value >= 0 && value <= 9 ? 1 : 0;
}

export function pickVariedNextSValues(
  completedS: number[],
  side: DigitClass,
  runProgress: number,
): number[] {
  void side;
  void runProgress;
  const slot = completedS.length % 10;
  return balancedDigitOrder(slot);
}

/** S/run 길이 병합 후보 — 패턴 라벨·fit·합의 강도 */
export interface MergedSegmentLengthCandidate {
  value: number;
  fit: number;
  labels: string[];
}

const STRONG_CONSENSUS_MIN_LABELS = 2;
const STRONG_CONSENSUS_MIN_FIT = 0.68;

export function isStrongSegmentConsensus(row: MergedSegmentLengthCandidate): boolean {
  return row.labels.length >= STRONG_CONSENSUS_MIN_LABELS && row.fit >= STRONG_CONSENSUS_MIN_FIT;
}

function accumulateSegmentLengthCandidate(
  byValue: Map<number, { fit: number; labels: Set<string> }>,
  value: number,
  contribution: number,
  patternLabel: string,
): void {
  const row = byValue.get(value) ?? { fit: 0, labels: new Set<string>() };
  row.labels.add(patternLabel);
  row.fit += contribution;
  byValue.set(value, row);
}

function finalizeSegmentLengthCandidates(
  byValue: Map<number, { fit: number; labels: Set<string> }>,
  maxCount: number,
): MergedSegmentLengthCandidate[] {
  return [...byValue.entries()]
    .map(([value, row]) => {
      const labelCount = row.labels.size;
      const consensusBoost = 1 + 0.1 * Math.max(0, labelCount - 1);
      return {
        value,
        fit: row.fit * consensusBoost,
        labels: [...row.labels],
      };
    })
    .sort((a, b) => b.fit - a.fit || a.value - b.value)
    .slice(0, maxCount);
}

/** 다음 구간·예상 길이 간 겹침 최소화 (강한 합의 시 동일 값 허용) */
export function balanceSegmentLengthLists(
  nextPool: MergedSegmentLengthCandidate[],
  expectedPool: MergedSegmentLengthCandidate[],
  maxCount = 5,
): { next: MergedSegmentLengthCandidate[]; expected: MergedSegmentLengthCandidate[] } {
  const nextOut: MergedSegmentLengthCandidate[] = [];
  const expectedOut: MergedSegmentLengthCandidate[] = [];
  const usedNext = new Set<number>();
  const usedExpected = new Set<number>();

  const tryAdd = (
    row: MergedSegmentLengthCandidate,
    target: MergedSegmentLengthCandidate[],
    used: Set<number>,
    otherUsed: Set<number>,
    otherTarget: MergedSegmentLengthCandidate[],
  ): boolean => {
    if (target.length >= maxCount || used.has(row.value)) return false;
    if (otherUsed.has(row.value)) {
      const otherRow = otherTarget.find((candidate) => candidate.value === row.value);
      const allowOverlap =
        isStrongSegmentConsensus(row) ||
        (otherRow !== undefined && isStrongSegmentConsensus(otherRow));
      if (!allowOverlap) return false;
    }
    target.push(row);
    used.add(row.value);
    return true;
  };

  for (const row of nextPool) {
    if (isStrongSegmentConsensus(row)) tryAdd(row, nextOut, usedNext, usedExpected, expectedOut);
  }
  for (const row of expectedPool) {
    if (isStrongSegmentConsensus(row)) tryAdd(row, expectedOut, usedExpected, usedNext, nextOut);
  }
  for (const row of nextPool) {
    tryAdd(row, nextOut, usedNext, usedExpected, expectedOut);
  }
  for (const row of expectedPool) {
    tryAdd(row, expectedOut, usedExpected, usedNext, nextOut);
  }
  for (const row of nextPool) {
    if (nextOut.length >= maxCount || usedNext.has(row.value)) continue;
    if (!isStrongSegmentConsensus(row)) continue;
    nextOut.push(row);
    usedNext.add(row.value);
  }
  for (const row of expectedPool) {
    if (expectedOut.length >= maxCount || usedExpected.has(row.value)) continue;
    if (!isStrongSegmentConsensus(row)) continue;
    expectedOut.push(row);
    usedExpected.add(row.value);
  }

  return { next: nextOut, expected: expectedOut };
}

/** 모든 phase rec에서 S 후보 pool (값별 dedupe, 패턴 fit 누적) */
export function collectMergedNextSValues(
  recs: PhaseRecommendation[],
  _completedS: number[],
  _runProgress: number,
  maxCount = 12,
): MergedSegmentLengthCandidate[] {
  const byValue = new Map<number, { fit: number; labels: Set<string> }>();

  for (const rec of recs) {
    for (const raw of rec.nextSValues) {
      if (raw < 0 || raw > 9) continue;
      accumulateSegmentLengthCandidate(byValue, raw, rec.fit, rec.patternLabel);
    }
  }

  return finalizeSegmentLengthCandidates(byValue, maxCount);
}

/** 모든 phase rec에서 현재 run 전체 길이 pool */
export function collectMergedExpectedRunLengths(
  recs: PhaseRecommendation[],
  runProgress: number,
  maxCount = 12,
): MergedSegmentLengthCandidate[] {
  if (runProgress <= 0) return [];

  const byValue = new Map<number, { fit: number; labels: Set<string> }>();

  for (const rec of recs) {
    const raw = rec.expectedRunLength;
    if (raw === undefined || raw < runProgress) continue;

    let contribution = rec.fit;
    if (raw === runProgress && rec.runEndsAfterNext) contribution += 0.08;
    if (raw > runProgress && (rec.remainingInRun ?? 0) > 0) contribution += 0.05;
    accumulateSegmentLengthCandidate(byValue, raw, contribution, rec.patternLabel);
  }

  return finalizeSegmentLengthCandidates(byValue, maxCount);
}

function makePhaseRec(
  partial: Omit<PhaseRecommendation, 'phase'> & { phase?: PatternPhaseKind },
): PhaseRecommendation {
  return {
    phase: partial.phase ?? 'transition',
    patternLabel: partial.patternLabel,
    field: partial.field,
    fit: partial.fit,
    nextSValues: partial.nextSValues,
    expectedRunLength: partial.expectedRunLength,
    remainingInRun: partial.remainingInRun,
    runEndsAfterNext: partial.runEndsAfterNext,
    nextClass: partial.nextClass,
    reason: partial.reason,
  };
}

function evaluateThresholdPatterns(
  s: number[],
  side: DigitClass,
  runProgress: number,
  recentMaster: number[],
): PhaseRecommendation[] {
  const recs: PhaseRecommendation[] = [];
  const varied = pickVariedNextSValues(s, side, runProgress);
  const patterns = extractCodeValuesFromBaseSequence(s, side);

  const dup1 = patterns.oneDuplicate.length;
  if (dup1 > 0 || trailingOnesCount(s) >= 1) {
    recs.push(
      makePhaseRec({
        phase: 'transition',
        patternLabel: PATTERN_FIELD_LABELS.oneDuplicate[side],
        field: 'oneDuplicate',
        fit: 0.76,
        nextSValues: buildNextSPoolFromPattern('oneDuplicate', side, recentMaster, 0),
        expectedRunLength: runProgress >= 2 ? runProgress : 1,
        runEndsAfterNext: true,
        reason: `1 중복 ${dup1}건 · Master 패턴 참고`,
      }),
    );
  }

  const threeCount = patterns.threeOrMore.length;
  const needsThree = runProgress < MATCH_RULES.THREE_OR_MORE_MIN && threeCount === 0;
  if (needsThree || runProgress >= MATCH_RULES.THREE_OR_MORE_MIN) {
    recs.push(
      makePhaseRec({
        phase: runProgress >= MATCH_RULES.THREE_OR_MORE_MIN ? 'transition' : 'repeat',
        patternLabel: PATTERN_FIELD_LABELS.threeOrMore[side],
        field: 'threeOrMore',
        fit: needsThree ? 0.74 : 0.8,
        nextSValues: buildNextSPoolFromPattern('threeOrMore', side, recentMaster, 1),
        expectedRunLength: runProgress >= MATCH_RULES.THREE_OR_MORE_MIN ? runProgress : 3,
        runEndsAfterNext: runProgress >= MATCH_RULES.THREE_OR_MORE_MIN,
        reason: needsThree
          ? `3 이상 미충족 · Master 3 이상 패턴`
          : `3 이상 ${threeCount}건 · Master 참고 S ${varied.slice(0, 3).join('/')}`,
      }),
    );
  }

  if (patterns.fiveOrMore.length > 0 || s.some((v) => v >= MATCH_RULES.FIVE_OR_MORE_MIN)) {
    recs.push(
      makePhaseRec({
        phase: 'transition',
        patternLabel: PATTERN_FIELD_LABELS.fiveOrMore[side],
        field: 'fiveOrMore',
        fit: 0.72,
        nextSValues: buildNextSPoolFromPattern('fiveOrMore', side, recentMaster, 2),
        expectedRunLength: runProgress >= 2 ? runProgress : 1,
        runEndsAfterNext: true,
        reason: `5 이상 패턴 · Master 참고`,
      }),
    );
  }

  if (runProgress === MATCH_RULES.EXACT_TWO_LENGTH || patterns.exactTwo.length > 0) {
    recs.push(
      makePhaseRec({
        phase: 'transition',
        patternLabel: PATTERN_FIELD_LABELS.exactTwo[side],
        field: 'exactTwo',
        fit: 0.7,
        nextSValues: buildNextSPoolFromPattern('exactTwo', side, recentMaster, 3),
        expectedRunLength: runProgress >= 2 ? runProgress : 2,
        runEndsAfterNext: true,
        reason: `2 run · Master 2 패턴 참고`,
      }),
    );
  }

  return recs;
}

function evaluateCommaMarkerPatterns(
  s: number[],
  side: DigitClass,
  runProgress: number,
  recentMaster: number[],
): PhaseRecommendation[] {
  const recs: PhaseRecommendation[] = [];
  const rules = STEP2_CODE_VALUE_RULES.between;
  const commaFields: (keyof SidePatterns)[] = ['commaAlpha_2_3', 'plusAlpha_3_2', 'plusAlpha_4_3'];

  for (let fi = 0; fi < commaFields.length; fi += 1) {
    const field = commaFields[fi]!;
    const rule = rules[field as keyof typeof rules];
    if (!rule || rule.pairsOnly) continue;
    const label = PATTERN_FIELD_LABELS[field][side];
    const patterns = extractCodeValuesFromBaseSequence(s, side);
    const hitCount = patterns[field]?.length ?? 0;
    if (hitCount === 0 && s.length < 2) continue;

    const pool = buildNextSPoolFromPattern(field, side, recentMaster, fi + 4);
    recs.push(
      makePhaseRec({
        phase: hitCount > 0 ? 'transition' : 'repeat',
        patternLabel: label,
        field,
        fit: 0.68,
        nextSValues: pool.slice(0, 6),
        expectedRunLength: runProgress >= 2 ? runProgress : 1,
        runEndsAfterNext: true,
        reason: `${label} ${hitCount}건 · Master 패턴 S ${pool.slice(0, 3).join('/')}`,
      }),
    );
  }
  return recs;
}

function makeDefaultPatternRec(
  field: keyof SidePatterns,
  side: DigitClass,
  live: LiveSegmentState,
  recentMaster: number[],
  slotIndex: number,
): PhaseRecommendation {
  const label = PATTERN_FIELD_LABELS[field][side];
  const livePatterns = extractCodeValuesFromBaseSequence(live.completedRunLengths, side);
  const active = (livePatterns[field]?.length ?? 0) > 0;
  const sideTag = side === 'low' ? '저점' : '고점';
  const recentVals = recentPatternFieldValues(recentMaster, side, field);
  return {
    phase: active ? 'repeat' : 'transition',
    patternLabel: label,
    field,
    fit: active ? 0.8 : 0.72,
    nextSValues: buildNextSPoolFromPattern(field, side, recentMaster, slotIndex),
    expectedRunLength: live.currentRunProgress >= 2 ? live.currentRunProgress : 1,
    runEndsAfterNext: !active,
    nextClass: active ? side : oppositeSide(side),
    reason: `${sideTag} · ${label} · Master [${recentVals.slice(-3).join(',') || '-'}]`,
  };
}

/** 슬롯 간 중복 없이 primary S — Master 최근값 우선, 없으면 0~9 균형 순환 */
function pickUnusedPrimaryS(
  preferred: number[],
  usedS: Set<number>,
  slotIndex: number,
  recentMaster: number[],
  field: keyof SidePatterns,
  side: DigitClass,
): number | undefined {
  const fromPreferred = preferred.find((v) => v >= 0 && v <= 9 && !usedS.has(v));
  if (fromPreferred !== undefined) return fromPreferred;

  const recentVals = recentPatternFieldValues(recentMaster, side, field);
  return pickFromPatternRecent(recentVals, slotIndex, usedS);
}

/** 10패턴 슬롯별 primary S — 슬롯 간 값 중복 없음 */
export function assignUniqueNextSPerSlot(
  recs: PhaseRecommendation[],
  liveS: number[],
  side: DigitClass,
  runProgress: number,
  recentMaster: number[] = liveS,
): PhaseRecommendation[] {
  void runProgress;
  const usedS = new Set<number>();
  const sorted = [...recs].sort((a, b) => b.fit - a.fit || a.patternLabel.localeCompare(b.patternLabel));
  const out: PhaseRecommendation[] = [];

  sorted.forEach((rec, slotIndex) => {
    const pool = [
      ...rec.nextSValues,
      ...buildNextSPoolFromPattern(rec.field, side, recentMaster, slotIndex),
    ].filter((v, i, arr) => v >= 0 && v <= 9 && arr.indexOf(v) === i);

    const primary = pickUnusedPrimaryS(pool, usedS, slotIndex, recentMaster, rec.field, side)
      ?? ALL_S_DIGITS[slotIndex % 10]!;

    usedS.add(primary);
    const rest = pool.filter((v) => v !== primary && !usedS.has(v)).slice(0, 2);
    out.push({
      ...rec,
      nextSValues: [primary, ...rest],
      reason: `${rec.reason} · 슬롯 S${primary}`,
    });
  });

  return out;
}

export function buildPatternSlotRecommendations(
  recs: PhaseRecommendation[],
): PatternSlotRecommendation[] {
  return recs
    .filter((rec) => rec.nextSValues.length > 0)
    .map((rec) => ({
      field: rec.field,
      patternLabel: rec.patternLabel,
      nextS: rec.nextSValues[0]!,
      phase: rec.phase,
      fit: rec.fit,
      reason: rec.reason,
    }))
    .sort((a, b) => b.fit - a.fit || a.patternLabel.localeCompare(b.patternLabel));
}

function evaluateRunLengthPatterns(
  s: number[],
  side: DigitClass,
  runProgress: number,
  recentMaster: number[],
): PhaseRecommendation[] {
  const recs: PhaseRecommendation[] = [];

  if (runProgress >= 1) {
    recs.push({
      phase: 'transition',
      patternLabel: 'S run',
      field: 'threeOrMore',
      fit: 0.9,
      nextSValues: buildNextSPoolFromPattern('threeOrMore', side, recentMaster, 0),
      expectedRunLength: runProgress >= 2 ? runProgress : 1,
      remainingInRun: 0,
      runEndsAfterNext: true,
      reason: `1자 run · Master 3 이상 패턴 참고`,
    });
  }

  if (runProgress >= MATCH_RULES.THREE_OR_MORE_MIN) {
    recs.push({
      phase: 'transition',
      patternLabel: PATTERN_FIELD_LABELS.threeOrMore[side],
      field: 'threeOrMore',
      fit: 0.78,
      nextSValues: buildNextSPoolFromPattern('threeOrMore', side, recentMaster, 1),
      expectedRunLength: runProgress,
      remainingInRun: 0,
      runEndsAfterNext: true,
      reason: `3 이상 run ${runProgress}자 완료 · Master 참고`,
    });
  }

  if (runProgress >= MATCH_RULES.EXACT_TWO_LENGTH) {
    recs.push({
      phase: 'transition',
      patternLabel: PATTERN_FIELD_LABELS.exactTwo[side],
      field: 'exactTwo',
      fit: 0.84,
      nextSValues: buildNextSPoolFromPattern('exactTwo', side, recentMaster, 2),
      expectedRunLength: runProgress,
      remainingInRun: 0,
      runEndsAfterNext: true,
      reason: `${runProgress}자 run 완료 · Master 2 패턴 참고`,
    });
  }

  const ones = trailingOnesCount(s);
  if (ones >= 1 && runProgress >= 1) {
    recs.push({
      phase: 'transition',
      patternLabel: PATTERN_FIELD_LABELS.oneDuplicate[side],
      field: 'oneDuplicate',
      fit: 0.8,
      nextSValues: buildNextSPoolFromPattern('oneDuplicate', side, recentMaster, 3),
      expectedRunLength: runProgress >= 2 ? runProgress : 1,
      remainingInRun: 0,
      runEndsAfterNext: true,
      reason: `1 중복 S×${ones} · Master 1 중복 참고`,
    });
  }

  return recs;
}

/**
 * 현재 S + Code Value 10패턴 — Master 최근값 기반, 0~9 균형 배분.
 * 가산점·빈도 가중 없음.
 */
export function analyzePatternPhases(
  live: LiveSegmentState,
  masterRunLengths: number[],
  lookback = RECENT_PATTERN_LOOKBACK,
): PhaseRecommendation[] {
  const side = live.side;
  const s = live.completedRunLengths;
  const progress = live.currentRunProgress;
  const recentMaster = sliceRecentRunLengths(masterRunLengths, lookback);
  const betweenRules = STEP2_CODE_VALUE_RULES.between;

  const byField = new Map<keyof SidePatterns, PhaseRecommendation>();

  for (const field of BETWEEN_FIELDS) {
    const rule = betweenRules[field as keyof typeof betweenRules];
    if (!rule) continue;
    const slotIndex = PATTERN_FIELDS.indexOf(field);
    const rec = analyzeOpenBetween(s, side, field, rule, progress, recentMaster, slotIndex);
    if (rec) byField.set(field, rec);
  }

  for (const rec of evaluateRunLengthPatterns(s, side, progress, recentMaster)) {
    const prev = byField.get(rec.field);
    if (!prev || rec.fit > prev.fit) byField.set(rec.field, rec);
  }

  for (const rec of evaluateThresholdPatterns(s, side, progress, recentMaster)) {
    const prev = byField.get(rec.field);
    if (!prev || rec.fit > prev.fit) byField.set(rec.field, rec);
  }

  for (const rec of evaluateCommaMarkerPatterns(s, side, progress, recentMaster)) {
    const prev = byField.get(rec.field);
    if (!prev || rec.fit > prev.fit) byField.set(rec.field, rec);
  }

  PATTERN_FIELDS.forEach((field, slotIndex) => {
    if (!byField.has(field)) {
      byField.set(field, makeDefaultPatternRec(field, side, live, recentMaster, slotIndex));
    }
  });

  const merged = PATTERN_FIELDS.map((field) => byField.get(field)!);
  const unique = assignUniqueNextSPerSlot(merged, s, side, progress, recentMaster);
  unique.sort(
    (a, b) =>
      b.fit - a.fit ||
      (a.expectedRunLength ?? 99) - (b.expectedRunLength ?? 99) ||
      (a.phase === 'transition' ? 1 : 0) - (b.phase === 'transition' ? 1 : 0),
  );
  return unique;
}

export function countTrailingSameDigit(prefix: string): number {
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

export function recentDigitsInPrefix(prefix: string, lookback: number): number[] {
  const out: number[] = [];
  for (let i = prefix.length - 1; i >= 0 && out.length < lookback; i -= 1) {
    const digit = Number(prefix[i]);
    if (Number.isInteger(digit) && digit >= 0 && digit <= 9) out.push(digit);
  }
  return out;
}

export function countDigitInRecent(prefix: string, digit: number, lookback: number): number {
  let count = 0;
  for (let i = prefix.length - 1; i >= 0 && i >= prefix.length - lookback; i -= 1) {
    if (Number(prefix[i]) === digit) count += 1;
  }
  return count;
}

/** 0~9 균형 순환 — 저·고점 band 구분 없음 */
export function pickVariedBandDigits(
  side: DigitClass,
  prefix: string,
  maxCount: number,
  slotIndex = prefix.length,
): number[] {
  void side;
  const last = prefix.length > 0 ? Number(prefix[prefix.length - 1]) : null;
  const trailing = countTrailingSameDigit(prefix);
  const order = balancedDigitOrder(slotIndex);
  const out: number[] = [];
  for (const digit of order) {
    if (out.includes(digit)) continue;
    if (digit === last && trailing >= MAX_DIGIT_STREAK && out.length > 0) continue;
    out.push(digit);
    if (out.length >= maxCount) break;
  }
  return out.length > 0 ? out : [...ALL_S_DIGITS].slice(0, maxCount);
}

export function getMasterRunLengthsForSide(
  result: AnalysisResult,
  side: DigitClass,
): number[] {
  return side === 'low' ? result.lowRunLengths : result.highRunLengths;
}

export function getRecentMasterRunLengths(
  result: AnalysisResult,
  side: DigitClass,
  lookback = RECENT_PATTERN_LOOKBACK,
): number[] {
  return sliceRecentRunLengths(getMasterRunLengthsForSide(result, side), lookback);
}

export function getLastDigitInClass(prefix: string, cls: DigitClass): number | null {
  for (let i = prefix.length - 1; i >= 0; i -= 1) {
    const digit = Number(prefix[i]);
    if (!Number.isInteger(digit) || digit < 0 || digit > 9) continue;
    if (cls === 'low' ? digit <= 4 : digit >= 5) return digit;
  }
  return cls === 'low' ? 0 : 5;
}

function digitForSAndSlot(
  sValue: number,
  slotIndex: number,
  prefix: string,
  used: Set<number>,
): number {
  const picked = pickBalancedDigitAvoidingPatternValue(
    sValue,
    slotIndex,
    prefix,
    used,
    balancedDigitOrder(slotIndex),
    {
      maxStreak: MAX_DIGIT_STREAK,
      trailingSame: countTrailingSameDigit,
      wouldRepeat: wouldFormRepetitivePattern,
      isOverused: isDigitOverusedInRecent,
    },
  );
  if (picked !== null) return picked;
  return ALL_S_DIGITS.find((d) => !used.has(d)) ?? slotIndex % 10;
}

export interface SingleNextDigitPick {
  digit: number;
  patternLabel: string;
  reason: string;
  consensusCount: number;
}

/** 2323(ABAB)·2111(연속)·6667(연속 run) 형태 방지 */
export function wouldFormRepetitivePattern(prefix: string, digit: number): boolean {
  if (!Number.isInteger(digit) || digit < 0 || digit > 9) return true;
  const ch = String(digit);
  const next = prefix + ch;

  let streak = 1;
  for (let i = next.length - 2; i >= 0; i -= 1) {
    if (next[i] === ch) streak += 1;
    else break;
  }
  if (streak >= 2) return true;

  if (next.length >= 4) {
    const tail = next.slice(-4);
    if (tail[0] === tail[2] && tail[1] === tail[3] && tail[0] !== tail[1]) return true;
  }

  if (next.length >= 3) {
    const tail3 = next.slice(-3);
    if (tail3[0] === tail3[1] && tail3[1] === tail3[2]) return true;
  }

  return false;
}

function recentDigitCounts(prefix: string, lookback = 8): Map<number, number> {
  const counts = new Map<number, number>();
  for (let i = prefix.length - 1; i >= 0 && i >= prefix.length - lookback; i -= 1) {
    const d = Number(prefix[i]);
    if (!Number.isInteger(d) || d < 0 || d > 9) continue;
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  return counts;
}

function isDigitOverusedInRecent(prefix: string, digit: number, maxCount = 2): boolean {
  return (recentDigitCounts(prefix).get(digit) ?? 0) >= maxCount;
}

function proposedDigitFromPhaseRec(
  rec: PhaseRecommendation,
  slotIndex: number,
  prefix: string,
): number | null {
  void rec;
  const used = new Set<number>();
  const digit = pickBalancedDigitAvoidingPatternValue(
    -1,
    slotIndex,
    prefix,
    used,
    balancedDigitOrder(slotIndex),
    {
      maxStreak: MAX_DIGIT_STREAK,
      trailingSame: countTrailingSameDigit,
      wouldRepeat: wouldFormRepetitivePattern,
      isOverused: isDigitOverusedInRecent,
    },
  );
  return digit;
}

/** 상위 패턴 합의 + 0~9 균형 — 다음 digit 1개만 */
export function pickSingleNextDigit(
  recs: PhaseRecommendation[],
  prefix: string,
): SingleNextDigitPick | null {
  if (recs.length === 0) return null;

  const topRecs = [...recs].sort((a, b) => b.fit - a.fit).slice(0, 5);
  const votes = new Map<number, { count: number; label: string; fit: number }>();

  topRecs.forEach((rec, slotIndex) => {
    const digit = proposedDigitFromPhaseRec(rec, slotIndex, prefix);
    if (digit === null) return;
    const phaseTag = rec.phase === 'repeat' ? '반복' : '전환';
    const label = `${phaseTag} · ${rec.patternLabel}`;
    const row = votes.get(digit) ?? { count: 0, label, fit: 0 };
    row.count += 1;
    row.fit += rec.fit;
    if (row.count === 1) row.label = label;
    votes.set(digit, row);
  });

  const ranked = [...votes.entries()].sort(
    (a, b) => b[1].count - a[1].count || b[1].fit - a[1].fit,
  );

  for (const [digit, meta] of ranked) {
    if (wouldFormRepetitivePattern(prefix, digit)) continue;
    if (isDigitOverusedInRecent(prefix, digit)) continue;
    return {
      digit,
      patternLabel: meta.label,
      consensusCount: meta.count,
      reason: `${meta.label} · 패턴 ${meta.count}건 · 중복 패턴 회피`,
    };
  }

  const topDigit = proposedDigitFromPhaseRec(topRecs[0]!, 0, prefix);
  if (topDigit !== null && !wouldFormRepetitivePattern(prefix, topDigit) && !isDigitOverusedInRecent(prefix, topDigit)) {
    const base = topRecs[0]!;
    const phaseTag = base.phase === 'repeat' ? '반복' : '전환';
    return {
      digit: topDigit,
      patternLabel: `${phaseTag} · ${base.patternLabel}`,
      consensusCount: 1,
      reason: `${phaseTag} · ${base.patternLabel} · 최우선 패턴`,
    };
  }

  for (const digit of balancedDigitOrder(prefix.length)) {
    if (wouldFormRepetitivePattern(prefix, digit)) continue;
    if (isDigitOverusedInRecent(prefix, digit)) continue;
    const base = recs[0]!;
    const phaseTag = base.phase === 'repeat' ? '반복' : '전환';
    return {
      digit,
      patternLabel: `${phaseTag} · ${base.patternLabel}`,
      consensusCount: 0,
      reason: `0~9 균형 · 중복 패턴 회피`,
    };
  }

  for (const digit of ALL_S_DIGITS) {
    if (!wouldFormRepetitivePattern(prefix, digit)) {
      const base = recs[0]!;
      const phaseTag = base.phase === 'repeat' ? '반복' : '전환';
      return {
        digit,
        patternLabel: `${phaseTag} · ${base.patternLabel}`,
        consensusCount: 0,
        reason: `대안 digit · 반복 패턴 최소`,
      };
    }
  }

  return null;
}

export interface PhaseDigitCandidate {
  digit: number;
  fit: number;
  patternLabel: string;
}

/** 연쇄 추천 — 직전 digit과 다르면 우선 */
export function pickChainStepDigit(
  candidates: PhaseDigitCandidate[],
  prefix: string,
  topRec: PhaseRecommendation | null | undefined,
): PhaseDigitCandidate | null {
  void topRec;
  if (candidates.length === 0) return null;
  const last = prefix.length > 0 ? Number(prefix[prefix.length - 1]) : null;
  const alt = candidates.find((c) => c.digit !== last);
  return alt ?? candidates[0] ?? null;
}

/** phase 추천 → digit — 슬롯당 1개, 0~9 균형·중복 없음 */
export function phaseRecommendationsToDigitCandidates(
  _live: LiveSegmentState,
  recs: PhaseRecommendation[],
  prefix: string,
  maxCount = 10,
): PhaseDigitCandidate[] {
  void _live;
  const usedDigits = new Set<number>();
  const out: PhaseDigitCandidate[] = [];
  const sorted = [...recs].sort((a, b) => b.fit - a.fit);

  sorted.forEach((rec, slotIndex) => {
    if (out.length >= maxCount) return;
    const phaseTag = rec.phase === 'repeat' ? '반복' : '전환';
    let digit = digitForSAndSlot(-1, slotIndex, prefix, usedDigits);
    if (usedDigits.has(digit)) {
      digit = pickFromPatternRecent([], slotIndex, usedDigits);
    }
    usedDigits.add(digit);
    const sideTag = rec.nextClass === 'high' ? '고점' : rec.nextClass === 'low' ? '저점' : '';
    const label = `${phaseTag} · ${rec.patternLabel}${sideTag ? ` · ${sideTag}` : ''}`;
    out.push({ digit, fit: rec.fit, patternLabel: label });
  });

  return out.slice(0, maxCount);
}

export function inferNextClassFromPhases(
  live: LiveSegmentState,
  recs: PhaseRecommendation[],
): DigitClass {
  const top = recs[0];
  if (!top) return live.side;
  if (top.runEndsAfterNext) {
    return top.nextClass ?? oppositeSide(live.side);
  }
  return live.side;
}

export function describePhaseState(
  live: LiveSegmentState,
  top: PhaseRecommendation | null,
): string {
  const band = live.side === 'low' ? '저점(STEP2)' : '고점(STEP3)';
  const progress = live.currentRunProgress;

  if (!top) {
    return `${band} · run ${progress}자 진행`;
  }

  const phaseTag = top.phase === 'repeat' ? '반복' : '전환';
  if (top.remainingInRun && top.remainingInRun > 0) {
    return `${band} · ${phaseTag} · ${top.patternLabel} · run ${progress}자 · 남 ${top.remainingInRun}자`;
  }
  if (top.runEndsAfterNext) {
    return `${band} · ${phaseTag} · ${top.patternLabel} → run 종료`;
  }
  return `${band} · ${phaseTag} · ${top.patternLabel} · run ${progress}자`;
}
