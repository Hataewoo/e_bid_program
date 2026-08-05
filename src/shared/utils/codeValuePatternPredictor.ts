import type { AnalysisResult, DigitClass, SidePatterns } from './analysisEngine';
import {
  extractCodeValuesFromBaseSequence,
  PATTERN_FIELD_LABELS,
  toClassSequence,
  buildRuns,
} from './analysisEngine';
import {
  analyzePatternPhases,
  balanceSegmentLengthLists,
  collectMergedExpectedRunLengths,
  collectMergedNextSValues,
  describePhaseState,
  dominantPatternLabel,
  inferNextClassFromPhases,
  getMasterRunLengthsForSide,
  phaseRecommendationsToDigitCandidates,
  pickSingleNextDigit,
  pickVariedNextSValues,
  digitMatchesClass,
  classDigitOrder,
  wouldFormRepetitivePattern,
  countTrailingSameDigit,
  sliceRecentRunLengths,
  type PatternSlotRecommendation,
  type PhaseRecommendation,
  type SingleNextDigitPick,
} from './codeValuePhaseEngine';
import { pickBalancedDigitAvoidingPatternValue } from './patternDigitGuard';
import { pickDigitFromMasterPatterns } from './masterPatternDigitEngine';
import {
  collectSegmentDigitTransitions,
  getLiveSegmentState,
  type LiveSegmentState,
  type RunSegmentPrediction,
  type SegmentValueCandidate,
} from './runSegmentEngine';

const PATTERN_FIELDS = Object.keys(PATTERN_FIELD_LABELS) as (keyof SidePatterns)[];
const S_SUFFIX_LEN = 10;
const MIN_STRUCTURAL_FIT = 0.68;
export const BATCH_DECIMAL_DIGITS = 4;
export const BATCH_VARIANT_COUNT = 4;

/** pattern-flow: Code Value run 흐름 · low/high: 해당 밴드만 */
export type BatchBandMode = 'pattern-flow' | 'low' | 'high';

export type {
  PhaseRecommendation,
  PatternPhaseKind,
  PatternSlotRecommendation,
  SingleNextDigitPick,
} from './codeValuePhaseEngine';
export {
  analyzePatternPhases,
  assignUniqueNextSPerSlot,
  balanceSegmentLengthLists,
  buildPatternSlotRecommendations,
  buildPatternTransitionHints,
  collectMergedExpectedRunLengths,
  collectMergedNextSValues,
  countTrailingSameDigit,
  dominantPatternLabel,
  getRecentMasterRunLengths,
  pickChainStepDigit,
  pickSingleNextDigit,
  pickVariedBandDigits,
  pickVariedNextSValues,
  recentPatternFieldValues,
  sliceRecentRunLengths,
  wouldFormRepetitivePattern,
} from './codeValuePhaseEngine';

export interface PatternStructuralMatch {
  digitIndex: number;
  fit: number;
  patternLabel: string;
  nextDigit: number;
  nextClass: DigitClass;
  runTotalLength: number;
  remainingInRun: number;
  runEndsAfterNext: boolean;
  phase?: 'repeat' | 'transition';
}

export interface CodeValuePatternDigitCandidate {
  digit: number;
  fit: number;
  patternLabel: string;
}

export interface BatchDigitStepPick extends SingleNextDigitPick {
  step: number;
}

export interface BatchNextDigitsPick {
  digits: number[];
  chain: string;
  steps: BatchDigitStepPick[];
  /** UI 표시용 — 1부터 */
  variantIndex?: number;
  rankOffset?: number;
}

export interface CodeValuePatternPrediction {
  live: LiveSegmentState;
  sideLabel: string;
  nextClass: DigitClass;
  nextClassLabel: string;
  repeatDescription: string;
  activePatternLabels: string[];
  digitCandidates: CodeValuePatternDigitCandidate[];
  segment: RunSegmentPrediction;
  bestMatch: PatternStructuralMatch | null;
  phaseRecommendations: PhaseRecommendation[];
  patternSlotRecommendations: PatternSlotRecommendation[];
  /** @deprecated 첫 자리 — batchDigitPick.steps[0] 참고 */
  nextDigitPick: SingleNextDigitPick | null;
  batchDigitPick: BatchNextDigitsPick | null;
  batchDigitPicks: BatchNextDigitsPick[];
  rationale: string[];
}

