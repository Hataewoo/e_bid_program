import type { AnalysisResult, DigitClass, SidePatterns } from './analysisEngine';
import {
  extractCodeValuesFromBaseSequence,
  PATTERN_FIELD_LABELS,
  toClassSequence,
} from './analysisEngine';
import {
  dominantPatternLabel,
  wouldFormRepetitivePattern,
  balancedDigitOrder,
  ALL_S_DIGITS,
  type SingleNextDigitPick,
} from './codeValuePhaseEngine';
import { getLiveSegmentState, type LiveSegmentState } from './runSegmentEngine';

const PATTERN_FIELDS = Object.keys(PATTERN_FIELD_LABELS) as (keyof SidePatterns)[];
const MIN_SNAPSHOT_SCORE = 0.32;
const S_PREFIX_SUFFIX_LEN = 10;

export type BatchBandMode = 'balanced' | 'low' | 'high';

export interface MasterPatternSnapshot {
  side: DigitClass;
  sBefore: number[];
  progress: number;
  patternCounts: Partial<Record<keyof SidePatterns, number>>;
  dominantLabel: string;
  nextDigit: number | null;
}

function arraysEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function sPrefixMatches(
  live: number[],
  hist: number[],
): 'exact' | 'suffix' | false {
  if (arraysEqual(live, hist)) return 'exact';
  if (live.length === 0 || hist.length === 0) return false;
  const n = Math.min(S_PREFIX_SUFFIX_LEN, live.length, hist.length);
  if (n < 2) return false;
  return arraysEqual(live.slice(-n), hist.slice(-n)) ? 'suffix' : false;
}

function patternFieldSimilarity(
  liveS: number[],
  histS: number[],
  side: DigitClass,
): number {
  const livePatterns = extractCodeValuesFromBaseSequence(liveS, side);
  const histPatterns = extractCodeValuesFromBaseSequence(histS, side);
  let fields = 0;
  let match = 0;
  for (const field of PATTERN_FIELDS) {
    fields += 1;
    const a = livePatterns[field]?.length ?? 0;
    const b = histPatterns[field]?.length ?? 0;
    if (a === b) match += 1;
    else if (Math.abs(a - b) <= 1) match += 0.55;
  }
  return fields > 0 ? match / fields : 0;
}

function snapshotContextScore(live: LiveSegmentState, snap: MasterPatternSnapshot): number {
  if (live.side !== snap.side) return 0;

  let score = live.currentRunProgress === snap.progress ? 0.22 : 0.08;
  const kind = sPrefixMatches(live.completedRunLengths, snap.sBefore);

  if (kind === 'exact') {
    score += 0.38 + patternFieldSimilarity(live.completedRunLengths, snap.sBefore, live.side) * 0.28;
  } else if (kind === 'suffix') {
    const n = Math.min(S_PREFIX_SUFFIX_LEN, live.completedRunLengths.length, snap.sBefore.length);
    score +=
      0.22 +
      patternFieldSimilarity(
        live.completedRunLengths.slice(-n),
        snap.sBefore.slice(-n),
        live.side,
      ) *
        0.22;
  } else if (live.completedRunLengths.length === 0 && snap.sBefore.length === 0) {
    score += 0.35;
  } else {
    const n = Math.min(6, live.completedRunLengths.length, snap.sBefore.length);
    if (n >= 2) {
      let prefixMatch = 0;
      for (let i = 0; i < n; i += 1) {
        if (
          live.completedRunLengths[live.completedRunLengths.length - n + i] ===
          snap.sBefore[snap.sBefore.length - n + i]
        ) {
          prefixMatch += 1;
        }
      }
      score += (prefixMatch / n) * 0.18;
    }
  }

  const livePatterns = extractCodeValuesFromBaseSequence(live.completedRunLengths, live.side);
  let fieldAlign = 0;
  for (const field of PATTERN_FIELDS) {
    const a = livePatterns[field]?.length ?? 0;
    const b = snap.patternCounts[field] ?? 0;
    if (a === b) fieldAlign += 1;
    else if (Math.abs(a - b) <= 1) fieldAlign += 0.5;
  }
  score += (fieldAlign / PATTERN_FIELDS.length) * 0.22;

  if (dominantPatternLabel(live.completedRunLengths, live.side) === snap.dominantLabel) {
    score += 0.08;
  }

  return Math.min(1, score);
}

