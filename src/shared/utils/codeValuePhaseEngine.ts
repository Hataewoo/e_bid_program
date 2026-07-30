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

const BETWEEN_GAP_FIELDS = new Set<keyof SidePatterns>(BETWEEN_FIELDS);
const LOW_BAND = [1, 2, 3, 4];
const HIGH_BAND = [5, 6, 7, 8, 9];

/** digit 추천 — 같은 숫자 연속 run 최소화 */
const MAX_DIGIT_STREAK = 1;

/** 10패턴 — between 외 단순 run/임계 규칙 */
const THRESHOLD_PATTERN_FIELDS: (keyof SidePatterns)[] = [
  'oneDuplicate',
  'exactTwo',
  'threeOrMore',
  'fiveOrMore',
  'commaAlpha_2_3',
  'plusAlpha_3_2',
  'plusAlpha_4_3',
  'plusAlpha_4_4',
];

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
  /** fromLabel → toLabel → 등장 횟수 (순서 tie-break, digit 복사 아님) */
  transitions: Map<string, Map<string, number>>;
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

/** Master S 시퀀스에서 패턴 라벨 전환만 추출 — digit 복사용 아님 */
export function buildPatternTransitionHints(
  runLengths: number[],
  side: DigitClass,
): PatternTransitionHints {
  const transitions = new Map<string, Map<string, number>>();
  let prev = '';

  for (let i = 0; i < runLengths.length; i += 1) {
    const prefix = runLengths.slice(0, i + 1);
    const label = dominantPatternLabel(prefix, side);
    if (prev && prev !== label) {
      const nextMap = transitions.get(prev) ?? new Map<string, number>();
      nextMap.set(label, (nextMap.get(label) ?? 0) + 1);
      transitions.set(prev, nextMap);
    }
    prev = label;
  }

  return { transitions };
}

function boostTransitionFit(
  rec: PhaseRecommendation,
  currentLabel: string,
  hints: PatternTransitionHints,
): PhaseRecommendation {
  if (rec.phase !== 'transition') return rec;
  const nextMap = hints.transitions.get(currentLabel);
  if (!nextMap) return rec;
  const boost = nextMap.get(rec.patternLabel) ?? 0;
  if (boost <= 0) return rec;
  return {
    ...rec,
    fit: Math.min(0.99, rec.fit + boost * 0.03),
    reason: `${rec.reason} · Master 전환 ${currentLabel}→${rec.patternLabel}`,
  };
}