function sideLabel(side: DigitClass): string {
  return side === 'low' ? '저점(STEP2)' : '고점(STEP3)';
}

function classLabel(cls: DigitClass): string {
  return cls === 'low' ? '저점(0~4)' : '고점(5~9)';
}

function patternFieldCounts(s: number[], side: DigitClass): Map<keyof SidePatterns, number> {
  const patterns = extractCodeValuesFromBaseSequence(s, side);
  const counts = new Map<keyof SidePatterns, number>();
  for (const field of PATTERN_FIELDS) {
    counts.set(field, patterns[field]?.length ?? 0);
  }
  return counts;
}

function patternStructuralFit(
  liveS: number[],
  histS: number[],
  side: DigitClass,
  liveProgress: number,
  histProgress: number,
): number {
  if (liveProgress !== histProgress) return 0;

  const liveCounts = patternFieldCounts(liveS, side);
  const histCounts = patternFieldCounts(histS, side);

  let fields = 0;
  let match = 0;
  for (const field of PATTERN_FIELDS) {
    fields += 1;
    if (liveCounts.get(field) === histCounts.get(field)) match += 1;
  }
  const patScore = fields > 0 ? match / fields : 0;

  if (liveS.length === 0 && histS.length === 0) return patScore;
  const n = Math.min(S_SUFFIX_LEN, liveS.length, histS.length);
  if (n < 1) return patScore * 0.5;

  let sMatch = 0;
  for (let i = 0; i < n; i += 1) {
    if (liveS[liveS.length - n + i] === histS[histS.length - n + i]) sMatch += 1;
  }
  const sScore = sMatch / n;

  return patScore * 0.6 + sScore * 0.4;
}

function collectActivePatternLabels(s: number[], side: DigitClass): string[] {
  const patterns = extractCodeValuesFromBaseSequence(s, side);
  const labels: string[] = [];
  for (const field of PATTERN_FIELDS) {
    const values = patterns[field];
    if (values && values.length > 0) labels.push(PATTERN_FIELD_LABELS[field][side]);
  }
  return labels;
}

function getHistLiveState(masterDigits: string, digitIndex: number): LiveSegmentState | null {
  const sub = masterDigits.slice(0, digitIndex + 1);
  return getLiveSegmentState(sub);
}

function getRunTotalAtSnapshot(
  masterDigits: string,
  side: DigitClass,
  snap: { digitIndex: number; progress: number },
): number {
  const runs = buildRuns(toClassSequence(masterDigits));
  for (const run of runs) {
    if (run.cls !== side) continue;
    const runStart = run.endIndex - run.length;
    const runEnd = run.endIndex - 1;
    if (snap.digitIndex >= runStart && snap.digitIndex <= runEnd) {
      return run.length;
    }
  }
  return snap.progress;
}

/** @deprecated 구조 스캔 — 테스트·디버그용. 예측은 analyzePatternPhases 사용 */
export function scanPatternStructuralMatches(
  masterDigits: string,
  live: LiveSegmentState,
): PatternStructuralMatch[] {
  if (!masterDigits) return [];

  const matches: PatternStructuralMatch[] = [];

  for (let i = 0; i < masterDigits.length - 1; i += 1) {
    const hist = getHistLiveState(masterDigits, i);
    if (!hist || hist.side !== live.side) continue;
    if (hist.currentRunProgress !== live.currentRunProgress) continue;

    const fit = patternStructuralFit(
      live.completedRunLengths,
      hist.completedRunLengths,
      live.side,
      live.currentRunProgress,
      hist.currentRunProgress,
    );
    if (fit < MIN_STRUCTURAL_FIT) continue;

    const nextRaw = masterDigits[i + 1];
    if (nextRaw === undefined || nextRaw < '0' || nextRaw > '9') continue;
    const nextDigit = Number(nextRaw);
    const nextClass: DigitClass = nextDigit <= 4 ? 'low' : 'high';

    const runTotalLength = getRunTotalAtSnapshot(masterDigits, live.side, {
      digitIndex: i,
      progress: hist.currentRunProgress,
    });
    const remainingInRun = Math.max(0, runTotalLength - live.currentRunProgress);
    const runEndsAfterNext = remainingInRun <= 1 && live.currentRunProgress >= runTotalLength - 1;

    matches.push({
      digitIndex: i,
      fit,
      patternLabel: dominantPatternLabel(hist.completedRunLengths, live.side),
      nextDigit,
      nextClass,
      runTotalLength,
      remainingInRun: Math.max(0, runTotalLength - live.currentRunProgress),
      runEndsAfterNext,
    });
  }

  matches.sort((a, b) => b.fit - a.fit || a.digitIndex - b.digitIndex);
  return matches;
}

