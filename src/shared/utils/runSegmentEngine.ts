import type { AnalysisResult, DigitClass, SidePatterns } from './analysisEngine';
import {
  buildRuns,
  extractCodeValuesFromBaseSequence,
  PATTERN_FIELD_LABELS,
  toClassSequence,
} from './analysisEngine';

const PATTERN_FIELDS = Object.keys(PATTERN_FIELD_LABELS) as (keyof SidePatterns)[];

/** 노란 줄 S — live prefix 위치 */
export interface LiveSegmentState {
  side: DigitClass;
  /** 완료된 primary run 길이 (S prefix) */
  completedRunLengths: number[];
  /** 현재 primary run 안에서 입력된 자릿수 (1~) */
  currentRunProgress: number;
  /** 분석에 사용한 digit 문자열 */
  sourceDigits: string;
}

export interface PrimaryRunCompletionEvent {
  digitIndex: number;
  sBefore: number[];
  segmentValue: number;
  nextDigit: number | null;
  runProgressAtEnd: number;
}

export interface SegmentValueCandidate {
  value: number;
  score: number;
  probability: number;
}

export interface RunSegmentPrediction {
  side: DigitClass;
  sideLabel: string;
  live: LiveSegmentState;
  /** S prefix 표시 (노란 줄) */
  sPrefixLabel: string;
  /** 다음 S 원소 (새 primary run 길이) */
  nextSegmentCandidates: SegmentValueCandidate[];
  /** 현재 run 남은 길이 (진행 중일 때) */
  remainingInRunCandidates: SegmentValueCandidate[];
  /** 현재 run 전체 예상 길이 (진행 중 fallback) */
  expectedRunLengthCandidates: SegmentValueCandidate[];
  /** run이 이번 digit 후 종료될 가능성 */
  runEndsAfterNextDigit: boolean;
  /** S prefix에서 활성 Code 패턴 라벨 */
  activePatternLabels: string[];
  sampleCount: number;
  /** exact | suffix | progress | none */
  matchTier: 'exact' | 'suffix' | 'progress' | 'none';
  /** digit 추천 가중치 (0~1 boost) */
  segmentConfidence: number;
}

function sideLabel(side: DigitClass): string {
  return side === 'low' ? '저점(STEP2)' : '고점(STEP3)';
}

function arraysEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

const S_PREFIX_SUFFIX_LEN = 10;

/** 긴 S prefix — 끝 N개 일치도 허용 (exact 우선) */
function sPrefixMatches(
  live: number[],
  hist: number[],
  suffixLen = S_PREFIX_SUFFIX_LEN,
): 'exact' | 'suffix' | false {
  if (arraysEqual(live, hist)) return 'exact';
  if (live.length === 0 || hist.length === 0) return false;
  const n = Math.min(suffixLen, live.length, hist.length);
  if (n < 2) return false;
  return arraysEqual(live.slice(-n), hist.slice(-n)) ? 'suffix' : false;
}

function matchWeight(kind: 'exact' | 'suffix', sim: number): number {
  return kind === 'exact' ? sim : sim * 0.72;
}

function contextSimilarity(
  liveSide: DigitClass,
  liveS: number[],
  histS: number[],
  matchKind: 'exact' | 'suffix',
): number {
  if (matchKind === 'exact') {
    return patternSimilarity(liveSide, liveS, histS);
  }
  const n = Math.min(S_PREFIX_SUFFIX_LEN, liveS.length, histS.length);
  if (n <= 0) return 0;
  return patternSimilarity(liveSide, liveS.slice(-n), histS.slice(-n));
}

function minSimilarityFor(matchKind: 'exact' | 'suffix' | 'progress'): number {
  if (matchKind === 'exact') return 0.55;
  if (matchKind === 'suffix') return 0.38;
  return 0.2;
}