function analyzeOpenBetween(
  s: number[],
  side: DigitClass,
  field: keyof SidePatterns,
  rule: BetweenMarkerRule,
  runProgress: number,
): PhaseRecommendation | null {
  if (!rule.pairsOnly || rule.markerExact === undefined) return null;

  const isMarker = buildMarkerMatch(rule);
  const countMatch = buildCountMatch(rule);
  const label = PATTERN_FIELD_LABELS[field][side];

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

  if (qualifying >= needMin) {
    const rem = Math.max(0, marker - runProgress);
    const base: PhaseRecommendation = {
      phase: 'transition',
      patternLabel: label,
      field,
      fit: 0.82 + Math.min(qualifying, 5) * 0.02,
      nextSValues: [marker],
      expectedRunLength: marker,
      remainingInRun: rem,
      runEndsAfterNext: rem <= 1 && runProgress >= marker - 1,
      reason: `${label} gap ${qualifying}/${needMin} 충족 → 마커 ${marker} 전환`,
    };
    if (marker === 1 && trailingOnesCount(s) >= 2) {
      return attachVariedNextS(base, s, side, runProgress);
    }
    return base;
  }

  const fillTarget = rule.countExact ?? rule.countMin ?? 3;
  const varied = pickVariedNextSValues(s, side, runProgress);
  return {
    phase: 'transition',
    patternLabel: label,
    field,
    fit: 0.7 + qualifying * 0.04,
    nextSValues: varied,
    expectedRunLength: runProgress >= 2 ? runProgress : 1,
    remainingInRun: 0,
    runEndsAfterNext: true,
    reason: `${label} gap ${qualifying}/${needMin} · 다음 S ${varied.slice(0, 3).join('/')}`,
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

function countValueInRecentS(completedS: number[], value: number, lookback = 6): number {
  return completedS.slice(-lookback).filter((v) => v === value).length;
}

/** S 후보 — 최근 S·패턴 겹침 패널티 */
export function scoreNextSValue(
  value: number,
  completedS: number[],
  runProgress: number,
): number {
  let score = 1;
  if (value === 1) {
    score -= 0.2 * countValueInRecentS(completedS, 1);
    score -= 0.15 * trailingOnesCount(completedS);
  }
  score -= countValueInRecentS(completedS, value) * 0.28;
  if (value >= 2 && value <= 4) score += 0.18;
  if (value === runProgress && runProgress >= 2) score += 0.12;
  return score;
}

export function pickVariedNextSValues(
  completedS: number[],
  side: DigitClass,
  runProgress: number,
): number[] {
  const pool = [2, 3, 4, 5, 6, 7, 1];
  const scored = pool.map((value) => ({
    value,
    score: scoreNextSValue(value, completedS, runProgress),
  }));
  scored.sort((a, b) => b.score - a.score || a.value - b.value);

  const picked: number[] = [];
  for (const row of scored) {
    if (picked.includes(row.value)) continue;
    if (row.value === 1 && picked.length >= 2) continue;
    picked.push(row.value);
    if (picked.length >= 5) break;
  }
  return picked.length > 0 ? picked : [2, 3, 4];
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
  completedS: number[],
  runProgress: number,
  maxCount = 12,
): MergedSegmentLengthCandidate[] {
  const byValue = new Map<number, { fit: number; labels: Set<string> }>();

  for (const rec of recs) {
    for (const raw of rec.nextSValues) {
      if (raw === 1 && countValueInRecentS(completedS, 1) >= 2) continue;
      const overlap = scoreNextSValue(raw, completedS, runProgress);
      const contribution = rec.fit * 0.55 + overlap * 0.45;
      accumulateSegmentLengthCandidate(byValue, raw, contribution, rec.patternLabel);
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
        fit: 0.76 - dup1 * 0.02,
        nextSValues: varied.filter((v) => v !== 1).slice(0, 4),
        expectedRunLength: runProgress >= 2 ? runProgress : 1,
        runEndsAfterNext: true,
        reason: `1 중복 ${dup1}건 · 다음 S 다양화`,
      }),
    );
  }

  const threeCount = patterns.threeOrMore.length;
  const needsThree = runProgress < MATCH_RULES.THREE_OR_MORE_MIN && threeCount === 0;
  if (needsThree || runProgress >= MATCH_RULES.THREE_OR_MORE_MIN) {
    const threePool = [3, 4, 5, 6].filter((v) => scoreNextSValue(v, s, runProgress) > 0.4);
    recs.push(
      makePhaseRec({
        phase: runProgress >= MATCH_RULES.THREE_OR_MORE_MIN ? 'transition' : 'repeat',
        patternLabel: PATTERN_FIELD_LABELS.threeOrMore[side],
        field: 'threeOrMore',
        fit: needsThree ? 0.74 : 0.8,
        nextSValues: threePool.length > 0 ? threePool : [3, 4],
        expectedRunLength: runProgress >= MATCH_RULES.THREE_OR_MORE_MIN ? runProgress : 3,
        runEndsAfterNext: runProgress >= MATCH_RULES.THREE_OR_MORE_MIN,
        reason: needsThree
          ? `3 이상 미충족 → S ${threePool.slice(0, 3).join('/')}`
          : `3 이상 ${threeCount}건 → 전환 S ${varied.slice(0, 3).join('/')}`,
      }),
    );
  }

  if (patterns.fiveOrMore.length > 0 || s.some((v) => v >= MATCH_RULES.FIVE_OR_MORE_MIN)) {
    const fivePool = [5, 6, 7].filter((v) => scoreNextSValue(v, s, runProgress) > 0.35);
    recs.push(
      makePhaseRec({
        phase: 'transition',
        patternLabel: PATTERN_FIELD_LABELS.fiveOrMore[side],
        field: 'fiveOrMore',
        fit: 0.72,
        nextSValues: fivePool.length > 0 ? fivePool : [5, 6],
        expectedRunLength: runProgress >= 2 ? runProgress : 1,
        runEndsAfterNext: true,
        reason: `5 이상 패턴 → S ${fivePool.slice(0, 3).join('/') || '5/6'}`,
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
        nextSValues: varied.filter((v) => v !== 2).slice(0, 3).concat([2]).slice(0, 4),
        expectedRunLength: runProgress >= 2 ? runProgress : 2,
        runEndsAfterNext: true,
        reason: `2 run · 다음 S ${varied.slice(0, 3).join('/')}`,
      }),
    );
  }

  return recs;
}