/** digit별 최고 적합도 1건만 */
export function dedupeDigitCandidates(
  matches: PatternStructuralMatch[],
  maxCount = 3,
): CodeValuePatternDigitCandidate[] {
  const bestByDigit = new Map<number, CodeValuePatternDigitCandidate>();

  for (const m of matches) {
    const prev = bestByDigit.get(m.nextDigit);
    if (!prev || m.fit > prev.fit) {
      bestByDigit.set(m.nextDigit, {
        digit: m.nextDigit,
        fit: m.fit,
        patternLabel: m.patternLabel,
      });
    }
  }

  return [...bestByDigit.values()]
    .sort((a, b) => b.fit - a.fit || a.digit - b.digit)
    .slice(0, maxCount);
}

function phaseToBestMatch(
  top: PhaseRecommendation,
  live: LiveSegmentState,
  _prefix: string,
  digitCandidates: CodeValuePatternDigitCandidate[],
): PatternStructuralMatch {
  void _prefix;
  const nextDigit = digitCandidates[0]?.digit ?? 0;
  const nextClass =
    top.runEndsAfterNext
      ? (top.nextClass ?? (live.side === 'low' ? 'high' : 'low'))
      : live.side;

  return {
    digitIndex: -1,
    fit: top.fit,
    patternLabel: top.patternLabel,
    nextDigit,
    nextClass,
    runTotalLength: top.expectedRunLength ?? live.currentRunProgress,
    remainingInRun: top.remainingInRun ?? 0,
    runEndsAfterNext: top.runEndsAfterNext ?? false,
    phase: top.phase,
  };
}

function fitToSegmentCandidates(
  recs: PhaseRecommendation[],
  pick: (r: PhaseRecommendation) => number | undefined,
): SegmentValueCandidate[] {
  const bestByValue = new Map<number, number>();
  for (const r of recs) {
    const value = pick(r);
    if (value === undefined || value < 0) continue;
    const prev = bestByValue.get(value);
    if (prev === undefined || r.fit > prev) bestByValue.set(value, r.fit);
  }

  const maxFit = Math.max(...bestByValue.values(), 0.001);
  return [...bestByValue.entries()]
    .map(([value, fit]) => ({
      value,
      score: fit,
      probability: Math.round((fit / maxFit) * 1000) / 10,
    }))
    .filter((row) => row.value > 0 || row.score > 0)
    .sort((a, b) => b.score - a.score || a.value - b.value)
    .slice(0, 5);
}