function findRunCompletionContaining(
  events: PrimaryRunCompletionEvent[],
  snap: { digitIndex: number; progress: number },
): PrimaryRunCompletionEvent | null {
  for (const event of events) {
    const runStart = event.digitIndex - event.segmentValue + 1;
    if (snap.digitIndex >= runStart && snap.digitIndex <= event.digitIndex) {
      return event;
    }
  }
  return null;
}

function mergeWeights(target: Map<number, number>, source: Map<number, number>): void {
  for (const [value, score] of source) {
    target.set(value, (target.get(value) ?? 0) + score);
  }
}

function resolveMatchTier(
  hasExact: boolean,
  hasSuffix: boolean,
  hasProgress: boolean,
): 'exact' | 'suffix' | 'progress' | 'none' {
  if (hasExact) return 'exact';
  if (hasSuffix) return 'suffix';
  if (hasProgress) return 'progress';
  return 'none';
}

function sumScores(candidates: SegmentValueCandidate[]): number {
  return candidates.reduce((sum, c) => sum + c.score, 0);
}

function countSampleWeight(...maps: Map<number, number>[]): number {
  let total = 0;
  for (const m of maps) {
    for (const v of m.values()) total += v;
  }
  return Math.max(0, Math.round(total * 10) / 10);
}

function toCandidates(weights: Map<number, number>): SegmentValueCandidate[] {
  const total = [...weights.values()].reduce((s, v) => s + v, 0);
  const rows = [...weights.entries()]
    .map(([value, score]) => ({
      value,
      score,
      probability: total > 0 ? Math.round((score / total) * 1000) / 10 : 0,
    }))
    .filter((row) => row.score > 0);
  rows.sort((a, b) => b.score - a.score || a.value - b.value);
  return rows;
}

/** digit 문자열 → 현재 S 위치 (primary = 마지막 run class) */
export function getLiveSegmentState(digits: string): LiveSegmentState | null {
  if (!digits) return null;

  const runs = buildRuns(toClassSequence(digits));
  if (runs.length === 0) return null;

  const lastRun = runs[runs.length - 1]!;
  const side = lastRun.cls;
  const completedRunLengths: number[] = [];

  for (const run of runs) {
    if (run.cls !== side) continue;
    if (run.startIndex === lastRun.startIndex) break;
    completedRunLengths.push(run.length);
  }

  return {
    side,
    completedRunLengths,
    currentRunProgress: lastRun.length,
    sourceDigits: digits,
  };
}

/** Master에서 primary run이 끝날 때마다 S에 추가된 segment 기록 */
export function extractPrimaryRunCompletionEvents(
  digits: string,
  primary: DigitClass,
): PrimaryRunCompletionEvent[] {
  if (!digits) return [];

  const runs = buildRuns(toClassSequence(digits));
  const events: PrimaryRunCompletionEvent[] = [];
  const sAccum: number[] = [];

  for (const run of runs) {
    if (run.cls !== primary) continue;

    const nextDigitRaw = digits[run.endIndex];
    const nextDigit =
      nextDigitRaw !== undefined && nextDigitRaw >= '0' && nextDigitRaw <= '9'
        ? Number(nextDigitRaw)
        : null;

    events.push({
      digitIndex: run.endIndex - 1,
      sBefore: [...sAccum],
      segmentValue: run.length,
      nextDigit,
      runProgressAtEnd: run.length,
    });
    sAccum.push(run.length);
  }

  return events;
}

/** prefix 각 digit index에서 primary-side 진행 snapshot */
function extractProgressSnapshots(
  digits: string,
  primary: DigitClass,
): Array<{ digitIndex: number; sBefore: number[]; progress: number; nextDigit: number | null }> {
  if (digits.length === 0) return [];

  const snapshots: Array<{
    digitIndex: number;
    sBefore: number[];
    progress: number;
    nextDigit: number | null;
  }> = [];

  for (let i = 0; i < digits.length; i += 1) {
    const sub = digits.slice(0, i + 1);
    const state = getLiveSegmentState(sub);
    if (!state || state.side !== primary) continue;

    const nextRaw = digits[i + 1];
    const nextDigit =
      nextRaw !== undefined && nextRaw >= '0' && nextRaw <= '9' ? Number(nextRaw) : null;

    snapshots.push({
      digitIndex: i,
      sBefore: state.completedRunLengths,
      progress: state.currentRunProgress,
      nextDigit,
    });
  }

  return snapshots;
}

