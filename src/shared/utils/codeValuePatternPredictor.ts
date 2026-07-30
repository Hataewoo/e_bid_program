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
  getMasterRunLengthsForSide,
  inferNextClassFromPhases,
  phaseRecommendationsToDigitCandidates,
  pickVariedNextSValues,
  type PhaseRecommendation,
} from './codeValuePhaseEngine';
import {
  getLiveSegmentState,
  type LiveSegmentState,
  type RunSegmentPrediction,
  type SegmentValueCandidate,
} from './runSegmentEngine';

const PATTERN_FIELDS = Object.keys(PATTERN_FIELD_LABELS) as (keyof SidePatterns)[];
const S_SUFFIX_LEN = 10;
const MIN_STRUCTURAL_FIT = 0.68;

export type { PhaseRecommendation, PatternPhaseKind } from './codeValuePhaseEngine';
export {
  analyzePatternPhases,
  balanceSegmentLengthLists,
  buildPatternTransitionHints,
  collectMergedExpectedRunLengths,
  collectMergedNextSValues,
  countTrailingSameDigit,
  dominantPatternLabel,
  pickChainStepDigit,
  pickVariedBandDigits,
  pickVariedNextSValues,
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
  prefix: string,
  digitCandidates: CodeValuePatternDigitCandidate[],
): PatternStructuralMatch {
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
): RunSegmentPrediction {
  const top = recs[0] ?? null;
  const fit = top?.fit ?? 0.7;
  const progress = live.currentRunProgress;
  const s = live.completedRunLengths;

  const nextPool = collectMergedNextSValues(recs, s, progress, 12);
  const expectedPool = collectMergedExpectedRunLengths(recs, progress, 12);
  const balanced = balanceSegmentLengthLists(nextPool, expectedPool, 5);

  const nextSegment: SegmentValueCandidate[] = balanced.next.map((row, i) => ({
    value: row.value,
    score: row.fit,
    probability: Math.round((row.fit / (balanced.next[0]?.fit ?? 1)) * (100 - i * 8) * 10) / 10,
  }));

  if (nextSegment.length === 0) {
    for (const value of pickVariedNextSValues(s, live.side, progress).slice(0, 4)) {
      nextSegment.push({ value, score: fit, probability: 100 - nextSegment.length * 10 });
    }
  }

  const expectedRun: SegmentValueCandidate[] = balanced.expected.map((row, i) => ({
    value: row.value,
    score: row.fit,
    probability: Math.round((row.fit / (balanced.expected[0]?.fit ?? 1)) * (100 - i * 8) * 10) / 10,
  }));

  if (expectedRun.length === 0 && progress >= 1) {
    const fallback = progress;
    const overlapsNext = nextSegment.some((c) => c.value === fallback);
    const allowOverlap = top?.runEndsAfterNext || progress >= 2;
    if (allowOverlap && (!overlapsNext || top?.runEndsAfterNext)) {
      expectedRun.push({
        value: fallback,
        score: fit,
        probability: 100,
      });
    } else if (progress === 1 && !nextSegment.some((c) => c.value === 1)) {
      expectedRun.push({ value: 1, score: fit * 0.9, probability: 90 });
    } else {
      const alt = expectedPool.find((row) => !nextSegment.some((c) => c.value === row.value));
      if (alt) {
        expectedRun.push({
          value: alt.value,
          score: alt.fit,
          probability: Math.round((alt.fit / (expectedPool[0]?.fit ?? 1)) * 1000) / 10,
        });
      } else if (allowOverlap) {
        expectedRun.push({ value: fallback, score: fit, probability: 100 });
      }
    }
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
    sampleCount: recs.length > 0 ? 1 : 0,
    segmentConfidence: top?.fit ?? 0,
  };
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
  const digitCandidates = phaseRecommendationsToDigitCandidates(live, phaseRecs, prefix, 5);
  const top = phaseRecs[0] ?? null;
  const nextClass = inferNextClassFromPhases(live, phaseRecs);
  const bestMatch = top ? phaseToBestMatch(top, live, prefix, digitCandidates) : null;

  const rationale: string[] = [
    describePhaseState(live, top),
    `다음 구간: ${classLabel(nextClass)}`,
  ];
  if (top) {
    rationale.push(`${top.phase === 'repeat' ? '반복' : '전환'} · ${top.patternLabel} · ${Math.round(top.fit * 100)}%`);
    rationale.push(top.reason);
  }
  if (digitCandidates.length > 0) {
    rationale.push(
      `digit ${digitCandidates.map((c) => `${c.digit}(${c.patternLabel})`).join(', ')}`,
    );
  }

  return {
    live,
    sideLabel: sideLabel(live.side),
    nextClass,
    nextClassLabel: classLabel(nextClass),
    repeatDescription: describePhaseState(live, top),
    activePatternLabels: collectActivePatternLabels(live.completedRunLengths, live.side),
    digitCandidates,
    segment: buildSegmentFromPhases(live, phaseRecs),
    bestMatch,
    phaseRecommendations: phaseRecs,
    rationale,
  };
}

export function formatCodeValuePatternTargetLabel(
  prediction: CodeValuePatternPrediction | null | undefined,
): string | null {
  if (!prediction) return null;
  return prediction.rationale.slice(0, 3).join(' · ');
}