function buildSegmentFromPhases(
  live: LiveSegmentState,
  recs: PhaseRecommendation[],
  prefix: string,
): RunSegmentPrediction {
  const top = recs[0] ?? null;
  const fit = top?.fit ?? 0.7;
  const progress = live.currentRunProgress;
  const s = live.completedRunLengths;

  const nextPool = collectMergedNextSValues(recs, s, progress, 12);
  const expectedPool = collectMergedExpectedRunLengths(recs, progress, 12);
  const balanced = balanceSegmentLengthLists(nextPool, expectedPool, 1);
  const singlePick = pickSingleNextDigit(recs, prefix);
  const nextSegment: SegmentValueCandidate[] = [];

  if (singlePick) {
    nextSegment.push({
      value: singlePick.digit,
      score: top?.fit ?? 0.7,
      probability: Math.min(100, 70 + singlePick.consensusCount * 3),
    });
  } else if (balanced.next[0]) {
    const row = balanced.next[0];
    nextSegment.push({ value: row.value, score: row.fit, probability: 100 });
  } else {
    const fallback = pickVariedNextSValues(s, live.side, progress)[0];
    if (fallback !== undefined) {
      nextSegment.push({ value: fallback, score: fit, probability: 100 });
    }
  }

  const expectedRun: SegmentValueCandidate[] = balanced.expected.slice(0, 1).map((row) => ({
    value: row.value,
    score: row.fit,
    probability: 100,
  }));

  if (expectedRun.length === 0 && progress >= 1 && nextSegment[0]) {
    expectedRun.push({
      value: progress,
      score: fit,
      probability: progress === nextSegment[0].value ? 90 : 100,
    });
  }

  const remaining = fitToSegmentCandidates(
    recs.filter((r) => (r.remainingInRun ?? 0) > 0),
    (r) => r.remainingInRun,
  );

  const runEnds = top?.runEndsAfterNext ?? progress >= 2;

  return {
    side: live.side,
    sideLabel: sideLabel(live.side),
    live,
    sPrefixLabel: live.completedRunLengths.length > 0 ? live.completedRunLengths.join(', ') : '(시작)',
    nextSegmentCandidates: nextSegment,
    remainingInRunCandidates: remaining,
    expectedRunLengthCandidates: expectedRun,
    runEndsAfterNextDigit: runEnds,
    activePatternLabels: collectActivePatternLabels(live.completedRunLengths, live.side),
    matchTier: top ? (top.phase === 'transition' ? 'suffix' : 'progress') : 'none',
    sampleCount: recs.length,
    segmentConfidence: top?.fit ?? 0,
  };
}

function resolveTargetDigitClass(
  live: LiveSegmentState,
  bandMode: BatchBandMode,
): DigitClass {
  if (bandMode === 'low') return 'low';
  if (bandMode === 'high') return 'high';
  return live.side;
}

/**
 * 저점만/고점만 — 해당 side Code Value(S·패턴) 맥락으로 분석.
 * 현재 digit run이 반대 side여도 Master·prefix에서 동 side 마지막 위치를 참고.
 */