function evaluateCommaMarkerPatterns(
  s: number[],
  side: DigitClass,
  runProgress: number,
): PhaseRecommendation[] {
  const recs: PhaseRecommendation[] = [];
  const rules = STEP2_CODE_VALUE_RULES.between;
  const commaFields: (keyof SidePatterns)[] = ['commaAlpha_2_3', 'plusAlpha_3_2', 'plusAlpha_4_3'];

  for (const field of commaFields) {
    const rule = rules[field as keyof typeof rules];
    if (!rule || rule.pairsOnly) continue;
    const label = PATTERN_FIELD_LABELS[field][side];
    const patterns = extractCodeValuesFromBaseSequence(s, side);
    const hitCount = patterns[field]?.length ?? 0;
    if (hitCount === 0 && s.length < 2) continue;

    const target = rule.countExact ?? rule.countMin ?? 2;
    const pool = pickVariedNextSValues(s, side, runProgress).filter(
      (v) => v >= (rule.markerMin ?? 2) && v <= CODE_VALUE_ALPHA_MAX,
    );
    recs.push(
      makePhaseRec({
        phase: hitCount > 0 ? 'transition' : 'repeat',
        patternLabel: label,
        field,
        fit: 0.68 + hitCount * 0.04,
        nextSValues: pool.length > 0 ? pool.slice(0, 4) : [target, target + 1],
        expectedRunLength: runProgress >= 2 ? runProgress : 1,
        runEndsAfterNext: true,
        reason: `${label} ${hitCount}건 · S ${(pool[0] ?? target).toString()}`,
      }),
    );
  }
  return recs;
}

function dedupePhaseRecommendations(recs: PhaseRecommendation[]): PhaseRecommendation[] {
  const byField = new Map<string, PhaseRecommendation>();
  for (const rec of recs) {
    const key = rec.field;
    const prev = byField.get(key);
    if (!prev || rec.fit > prev.fit) byField.set(key, rec);
  }
  return [...byField.values()];
}

function attachVariedNextS(
  rec: PhaseRecommendation,
  s: number[],
  side: DigitClass,
  runProgress: number,
): PhaseRecommendation {
  const nextSValues = pickVariedNextSValues(s, side, runProgress);
  return {
    ...rec,
    nextSValues,
    expectedRunLength: runProgress >= 2 ? runProgress : 1,
  };
}

function singleDigitTransitionRec(
  s: number[],
  side: DigitClass,
  runProgress: number,
  reason: string,
): PhaseRecommendation {
  const nextSValues = pickVariedNextSValues(s, side, runProgress);
  return {
    phase: 'transition',
    patternLabel: 'S run',
    field: 'threeOrMore',
    fit: 0.9,
    nextSValues,
    expectedRunLength: runProgress >= 2 ? runProgress : 1,
    remainingInRun: 0,
    runEndsAfterNext: true,
    reason: `${reason} · 다음 S ${nextSValues.slice(0, 3).join('/')} · ${runProgress}자 후 전환`,
  };
}