/** Master 전체 digit walk — Code Value 패턴 스냅샷 인덱스 */
export function indexMasterPatternSnapshots(masterDigits: string): MasterPatternSnapshot[] {
  if (!masterDigits) return [];

  const out: MasterPatternSnapshot[] = [];
  for (let i = 0; i < masterDigits.length; i += 1) {
    const sub = masterDigits.slice(0, i + 1);
    const live = getLiveSegmentState(sub);
    if (!live) continue;

    const nextRaw = masterDigits[i + 1];
    const nextDigit =
      nextRaw !== undefined && nextRaw >= '0' && nextRaw <= '9' ? Number(nextRaw) : null;

    const patterns = extractCodeValuesFromBaseSequence(live.completedRunLengths, live.side);
    const patternCounts: Partial<Record<keyof SidePatterns, number>> = {};
    for (const field of PATTERN_FIELDS) {
      patternCounts[field] = patterns[field]?.length ?? 0;
    }

    out.push({
      side: live.side,
      sBefore: [...live.completedRunLengths],
      progress: live.currentRunProgress,
      patternCounts,
      dominantLabel: dominantPatternLabel(live.completedRunLengths, live.side),
      nextDigit,
    });
  }
  return out;
}

function isLowDigit(digit: number): boolean {
  return digit >= 0 && digit <= 4;
}

function preferredBandForStep(
  stepIndex: number,
  batchSize: number,
  tally: { low: number; high: number },
  bandMode: BatchBandMode = 'balanced',
): DigitClass | 'any' {
  if (bandMode === 'low') return 'low';
  if (bandMode === 'high') return 'high';

  const targetLow = Math.ceil(batchSize / 2);
  const targetHigh = Math.floor(batchSize / 2);
  const needLow = targetLow - tally.low;
  const needHigh = targetHigh - tally.high;
  if (needLow > needHigh) return 'low';
  if (needHigh > needLow) return 'high';
  return stepIndex % 2 === 0 ? 'low' : 'high';
}