function resolveBandScopedLive(
  liveDigits: string,
  result: AnalysisResult,
  bandMode: BatchBandMode,
): LiveSegmentState | null {
  const live = getLiveSegmentState(liveDigits);
  if (!live) return null;
  if (bandMode === 'pattern-flow') return live;

  const targetSide: DigitClass = bandMode;
  if (live.side === targetSide) return live;

  const master = result.digits;
  for (let i = master.length - 1; i >= 0; i -= 1) {
    const subLive = getLiveSegmentState(master.slice(0, i + 1));
    if (subLive?.side === targetSide) {
      return { ...subLive, sourceDigits: liveDigits };
    }
  }

  return {
    side: targetSide,
    completedRunLengths: sliceRecentRunLengths(getMasterRunLengthsForSide(result, targetSide)),
    currentRunProgress: 1,
    sourceDigits: liveDigits,
  };
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

function isDigitOverusedInRecent(prefix: string, digit: number, maxCount = 1): boolean {
  return (recentDigitCounts(prefix).get(digit) ?? 0) >= maxCount;
}

function digitFromPhaseRecForClass(
  rec: PhaseRecommendation,
  slotIndex: number,
  prefix: string,
  targetClass: DigitClass,
): number | null {
  void rec;
  const picked = pickBalancedDigitAvoidingPatternValue(
    -1,
    slotIndex,
    prefix,
    new Set<number>(),
    classDigitOrder(targetClass, slotIndex),
    {
      trailingSame: countTrailingSameDigit,
      wouldRepeat: wouldFormRepetitivePattern,
      isOverused: isDigitOverusedInRecent,
    },
  );
  if (picked !== null) return picked;
  for (const d of classDigitOrder(targetClass, slotIndex)) {
    if (wouldFormRepetitivePattern(prefix, d)) continue;
    if (isDigitOverusedInRecent(prefix, d)) continue;
    return d;
  }
  return null;
}

function describeFlowReason(
  live: LiveSegmentState,
  top: PhaseRecommendation | null,
  targetClass: DigitClass,
  bandMode: BatchBandMode = 'pattern-flow',
): string {
  const band = targetClass === 'low' ? '저점(0~4)' : '고점(5~9)';
  const scope =
    bandMode === 'low' ? ' · 저점 run 전용' : bandMode === 'high' ? ' · 고점 run 전용' : '';
  if (!top) return `${band} · run ${live.currentRunProgress}자${scope}`;
  const phaseTag = top.phase === 'repeat' ? '반복' : '전환';
  if (top.remainingInRun && top.remainingInRun > 0) {
    return `${phaseTag} · ${top.patternLabel} · ${band} · run ${live.currentRunProgress}자 · 남 ${top.remainingInRun}${scope}`;
  }
  if (top.runEndsAfterNext) {
    return `${phaseTag} · ${top.patternLabel} · ${band} · run 종료 예상${scope}`;
  }
  return `${phaseTag} · ${top.patternLabel} · ${band} · run ${live.currentRunProgress}자${scope}`;
}

/**
 * Code Value phase + Master S 전환 + Master 패턴 — run side 흐름에 맞는 digit 1개.
 * 강제 2:2 균형 없음 — live.side(현 run) 기준 저·고점 결정.
 */
export function pickPatternFlowDigit(
  result: AnalysisResult,
  contextLive: LiveSegmentState,
  phaseRecs: PhaseRecommendation[],
  prefix: string,
  targetClass: DigitClass,
  options: {
    rankOffset?: number;
    phaseRecStart?: number;
    usedInBatch?: Set<number>;
    bandMode?: BatchBandMode;
  } = {},
): SingleNextDigitPick | null {
  const rankOffset = options.rankOffset ?? 0;
  const phaseRecStart = options.phaseRecStart ?? 0;
  const usedInBatch = options.usedInBatch;
  const bandMode = options.bandMode ?? 'pattern-flow';

  const sorted = [...phaseRecs].sort((a, b) => b.fit - a.fit);
  const topRecs = sorted.slice(phaseRecStart, phaseRecStart + 5);
  if (topRecs.length === 0 && sorted.length > 0) topRecs.push(sorted[0]!);

  const votes = new Map<number, { weight: number; label: string; hits: number }>();

  topRecs.forEach((rec, slotIndex) => {
    const digit = digitFromPhaseRecForClass(rec, slotIndex + phaseRecStart, prefix, targetClass);
    if (digit === null) return;
    const phaseTag = rec.phase === 'repeat' ? '반복' : '전환';
    const label = `${phaseTag} · ${rec.patternLabel}`;
    const row = votes.get(digit) ?? { weight: 0, label, hits: 0 };
    row.weight += rec.fit * (rec.phase === 'repeat' ? 1.05 : 1.0);
    row.hits += 1;
    if (row.hits === 1) row.label = label;
    votes.set(digit, row);
  });

  const segmentWeights = collectSegmentDigitTransitions(result.digits, contextLive);
  for (const [digit, w] of segmentWeights) {
    if (!digitMatchesClass(digit, targetClass)) continue;
    const row = votes.get(digit) ?? {
      weight: 0,
      label: dominantPatternLabel(contextLive.completedRunLengths, contextLive.side),
      hits: 0,
    };
    row.weight += w * 1.4;
    row.hits += 1;
    votes.set(digit, row);
  }

  const top = topRecs[0] ?? null;
  const phaseBoost = new Map<number, string>();
  for (const [digit, meta] of votes) {
    phaseBoost.set(digit, meta.label);
  }

  const masterPick = pickDigitFromMasterPatterns(
    result,
    contextLive,
    prefix,
    targetClass,
    phaseBoost.size > 0 ? phaseBoost : undefined,
    0,
    usedInBatch,
  );
  if (masterPick) {
    const row = votes.get(masterPick.digit) ?? {
      weight: 0,
      label: masterPick.patternLabel,
      hits: 0,
    };
    row.weight += 0.35 + masterPick.consensusCount * 0.08;
    row.hits += masterPick.consensusCount;
    row.label = masterPick.patternLabel;
    votes.set(masterPick.digit, row);
  }

  const ranked = [...votes.entries()].sort(
    (a, b) => b[1].weight - a[1].weight || b[1].hits - a[1].hits || a[0] - b[0],
  );

  const flowReason = describeFlowReason(contextLive, top, targetClass, bandMode);
  let skipped = 0;
  for (const [digit, meta] of ranked) {
    if (!digitMatchesClass(digit, targetClass)) continue;
    if (usedInBatch?.has(digit)) continue;
    if (wouldFormRepetitivePattern(prefix, digit)) continue;
    if (isDigitOverusedInRecent(prefix, digit)) continue;
    if (skipped < rankOffset) {
      skipped += 1;
      continue;
    }
    return {
      digit,
      patternLabel: meta.label,
      consensusCount: meta.hits,
      reason: `${flowReason} · ${meta.label} · ${meta.hits}건`,
    };
  }

  if (masterPick && !usedInBatch?.has(masterPick.digit)) {
    return { ...masterPick, reason: `${flowReason} · ${masterPick.reason}` };
  }

  const phaseOnly = pickSingleNextDigit(topRecs.length > 0 ? topRecs : phaseRecs, prefix);
  if (
    phaseOnly &&
    digitMatchesClass(phaseOnly.digit, targetClass) &&
    !usedInBatch?.has(phaseOnly.digit)
  ) {
    return { ...phaseOnly, reason: `${flowReason} · ${phaseOnly.reason}` };
  }

  for (const digit of classDigitOrder(targetClass, prefix.length + rankOffset)) {
    if (usedInBatch?.has(digit)) continue;
    if (wouldFormRepetitivePattern(prefix, digit)) continue;
    if (isDigitOverusedInRecent(prefix, digit)) continue;
    return {
      digit,
      patternLabel: dominantPatternLabel(contextLive.completedRunLengths, contextLive.side),
      consensusCount: 0,
      reason: `${flowReason} · 패턴 대안`,
    };
  }

  return null;
}

function digitMatchesBandMode(digit: number, bandMode: BatchBandMode): boolean {
  if (bandMode === 'low') return digit >= 0 && digit <= 4;
  if (bandMode === 'high') return digit >= 5 && digit <= 9;
  return true;
}

/** Code Value 패턴 — 소수점 4자리 연쇄 (패턴 흐름 · 매 자리 재분석) */
export function pickBatchNextDigits(
  result: AnalysisResult,
  prefix: string,
  count = BATCH_DECIMAL_DIGITS,
  variantSeed = 0,
  bandMode: BatchBandMode = 'pattern-flow',
): BatchNextDigitsPick | null {
  if (result.totalCount === 0 || count < 1) return null;

  const steps: BatchDigitStepPick[] = [];
  let workingPrefix = prefix;
  const usedInBatch = new Set<number>();
  const phaseRecStart = variantSeed % 4;
  const rankBase = Math.floor(variantSeed / 4);

  for (let step = 1; step <= count; step += 1) {
    const liveDigits = workingPrefix.length > 0 ? workingPrefix : result.digits;
    const live = getLiveSegmentState(liveDigits);
    if (!live) break;

    const contextLive = resolveBandScopedLive(liveDigits, result, bandMode) ?? live;
    const masterRunLengths = getMasterRunLengthsForSide(result, contextLive.side);
    const phaseRecs = analyzePatternPhases(contextLive, masterRunLengths);
    const targetClass = resolveTargetDigitClass(live, bandMode);
    const stepRank = rankBase + ((step - 1) % 2);

    const pick = pickPatternFlowDigit(
      result,
      contextLive,
      phaseRecs,
      workingPrefix,
      targetClass,
      {
        rankOffset: stepRank,
        phaseRecStart,
        usedInBatch,
        bandMode,
      },
    );

    if (!pick || !digitMatchesBandMode(pick.digit, bandMode)) break;

    usedInBatch.add(pick.digit);
    steps.push({ ...pick, step });
    workingPrefix += String(pick.digit);
  }

  if (steps.length < count) return null;

  const digits = steps.map((s) => s.digit);
  return {
    digits,
    chain: digits.join(''),
    steps,
    rankOffset: variantSeed,
  };
}

/** Master 패턴 + Code Value 흐름 기반 4자리 후보 3~4세트 */
export function pickMultipleBatchNextDigits(
  result: AnalysisResult,
  prefix: string,
  count = BATCH_DECIMAL_DIGITS,
  maxVariants = BATCH_VARIANT_COUNT,
  bandMode: BatchBandMode = 'pattern-flow',
): BatchNextDigitsPick[] {
  const out: BatchNextDigitsPick[] = [];
  const seen = new Set<string>();

  for (let attempt = 0; attempt < maxVariants + 8 && out.length < maxVariants; attempt += 1) {
    const batch = pickBatchNextDigits(result, prefix, count, attempt, bandMode);
    if (!batch || seen.has(batch.chain)) continue;
    seen.add(batch.chain);
    out.push({ ...batch, variantIndex: out.length + 1 });
  }

  return out;
}

/**
 * Code Value 패턴 — repeat/transition phase + Master 패턴 전환 힌트.
 * Master digit 복사 없음.
 */
export function predictFromCodeValuePatterns(
  result: AnalysisResult,
  prefix: string,
): CodeValuePatternPrediction | null {
  if (result.totalCount === 0) return null;

  const liveDigits = prefix.length > 0 ? prefix : result.digits;
  const live = getLiveSegmentState(liveDigits);
  if (!live) return null;

  const masterRunLengths = getMasterRunLengthsForSide(result, live.side);
  const phaseRecs = analyzePatternPhases(live, masterRunLengths);
  const batchDigitPicks = pickMultipleBatchNextDigits(result, prefix, BATCH_DECIMAL_DIGITS);
  const batchDigitPick = batchDigitPicks[0] ?? pickBatchNextDigits(result, prefix, BATCH_DECIMAL_DIGITS);
  const nextDigitPick = batchDigitPick?.steps[0] ?? pickSingleNextDigit(phaseRecs, prefix);
  const patternSlotRecommendations: PatternSlotRecommendation[] = [];
  const digitCandidates = batchDigitPick
    ? batchDigitPick.steps.map((step, i) => ({
        digit: step.digit,
        fit: phaseRecs[i]?.fit ?? phaseRecs[0]?.fit ?? 0.7,
        patternLabel: step.patternLabel,
      }))
    : nextDigitPick
      ? [{ digit: nextDigitPick.digit, fit: phaseRecs[0]?.fit ?? 0.7, patternLabel: nextDigitPick.patternLabel }]
      : phaseRecommendationsToDigitCandidates(live, phaseRecs, prefix, BATCH_DECIMAL_DIGITS);
  const top = phaseRecs[0] ?? null;
  const nextClass = inferNextClassFromPhases(live, phaseRecs);
  const bestMatch = top ? phaseToBestMatch(top, live, prefix, digitCandidates) : null;

  const rationale: string[] = [
    describePhaseState(live, top),
    `다음 구간: ${classLabel(nextClass)}`,
  ];
  if (batchDigitPick) {
    rationale.push(`추천 4자리 ${batchDigitPick.chain} · Code Value 패턴 흐름`);
    if (batchDigitPicks.length > 1) {
      rationale.push(`대안 ${batchDigitPicks.slice(1).map((b) => b.chain).join(' / ')}`);
    }
  } else if (nextDigitPick) {
    rationale.push(`추천 digit ${nextDigitPick.digit} · ${nextDigitPick.reason}`);
  } else if (top) {
    rationale.push(`${top.phase === 'repeat' ? '반복' : '전환'} · ${top.patternLabel} · ${Math.round(top.fit * 100)}%`);
    rationale.push(top.reason);
  }

  return {
    live,
    sideLabel: sideLabel(live.side),
    nextClass,
    nextClassLabel: classLabel(nextClass),
    repeatDescription: describePhaseState(live, top),
    activePatternLabels: collectActivePatternLabels(live.completedRunLengths, live.side),
    digitCandidates,
    segment: buildSegmentFromPhases(live, phaseRecs, prefix),
    bestMatch,
    phaseRecommendations: phaseRecs,
    patternSlotRecommendations,
    nextDigitPick,
    batchDigitPick,
    batchDigitPicks,
    rationale,
  };
}

export function formatCodeValuePatternTargetLabel(
  prediction: CodeValuePatternPrediction | null | undefined,
): string | null {
  if (!prediction) return null;
  return prediction.rationale.slice(0, 3).join(' · ');
}