function patternSimilarity(
  liveSide: DigitClass,
  liveS: number[],
  histS: number[],
): number {
  if (liveS.length === 0 && histS.length === 0) return 1;
  if (liveS.length === 0 || histS.length === 0) return 0.35;

  const minLen = Math.min(liveS.length, histS.length);
  let match = 0;
  for (let i = 0; i < minLen; i += 1) {
    if (liveS[i] === histS[i]) match += 1;
  }
  const prefixScore = match / Math.max(liveS.length, histS.length);

  const livePatterns = extractCodeValuesFromBaseSequence(liveS, liveSide);
  const histPatterns = extractCodeValuesFromBaseSequence(histS, liveSide);

  let patternFields = 0;
  let patternMatch = 0;
  for (const field of PATTERN_FIELDS) {
    const a = livePatterns[field]?.length ?? 0;
    const b = histPatterns[field]?.length ?? 0;
    patternFields += 1;
    if (a === b) patternMatch += 1;
  }

  const patternScore = patternFields > 0 ? patternMatch / patternFields : 0;
  return prefixScore * 0.65 + patternScore * 0.35;
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

function collectNextSegmentSamples(
  masterDigits: string,
  live: LiveSegmentState,
): { weights: Map<number, number>; exact: boolean; suffix: boolean } {
  const weights = new Map<number, number>();
  let exact = false;
  let suffix = false;
  const events = extractPrimaryRunCompletionEvents(masterDigits, live.side);

  for (const event of events) {
    const kind = sPrefixMatches(live.completedRunLengths, event.sBefore);
    if (!kind) continue;

    const sim = contextSimilarity(live.side, live.completedRunLengths, event.sBefore, kind);
    if (sim < minSimilarityFor(kind)) continue;

    if (kind === 'exact') exact = true;
    else suffix = true;

    const w = matchWeight(kind, sim);
    weights.set(event.segmentValue, (weights.get(event.segmentValue) ?? 0) + w);
  }

  return { weights, exact, suffix };
}

function collectRemainingRunSamples(
  masterDigits: string,
  live: LiveSegmentState,
): { weights: Map<number, number>; exact: boolean; suffix: boolean } {
  const weights = new Map<number, number>();
  let exact = false;
  let suffix = false;
  if (live.currentRunProgress <= 0) return { weights, exact, suffix };

  const snapshots = extractProgressSnapshots(masterDigits, live.side);
  const events = extractPrimaryRunCompletionEvents(masterDigits, live.side);

  for (const snap of snapshots) {
    if (snap.progress !== live.currentRunProgress) continue;

    const kind = sPrefixMatches(live.completedRunLengths, snap.sBefore);
    if (!kind) continue;

    const sim = contextSimilarity(live.side, live.completedRunLengths, snap.sBefore, kind);
    if (sim < minSimilarityFor(kind)) continue;

    const event = findRunCompletionContaining(events, snap);
    if (!event) continue;

    if (kind === 'exact') exact = true;
    else suffix = true;

    const remaining = event.segmentValue - snap.progress;
    const w = matchWeight(kind, sim);
    if (remaining <= 0) {
      weights.set(0, (weights.get(0) ?? 0) + w);
      continue;
    }
    weights.set(remaining, (weights.get(remaining) ?? 0) + w);
  }

  return { weights, exact, suffix };
}

function collectTotalRunLengthSamples(
  masterDigits: string,
  live: LiveSegmentState,
): { weights: Map<number, number>; exact: boolean; suffix: boolean } {
  const weights = new Map<number, number>();
  let exact = false;
  let suffix = false;
  if (live.currentRunProgress <= 0) return { weights, exact, suffix };

  const snapshots = extractProgressSnapshots(masterDigits, live.side);
  const events = extractPrimaryRunCompletionEvents(masterDigits, live.side);

  for (const snap of snapshots) {
    if (snap.progress !== live.currentRunProgress) continue;

    const kind = sPrefixMatches(live.completedRunLengths, snap.sBefore);
    if (!kind) continue;

    const sim = contextSimilarity(live.side, live.completedRunLengths, snap.sBefore, kind);
    if (sim < minSimilarityFor(kind)) continue;

    const event = findRunCompletionContaining(events, snap);
    if (!event) continue;

    if (kind === 'exact') exact = true;
    else suffix = true;

    const w = matchWeight(kind, sim);
    weights.set(event.segmentValue, (weights.get(event.segmentValue) ?? 0) + w);
  }

  return { weights, exact, suffix };
}

/** progress fallback — S 유사도 가중 (flat 0.28 제거) */
function collectProgressFallbackSamples(
  masterDigits: string,
  live: LiveSegmentState,
): {
  next: Map<number, number>;
  remaining: Map<number, number>;
  total: Map<number, number>;
} {
  const next = new Map<number, number>();
  const remaining = new Map<number, number>();
  const total = new Map<number, number>();

  const events = extractPrimaryRunCompletionEvents(masterDigits, live.side);
  const snapshots = extractProgressSnapshots(masterDigits, live.side);

  for (const snap of snapshots) {
    if (snap.progress !== live.currentRunProgress) continue;

    const kind = sPrefixMatches(live.completedRunLengths, snap.sBefore);
    let w = 0.12;
    if (kind === 'exact') {
      w = contextSimilarity(live.side, live.completedRunLengths, snap.sBefore, 'exact');
    } else if (kind === 'suffix') {
      w = contextSimilarity(live.side, live.completedRunLengths, snap.sBefore, 'suffix') * 0.75;
    } else {
      const n = Math.min(6, live.completedRunLengths.length, snap.sBefore.length);
      if (n >= 2) {
        let match = 0;
        for (let i = 0; i < n; i += 1) {
          if (
            live.completedRunLengths[live.completedRunLengths.length - n + i] ===
            snap.sBefore[snap.sBefore.length - n + i]
          ) {
            match += 1;
          }
        }
        w = 0.1 + (match / n) * 0.35;
      }
    }
    if (w < 0.08) continue;

    const event = findRunCompletionContaining(events, snap);
    if (!event) continue;

    total.set(event.segmentValue, (total.get(event.segmentValue) ?? 0) + w);
    next.set(event.segmentValue, (next.get(event.segmentValue) ?? 0) + w);

    const rem = event.segmentValue - snap.progress;
    if (rem <= 0) remaining.set(0, (remaining.get(0) ?? 0) + w);
    else remaining.set(rem, (remaining.get(rem) ?? 0) + w);
  }

  return { next, remaining, total };
}

/**
 * Master에서 S·run 진행 문맥이 비슷한 위치의 실제 다음 digit 수집.
 * 고정 2111 대신 그때그때 Master 전환값 사용.
 */
export function collectSegmentDigitTransitions(
  masterDigits: string,
  live: LiveSegmentState,
): Map<number, number> {
  const weights = new Map<number, number>();
  const snapshots = extractProgressSnapshots(masterDigits, live.side);

  for (const snap of snapshots) {
    if (snap.progress !== live.currentRunProgress) continue;
    if (snap.nextDigit === null) continue;

    const kind = sPrefixMatches(live.completedRunLengths, snap.sBefore);
    let w = 0.1;
    if (kind === 'exact') {
      w = contextSimilarity(live.side, live.completedRunLengths, snap.sBefore, 'exact');
    } else if (kind === 'suffix') {
      w = contextSimilarity(live.side, live.completedRunLengths, snap.sBefore, 'suffix') * 0.78;
    } else {
      const n = Math.min(S_PREFIX_SUFFIX_LEN, live.completedRunLengths.length, snap.sBefore.length);
      if (n >= 2) {
        let match = 0;
        for (let i = 0; i < n; i += 1) {
          if (
            live.completedRunLengths[live.completedRunLengths.length - n + i] ===
            snap.sBefore[snap.sBefore.length - n + i]
          ) {
            match += 1;
          }
        }
        w = 0.08 + (match / n) * 0.4;
      }
    }
    if (w < 0.08) continue;

    const tierMult = kind === 'exact' ? 1 : kind === 'suffix' ? 0.85 : 0.55;
    weights.set(snap.nextDigit, (weights.get(snap.nextDigit) ?? 0) + w * tierMult);
  }

  return weights;
}

function segmentTierMultiplier(tier: RunSegmentPrediction['matchTier']): number {
  if (tier === 'exact') return 2.4;
  if (tier === 'suffix') return 1.6;
  if (tier === 'progress') return 0.85;
  return 0;
}

/**
 * 노란 줄 S + Code Values 패턴 기준 다음 구간 추천.
 * @param prefix 사용자 입력 소수 prefix (빈 문자열이면 Master 끝 상태)
 */
export function predictRunSegment(
  result: AnalysisResult,
  prefix: string,
): RunSegmentPrediction | null {
  if (result.totalCount === 0) return null;

  const liveDigits = prefix.length > 0 ? prefix : result.digits;
  const live = getLiveSegmentState(liveDigits);
  if (!live) return null;

  const nextCollected = collectNextSegmentSamples(result.digits, live);
  const remainingCollected =
    live.currentRunProgress > 0
      ? collectRemainingRunSamples(result.digits, live)
      : { weights: new Map<number, number>(), exact: false, suffix: false };
  const totalCollected =
    live.currentRunProgress > 0
      ? collectTotalRunLengthSamples(result.digits, live)
      : { weights: new Map<number, number>(), exact: false, suffix: false };

  let nextSegmentWeights = nextCollected.weights;
  let remainingWeights = remainingCollected.weights;
  let totalRunWeights = totalCollected.weights;

  let hasExact =
    nextCollected.exact || remainingCollected.exact || totalCollected.exact;
  let hasSuffix =
    nextCollected.suffix || remainingCollected.suffix || totalCollected.suffix;
  let hasProgress = false;

  const primaryEmpty =
    nextSegmentWeights.size === 0 &&
    remainingWeights.size === 0 &&
    totalRunWeights.size === 0;

  if (primaryEmpty) {
    const fallback = collectProgressFallbackSamples(result.digits, live);
    if (fallback.next.size > 0 || fallback.remaining.size > 0 || fallback.total.size > 0) {
      hasProgress = true;
      mergeWeights(nextSegmentWeights, fallback.next);
      mergeWeights(remainingWeights, fallback.remaining);
      mergeWeights(totalRunWeights, fallback.total);
    }
  }

  const matchTier = resolveMatchTier(hasExact, hasSuffix, hasProgress);

  let nextSegmentCandidates = toCandidates(nextSegmentWeights);
  let remainingInRunCandidates = toCandidates(remainingWeights);
  const expectedRunLengthCandidates = toCandidates(totalRunWeights);

  if (live.currentRunProgress > 0 && remainingInRunCandidates.length === 0 && totalRunWeights.size > 0) {
    const derived = new Map<number, number>();
    for (const [total, score] of totalRunWeights) {
      const rem = total - live.currentRunProgress;
      if (rem > 0) derived.set(rem, (derived.get(rem) ?? 0) + score);
    }
    remainingInRunCandidates = toCandidates(derived);
  }

  if (nextSegmentCandidates.length === 0 && live.currentRunProgress > 0) {
    nextSegmentCandidates = expectedRunLengthCandidates;
  }

  const runEndsAfterNextDigit =
    live.currentRunProgress > 0 &&
    (remainingWeights.has(0) ||
      (expectedRunLengthCandidates.some((c) => c.value === live.currentRunProgress) &&
        remainingInRunCandidates.length === 0));

  const sampleCount = countSampleWeight(nextSegmentWeights, remainingWeights, totalRunWeights);
  const totalAll =
    sumScores(nextSegmentCandidates) +
    sumScores(remainingInRunCandidates) +
    sumScores(expectedRunLengthCandidates);
  const topScore =
    nextSegmentCandidates[0]?.score ??
    remainingInRunCandidates[0]?.score ??
    expectedRunLengthCandidates[0]?.score ??
    0;
  const segmentConfidence =
    totalAll > 0 ? Math.min(1, topScore / totalAll) : sampleCount > 0 ? 0.35 : 0;

  return {
    side: live.side,
    sideLabel: sideLabel(live.side),
    live,
    sPrefixLabel: live.completedRunLengths.length > 0 ? live.completedRunLengths.join(', ') : '(시작)',
    nextSegmentCandidates,
    remainingInRunCandidates,
    expectedRunLengthCandidates,
    runEndsAfterNextDigit,
    activePatternLabels: collectActivePatternLabels(live.completedRunLengths, live.side),
    matchTier,
    sampleCount,
    segmentConfidence,
  };
}

/** S·패턴 문맥 digit 가중치 병합 (band 전체 boost 대신 Master 실측값) */
export function mergeSegmentContextIntoDigitScores(
  segment: RunSegmentPrediction | null | undefined,
  masterDigits: string,
  digitScores: Map<number, number>,
): Map<number, number> {
  if (!segment || segment.matchTier === 'none') return digitScores;

  const segmentDigits = collectSegmentDigitTransitions(masterDigits, segment.live);
  if (segmentDigits.size === 0) return digitScores;

  const merged = new Map(digitScores);
  const mult = segmentTierMultiplier(segment.matchTier);

  for (const [digit, score] of segmentDigits) {
    merged.set(digit, (merged.get(digit) ?? 0.04) + score * mult);
  }

  return merged;
}

/** @deprecated mergeSegmentContextIntoDigitScores 사용 */
export function applySegmentBoostToDigitScores(
  segment: RunSegmentPrediction | null | undefined,
  digitScores: Map<number, number>,
  masterDigits = '',
): Map<number, number> {
  if (!masterDigits) return digitScores;
  return mergeSegmentContextIntoDigitScores(segment, masterDigits, digitScores);
}

export function formatRunSegmentSummary(segment: RunSegmentPrediction | null | undefined): string | null {
  if (!segment) return null;

  const parts: string[] = [
    segment.sideLabel,
    `S: ${segment.sPrefixLabel}`,
  ];

  if (segment.live.currentRunProgress > 0) {
    parts.push(`run ${segment.live.currentRunProgress}자 진행`);
    if (segment.runEndsAfterNextDigit) {
      parts.push('다음 digit 후 run 종료');
    } else {
      const top = segment.remainingInRunCandidates.find((c) => c.value > 0);
      if (top) parts.push(`남은 ${top.value}자 (${top.probability}%)`);
      else {
        const total = segment.expectedRunLengthCandidates[0];
        if (total) parts.push(`run 예상 ${total.value}자 (${total.probability}%)`);
      }
    }
  } else {
    const top = segment.nextSegmentCandidates[0];
    if (top) parts.push(`다음 구간 ${top.value} (${top.probability}%)`);
  }

  if (segment.activePatternLabels.length > 0) {
    parts.push(`패턴 ${segment.activePatternLabels.slice(0, 3).join(', ')}`);
  }

  if (segment.sampleCount > 0) parts.push(`표본 ${segment.sampleCount}건`);

  return parts.join(' · ');
}
