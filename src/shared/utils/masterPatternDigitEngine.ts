import type { AnalysisResult, DigitClass, SidePatterns } from './analysisEngine';
import {
  extractCodeValuesFromBaseSequence,
  PATTERN_FIELD_LABELS,
  toClassSequence,
} from './analysisEngine';
import {
  ALL_S_DIGITS,
  classDigitOrder,
  dominantPatternLabel,
  wouldFormRepetitivePattern,
  type SingleNextDigitPick,
} from './codeValuePhaseEngine';
import { getLiveSegmentState, type LiveSegmentState } from './runSegmentEngine';

const PATTERN_FIELDS = Object.keys(PATTERN_FIELD_LABELS) as (keyof SidePatterns)[];
const MIN_SNAPSHOT_SCORE = 0.32;
const S_PREFIX_SUFFIX_LEN = 10;

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

function digitMatchesClass(digit: number, cls: DigitClass): boolean {
  return cls === 'low' ? isLowDigit(digit) : digit >= 5 && digit <= 9;
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

/**
 * Master Code Value 패턴(3·5·9 이상, 1사이 등) — targetClass 범위 내 digit 1개.
 * 패턴 흐름(run side)에 맞는 저·고점에서만 Master 유사 맥락 next digit 가중 합의.
 */
export function pickDigitFromMasterPatterns(
  result: AnalysisResult,
  live: LiveSegmentState,
  prefix: string,
  targetClass: DigitClass,
  phaseLabelBoost?: Map<number, string>,
  rankOffset = 0,
  usedInBatch?: Set<number>,
): SingleNextDigitPick | null {
  const snapshots = indexMasterPatternSnapshots(result.digits);
  const votes = new Map<number, { weight: number; label: string; hits: number }>();

  for (const snap of snapshots) {
    if (snap.nextDigit === null || snap.nextDigit < 0 || snap.nextDigit > 9) continue;
    if (!digitMatchesClass(snap.nextDigit, targetClass)) continue;
    const score = snapshotContextScore(live, snap);
    if (score < MIN_SNAPSHOT_SCORE) continue;

    const weight = score * score;
    const row = votes.get(snap.nextDigit) ?? {
      weight: 0,
      label: snap.dominantLabel,
      hits: 0,
    };
    row.weight += weight;
    row.hits += 1;
    if (row.hits === 1) row.label = snap.dominantLabel;
    votes.set(snap.nextDigit, row);
  }

  if (votes.size === 0) {
    for (const snap of snapshots) {
      if (snap.nextDigit === null || snap.nextDigit < 0 || snap.nextDigit > 9) continue;
      if (!digitMatchesClass(snap.nextDigit, targetClass)) continue;
      const score = snapshotContextScore(live, snap);
      if (score < 0.18) continue;
      const row = votes.get(snap.nextDigit) ?? {
        weight: 0,
        label: snap.dominantLabel,
        hits: 0,
      };
      row.weight += score * 0.5;
      row.hits += 1;
      if (row.hits === 1) row.label = snap.dominantLabel;
      votes.set(snap.nextDigit, row);
    }
  }

  if (phaseLabelBoost) {
    for (const [digit, label] of phaseLabelBoost.entries()) {
      if (!digitMatchesClass(digit, targetClass)) continue;
      const row = votes.get(digit) ?? { weight: 0, label, hits: 0 };
      row.weight += 0.2;
      row.label = label;
      votes.set(digit, row);
    }
  }

  const ranked = [...votes.entries()].sort(
    (a, b) => b[1].weight - a[1].weight || b[1].hits - a[1].hits,
  );

  const classLabel = targetClass === 'low' ? '저점' : '고점';
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
      patternLabel: `${classLabel} · ${meta.label}`,
      consensusCount: meta.hits,
      reason: `${meta.label} · Master 패턴 ${meta.hits}건 · ${classLabel} run`,
    };
  }

  for (const digit of classDigitOrder(targetClass, prefix.length + rankOffset)) {
    if (usedInBatch?.has(digit)) continue;
    if (wouldFormRepetitivePattern(prefix, digit)) continue;
    if (isDigitOverusedInRecent(prefix, digit)) continue;
    return {
      digit,
      patternLabel: `${classLabel} · ${dominantPatternLabel(live.completedRunLengths, live.side)}`,
      consensusCount: 0,
      reason: `${classLabel} run · Master 패턴 대안`,
    };
  }

  for (const digit of ALL_S_DIGITS) {
    if (!digitMatchesClass(digit, targetClass)) continue;
    if (usedInBatch?.has(digit)) continue;
    if (wouldFormRepetitivePattern(prefix, digit)) continue;
    return {
      digit,
      patternLabel: `${classLabel} · S run`,
      consensusCount: 0,
      reason: `${classLabel} · 반복 패턴 최소 대안`,
    };
  }

  return null;
}

/** Master 저·고점 digit 분포 — 참고용 */
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