function evaluateRunLengthPatterns(
  s: number[],
  side: DigitClass,
  runProgress: number,
): PhaseRecommendation[] {
  const recs: PhaseRecommendation[] = [];

  if (runProgress >= 1) {
    recs.push(singleDigitTransitionRec(s, side, runProgress, '1자 run 다양화'));
  }

  if (runProgress >= MATCH_RULES.THREE_OR_MORE_MIN) {
    const varied = pickVariedNextSValues(s, side, runProgress);
    recs.push({
      phase: 'transition',
      patternLabel: PATTERN_FIELD_LABELS.threeOrMore[side],
      field: 'threeOrMore',
      fit: 0.78,
      nextSValues: varied,
      expectedRunLength: runProgress,
      remainingInRun: 0,
      runEndsAfterNext: true,
      reason: `3 이상 run ${runProgress}자 완료 → 다음 S ${varied.slice(0, 3).join('/')}`,
    });
  }

  if (runProgress >= MATCH_RULES.EXACT_TWO_LENGTH) {
    const varied = pickVariedNextSValues(s, side, runProgress);
    recs.push({
      phase: 'transition',
      patternLabel: PATTERN_FIELD_LABELS.exactTwo[side],
      field: 'exactTwo',
      fit: 0.84,
      nextSValues: varied,
      expectedRunLength: runProgress,
      remainingInRun: 0,
      runEndsAfterNext: true,
      reason: `${runProgress}자 run 완료 → 다음 S ${varied.slice(0, 3).join('/')}`,
    });
  }

  const ones = trailingOnesCount(s);
  if (ones >= 1 && runProgress >= 1) {
    const varied = pickVariedNextSValues(s, side, runProgress);
    recs.push({
      phase: 'transition',
      patternLabel: PATTERN_FIELD_LABELS.oneDuplicate[side],
      field: 'oneDuplicate',
      fit: ones >= 2 ? 0.75 : 0.8,
      nextSValues: varied,
      expectedRunLength: runProgress >= 2 ? runProgress : 1,
      remainingInRun: 0,
      runEndsAfterNext: true,
      reason: `1 중복 S×${ones} → 다음 S ${varied.slice(0, 3).join('/')}`,
    });
  }

  if (runProgress >= MATCH_RULES.THREE_OR_MORE_MIN && runProgress < MATCH_RULES.FIVE_OR_MORE_MIN) {
    const hasThreePlus = s.some((v) => v >= MATCH_RULES.THREE_OR_MORE_MIN);
    if (hasThreePlus) {
      recs.push(singleDigitTransitionRec(s, side, runProgress, '5 이상 전 전환'));
    }
  }

  return recs;
}

function defaultRunRecommendation(
  s: number[],
  side: DigitClass,
  runProgress: number,
): PhaseRecommendation {
  return singleDigitTransitionRec(s, side, runProgress, 'run 진행');
}

/**
 * 현재 S + run 진행도에서 repeat/transition phase 추천.
 * Master runLengths는 패턴 전환 순서 tie-break만 사용.
 */