function bandModeReasonSuffix(bandMode: BatchBandMode): string {
  if (bandMode === 'low') return '저점(0~4)만';
  if (bandMode === 'high') return '고점(5~9)만';
  return '저·고점 균형';
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

function digitMatchesBand(digit: number, band: DigitClass | 'any'): boolean {
  if (band === 'any') return true;
  return band === 'low' ? isLowDigit(digit) : digit >= 5 && digit <= 9;
}

/**
 * Master 전체 Code Value 패턴(3·5·9 이상, 1사이 등) + 저·고점 균형으로 digit 1개.
 * 무작위가 아니라 Master에서 유사 패턴 맥락의 next digit 가중 합의.
 */
export function pickDigitFromMasterPatterns(
  result: AnalysisResult,
  live: LiveSegmentState,
  prefix: string,
  stepIndex: number,
  batchSize: number,
  bandTally: { low: number; high: number },
  phaseLabelBoost?: Map<number, string>,
  rankOffset = 0,
  bandMode: BatchBandMode = 'balanced',
): SingleNextDigitPick | null {
  const snapshots = indexMasterPatternSnapshots(result.digits);
  const votes = new Map<number, { weight: number; label: string; hits: number }>();
  const lowVotes = new Map<number, { weight: number; label: string; hits: number }>();
  const highVotes = new Map<number, { weight: number; label: string; hits: number }>();
  const preferredBand = preferredBandForStep(stepIndex, batchSize, bandTally, bandMode);
  const reasonSuffix = bandModeReasonSuffix(bandMode);

  for (const snap of snapshots) {
    if (snap.nextDigit === null || snap.nextDigit < 0 || snap.nextDigit > 9) continue;
    const score = snapshotContextScore(live, snap);
    if (score < MIN_SNAPSHOT_SCORE) continue;

    const weight = score * score;
    const targetMaps = isLowDigit(snap.nextDigit) ? [votes, lowVotes] : [votes, highVotes];
    for (const map of targetMaps) {
      const row = map.get(snap.nextDigit) ?? {
        weight: 0,
        label: snap.dominantLabel,
        hits: 0,
      };
      row.weight += weight;
      row.hits += 1;
      if (row.hits === 1) row.label = snap.dominantLabel;
      map.set(snap.nextDigit, row);
    }
  }

  // 저·고점 밴드 후보 부족 시 — 유사 맥락 threshold 완화
  const bandPool = preferredBand === 'low' ? lowVotes : preferredBand === 'high' ? highVotes : votes;
  if (bandPool.size === 0) {
    for (const snap of snapshots) {
      if (snap.nextDigit === null || snap.nextDigit < 0 || snap.nextDigit > 9) continue;
      if (!digitMatchesBand(snap.nextDigit, preferredBand)) continue;
      const score = snapshotContextScore(live, snap);
      if (score < 0.18) continue;
      const row = bandPool.get(snap.nextDigit) ?? {
        weight: 0,
        label: snap.dominantLabel,
        hits: 0,
      };
      row.weight += score * 0.5;
      row.hits += 1;
      if (row.hits === 1) row.label = snap.dominantLabel;
      bandPool.set(snap.nextDigit, row);
    }
  }

  if (phaseLabelBoost) {
    for (const [digit, label] of phaseLabelBoost.entries()) {
      const row = votes.get(digit) ?? { weight: 0, label, hits: 0 };
      row.weight += 0.15;
      row.label = label;
      votes.set(digit, row);
    }
  }

  const ranked = [...bandPool.entries()].sort(
    (a, b) => b[1].weight - a[1].weight || b[1].hits - a[1].hits,
  );
  const rankedAny = [...votes.entries()].sort(
    (a, b) => b[1].weight - a[1].weight || b[1].hits - a[1].hits,
  );

  const tryPickFrom = (
    pool: [number, { weight: number; label: string; hits: number }][],
    band: DigitClass | 'any',
    skipRank = 0,
  ): SingleNextDigitPick | null => {
    let skipped = 0;
    for (const [digit, meta] of pool) {
      if (!digitMatchesBand(digit, band)) continue;
      if (wouldFormRepetitivePattern(prefix, digit)) continue;
      if (isDigitOverusedInRecent(prefix, digit)) continue;
      if (skipped < skipRank) {
        skipped += 1;
        continue;
      }
      return {
        digit,
        patternLabel: `전환 · ${meta.label}`,
        consensusCount: meta.hits,
        reason: `${meta.label} · Master 패턴 ${meta.hits}건 · ${reasonSuffix}`,
      };
    }
    return null;
  };

  const bandPick = tryPickFrom(ranked, preferredBand, rankOffset);
  if (bandPick) return bandPick;

  const anyPick = tryPickFrom(rankedAny, preferredBand, rankOffset);
  if (anyPick) return anyPick;

  for (const digit of balancedDigitOrder(prefix.length + stepIndex + rankOffset)) {
    if (!digitMatchesBand(digit, preferredBand)) continue;
    if (wouldFormRepetitivePattern(prefix, digit)) continue;
    if (isDigitOverusedInRecent(prefix, digit)) continue;
    return {
      digit,
      patternLabel: `전환 · ${dominantPatternLabel(live.completedRunLengths, live.side)}`,
      consensusCount: 0,
      reason: `0~9 균형 · Master 패턴 대안`,
    };
  }

  const relaxedPick = tryPickFrom(rankedAny, 'any', rankOffset);
  if (relaxedPick) return relaxedPick;

  for (const digit of ALL_S_DIGITS) {
    if (wouldFormRepetitivePattern(prefix, digit)) continue;
    return {
      digit,
      patternLabel: `전환 · S run`,
      consensusCount: 0,
      reason: `대안 digit · 반복 패턴 최소`,
    };
  }

  return null;
}

/** Master 저·고점 digit 분포 — 균형 참고용 */
export function masterDigitBandProfile(masterDigits: string): { low: number; high: number } {
  let low = 0;
  let high = 0;
  for (const ch of masterDigits) {
    if (ch < '0' || ch > '9') continue;
    const d = Number(ch);
    if (d <= 4) low += 1;
    else high += 1;
  }
  return { low, high };
}

/** @internal 테스트용 — Master class 시퀀스 길이 */
export function masterClassSequenceLength(masterDigits: string): number {
  return toClassSequence(masterDigits).length;
}