export function analyzePatternPhases(
  live: LiveSegmentState,
  masterRunLengths: number[],
): PhaseRecommendation[] {
  const side = live.side;
  const s = live.completedRunLengths;
  const progress = live.currentRunProgress;
  const currentLabel = dominantPatternLabel(s, side);
  const hints = buildPatternTransitionHints(masterRunLengths, side);
  const betweenRules = STEP2_CODE_VALUE_RULES.between;

  const recs: PhaseRecommendation[] = [];

  for (const field of BETWEEN_FIELDS) {
    const rule = betweenRules[field as keyof typeof betweenRules];
    if (!rule) continue;
    const rec = analyzeOpenBetween(s, side, field, rule, progress);
    if (rec) recs.push(boostTransitionFit(rec, currentLabel, hints));
  }

  recs.push(
    ...evaluateRunLengthPatterns(s, side, progress).map((rec) =>
      boostTransitionFit(rec, currentLabel, hints),
    ),
  );

  recs.push(
    ...evaluateThresholdPatterns(s, side, progress).map((rec) =>
      boostTransitionFit(rec, currentLabel, hints),
    ),
  );

  recs.push(
    ...evaluateCommaMarkerPatterns(s, side, progress).map((rec) =>
      boostTransitionFit(rec, currentLabel, hints),
    ),
  );

  if (recs.length === 0 && progress > 0) {
    recs.push(defaultRunRecommendation(s, side, progress));
  }

  const merged = dedupePhaseRecommendations(recs);
  merged.sort(
    (a, b) =>
      b.fit - a.fit ||
      (a.expectedRunLength ?? 99) - (b.expectedRunLength ?? 99) ||
      (a.phase === 'transition' ? 1 : 0) - (b.phase === 'transition' ? 1 : 0),
  );
  return merged;
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

function bandDigits(side: DigitClass): number[] {
  return side === 'low' ? LOW_BAND : HIGH_BAND;
}

export function countDigitInRecent(prefix: string, digit: number, lookback: number): number {
  let count = 0;
  for (let i = prefix.length - 1; i >= 0 && i >= prefix.length - lookback; i -= 1) {
    if (Number(prefix[i]) === digit) count += 1;
  }
  return count;
}

/** 패턴 허용 시 최근 digit·연속 회피 */
export function pickVariedBandDigits(
  side: DigitClass,
  prefix: string,
  maxCount: number,
): number[] {
  const band = bandDigits(side);
  const recent = recentDigitsInPrefix(prefix, 6);
  const recentSet = new Set(recent);
  const last = prefix.length > 0 ? Number(prefix[prefix.length - 1]) : null;
  const trailing = countTrailingSameDigit(prefix);

  const scored = band.map((digit) => {
    let score = 1;
    if (digit === last) score -= 0.65 + trailing * 0.2;
    if (recentSet.has(digit)) score -= 0.22;
    score -= countDigitInRecent(prefix, digit, 6) * 0.12;
    return { digit, score };
  });

  scored.sort((a, b) => b.score - a.score || a.digit - b.digit);
  const unique: number[] = [];
  for (const row of scored) {
    if (unique.includes(row.digit)) continue;
    if (row.digit === last && trailing >= MAX_DIGIT_STREAK && unique.length > 0) continue;
    unique.push(row.digit);
    if (unique.length >= maxCount) break;
  }
  return unique.length > 0 ? unique : band.slice(0, maxCount);
}

function mustContinueRun(
  prefix: string,
  rec: PhaseRecommendation,
): boolean {
  void prefix;
  void rec;
  return false;
}

export function getMasterRunLengthsForSide(
  result: AnalysisResult,
  side: DigitClass,
): number[] {
  return side === 'low' ? result.lowRunLengths : result.highRunLengths;
}

export function getLastDigitInClass(prefix: string, cls: DigitClass): number | null {
  for (let i = prefix.length - 1; i >= 0; i -= 1) {
    const digit = Number(prefix[i]);
    if (!Number.isInteger(digit) || digit < 0 || digit > 9) continue;
    if (cls === 'low' ? digit <= 4 : digit >= 5) return digit;
  }
  return cls === 'low' ? 0 : 5;
}

function rankDigitsForSValue(
  sValue: number,
  targetClass: DigitClass,
  prefix: string,
): number[] {
  const varied = pickVariedBandDigits(targetClass, prefix, 5);
  const low = sValue >= 0 && sValue <= 4;
  const high = sValue >= 5 && sValue <= 9;
  const inBand = targetClass === 'low' ? low : high;
  if (inBand && !recentDigitsInPrefix(prefix, 5).includes(sValue)) {
    return [sValue, ...varied.filter((d) => d !== sValue)];
  }
  if (targetClass === 'low' && sValue >= 2 && sValue <= 4) {
    const d = sValue <= 4 ? sValue : varied[0]!;
    return [d, ...varied.filter((x) => x !== d)];
  }
  if (targetClass === 'high' && sValue >= 5) {
    return [sValue, ...varied.filter((d) => d !== sValue)];
  }
  return varied;
}

function digitsForPhaseRec(
  rec: PhaseRecommendation,
  live: LiveSegmentState,
  prefix: string,
): Array<{ digit: number; sValue: number }> {
  const targetClass = rec.runEndsAfterNext ? oppositeSide(live.side) : live.side;
  const out: Array<{ digit: number; sValue: number }> = [];
  const seen = new Set<number>();

  for (const sValue of rec.nextSValues) {
    for (const digit of rankDigitsForSValue(sValue, targetClass, prefix)) {
      if (seen.has(digit)) continue;
      seen.add(digit);
      out.push({ digit, sValue });
      if (out.length >= 4) return out;
    }
  }
  return out;
}

function repetitionPenalty(prefix: string, digit: number): number {
  const trailing = countTrailingSameDigit(prefix);
  const last = prefix.length > 0 ? Number(prefix[prefix.length - 1]) : null;
  if (last === digit) return 0.45 + trailing * 0.2;
  return countDigitInRecent(prefix, digit, 6) * 0.14;
}

export interface PhaseDigitCandidate {
  digit: number;
  fit: number;
  patternLabel: string;
}

function filterAntiRepeatCandidates(
  candidates: PhaseDigitCandidate[],
  prefix: string,
): PhaseDigitCandidate[] {
  const last = prefix.length > 0 ? Number(prefix[prefix.length - 1]) : null;
  const trailing = countTrailingSameDigit(prefix);
  if (last === null || trailing < MAX_DIGIT_STREAK) return candidates;

  const withoutLast = candidates.filter((c) => c.digit !== last);
  return withoutLast.length > 0 ? withoutLast : candidates;
}

/** 연쇄 추천 — 같은 digit 연속 금지 (대안 있을 때) */
export function pickChainStepDigit(
  candidates: PhaseDigitCandidate[],
  prefix: string,
  topRec: PhaseRecommendation | null | undefined,
): PhaseDigitCandidate | null {
  void topRec;
  if (candidates.length === 0) return null;

  const pool = filterAntiRepeatCandidates(candidates, prefix);
  const ranked = pool
    .map((c) => ({ ...c, score: c.fit - repetitionPenalty(prefix, c.digit) }))
    .sort((a, b) => b.score - a.score || a.digit - b.digit);

  return ranked[0] ?? pool[0] ?? null;
}

/** phase 추천 → digit 후보 — 패턴별 S→digit, digit·패턴 겹침 제거 */
export function phaseRecommendationsToDigitCandidates(
  live: LiveSegmentState,
  recs: PhaseRecommendation[],
  prefix: string,
  maxCount = 5,
): PhaseDigitCandidate[] {
  const bestByDigit = new Map<number, PhaseDigitCandidate>();

  for (const rec of recs) {
    const phaseTag = rec.phase === 'repeat' ? '반복' : '전환';

    for (const { digit, sValue } of digitsForPhaseRec(rec, live, prefix)) {
      const label = `${phaseTag} · ${rec.patternLabel} · S${sValue}`;
      const adjustedFit = Math.max(
        0.1,
        rec.fit - repetitionPenalty(prefix, digit) - countDigitInRecent(prefix, digit, 5) * 0.05,
      );
      const prev = bestByDigit.get(digit);
      if (!prev || adjustedFit > prev.fit) {
        bestByDigit.set(digit, { digit, fit: adjustedFit, patternLabel: label });
      }
    }
  }

  const ranked = [...bestByDigit.values()]
    .sort((a, b) => b.fit - a.fit || a.digit - b.digit);

  return filterAntiRepeatCandidates(ranked, prefix).slice(0, maxCount);
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
