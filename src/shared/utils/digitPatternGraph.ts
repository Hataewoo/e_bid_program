export type DigitBand = 'low' | 'high';
export type PivotBandChar = 'L' | 'H' | 'M';

export interface PatternTransitionResult {
  counts: Map<number, number>;
  totalMatches: number;
  exactMatches: number;
  bandPatternMatches: number;
  positionMatches: number;
  runBoundaryMatches: number;
}

const PATTERN_WEIGHTS = {
  exact: 1,
  bandPattern: 0.72,
  position: 0.48,
  runBoundary: 0.62,
} as const;

const DECIMAL_CYCLE = 4;

export function getDigitBand(digit: number): DigitBand | null {
  if (!Number.isInteger(digit) || digit < 0 || digit > 9) return null;
  if (digit < 5) return 'low';
  if (digit > 5) return 'high';
  return null;
}

export function isDigitInBand(digit: number, band: DigitBand): boolean {
  return band === 'low' ? digit < 5 : digit > 5;
}

function countNextDigitsAfterPrefix(
  masterDigits: string,
  prefix: string,
): { counts: Map<number, number>; totalMatches: number } {
  const counts = new Map<number, number>();
  if (!masterDigits || prefix.length === 0) {
    return { counts, totalMatches: 0 };
  }

  let totalMatches = 0;
  const limit = masterDigits.length - prefix.length;
  for (let i = 0; i < limit; i += 1) {
    let matched = true;
    for (let j = 0; j < prefix.length; j += 1) {
      if (masterDigits[i + j] !== prefix[j]) {
        matched = false;
        break;
      }
    }
    if (!matched) continue;

    const nextChar = masterDigits[i + prefix.length];
    if (nextChar === undefined) continue;

    const digit = Number(nextChar);
    if (!Number.isInteger(digit) || digit < 0 || digit > 9) continue;

    totalMatches += 1;
    counts.set(digit, (counts.get(digit) ?? 0) + 1);
  }

  return { counts, totalMatches };
}

export function toPivotBandChar(digit: number): PivotBandChar | null {
  if (!Number.isInteger(digit) || digit < 0 || digit > 9) return null;
  if (digit < 5) return 'L';
  if (digit > 5) return 'H';
  return 'M';
}

export function toPivotBandSequence(digits: string): string {
  let out = '';
  for (const ch of digits) {
    const d = Number(ch);
    const band = toPivotBandChar(d);
    if (band) out += band;
  }
  return out;
}

function buildPivotRuns(
  masterDigits: string,
): { cls: DigitBand; length: number; endIndex: number }[] {
  const runs: { cls: DigitBand; length: number; endIndex: number }[] = [];
  let i = 0;
  while (i < masterDigits.length) {
    const band = getDigitBand(Number(masterDigits[i]));
    if (band === null) {
      i += 1;
      continue;
    }
    const start = i;
    while (i < masterDigits.length && getDigitBand(Number(masterDigits[i])) === band) {
      i += 1;
    }
    runs.push({ cls: band, length: i - start, endIndex: i - 1 });
  }
  return runs;
}

function getTrailingRunInfo(prefix: string): { band: DigitBand | null; length: number } {
  if (!prefix) return { band: null, length: 0 };
  const lastBand = getDigitBand(Number(prefix[prefix.length - 1]));
  if (lastBand === null) return { band: null, length: 0 };

  let length = 0;
  for (let i = prefix.length - 1; i >= 0; i -= 1) {
    if (getDigitBand(Number(prefix[i] ?? '')) !== lastBand) break;
    length += 1;
  }
  return { band: lastBand, length };
}

function addWeightedCount(
  counts: Map<number, number>,
  digit: number,
  weight: number,
  targetBand: DigitBand | null,
): boolean {
  if (!Number.isInteger(digit) || digit < 0 || digit > 9) return false;
  if (targetBand && !isDigitInBand(digit, targetBand)) return false;
  counts.set(digit, (counts.get(digit) ?? 0) + weight);
  return true;
}

function countBandPatternTransitions(
  masterDigits: string,
  prefix: string,
  targetBand: DigitBand | null,
): { counts: Map<number, number>; totalMatches: number; bandPatternMatches: number } {
  const counts = new Map<number, number>();
  let totalMatches = 0;
  let bandPatternMatches = 0;

  if (!prefix) return { counts, totalMatches, bandPatternMatches };

  const bandSeq = toPivotBandSequence(prefix);
  if (!bandSeq) return { counts, totalMatches, bandPatternMatches };

  const limit = masterDigits.length - prefix.length;
  for (let i = 0; i < limit; i += 1) {
    const slice = masterDigits.slice(i, i + prefix.length);
    if (toPivotBandSequence(slice) !== bandSeq) continue;

    bandPatternMatches += 1;
    let weight: number = PATTERN_WEIGHTS.bandPattern;
    if (slice === prefix) weight = PATTERN_WEIGHTS.exact;
    else if (slice.slice(-1) === prefix.slice(-1)) weight = PATTERN_WEIGHTS.bandPattern + 0.08;

    const next = Number(masterDigits[i + prefix.length]);
    if (addWeightedCount(counts, next, weight, targetBand)) {
      totalMatches += weight;
    }
  }

  return { counts, totalMatches, bandPatternMatches };
}

function countPositionTransitions(
  masterDigits: string,
  prefix: string,
  decimalPosition: number,
  targetBand: DigitBand | null,
): { counts: Map<number, number>; totalMatches: number; positionMatches: number } {
  const counts = new Map<number, number>();
  let totalMatches = 0;
  let positionMatches = 0;

  const slot = (Math.max(1, decimalPosition) - 1) % DECIMAL_CYCLE;
  const lastDigit = prefix ? prefix[prefix.length - 1] : null;

  for (let i = 0; i < masterDigits.length - 1; i += 1) {
    if (i % DECIMAL_CYCLE !== slot) continue;
    if (lastDigit !== null && masterDigits[i] !== lastDigit) continue;

    positionMatches += 1;
    const next = Number(masterDigits[i + 1]);
    if (addWeightedCount(counts, next, PATTERN_WEIGHTS.position, targetBand)) {
      totalMatches += PATTERN_WEIGHTS.position;
    }
  }

  return { counts, totalMatches, positionMatches };
}

function countRunBoundaryTransitions(
  masterDigits: string,
  prefix: string,
  targetBand: DigitBand | null,
): { counts: Map<number, number>; totalMatches: number; runBoundaryMatches: number } {
  const counts = new Map<number, number>();
  let totalMatches = 0;
  let runBoundaryMatches = 0;

  const trailing = getTrailingRunInfo(prefix);
  if (!trailing.band || trailing.length <= 0) {
    return { counts, totalMatches, runBoundaryMatches };
  }

  const runs = buildPivotRuns(masterDigits);

  for (const run of runs) {
    if (run.cls !== trailing.band || run.length !== trailing.length) continue;

    const boundaryIndex = run.endIndex;
    const nextChar = masterDigits[boundaryIndex + 1];
    if (nextChar === undefined) continue;

    runBoundaryMatches += 1;
    const next = Number(nextChar);
    if (addWeightedCount(counts, next, PATTERN_WEIGHTS.runBoundary, targetBand)) {
      totalMatches += PATTERN_WEIGHTS.runBoundary;
    }
  }

  return { counts, totalMatches, runBoundaryMatches };
}

function mergeWeightedCounts(into: Map<number, number>, from: Map<number, number>): void {
  for (const [digit, weight] of from) {
    into.set(digit, (into.get(digit) ?? 0) + weight);
  }
}

/** Master 기록에서 prefix·자리·run 패턴 그래프를 합산 */
export function aggregatePatternTransitions(
  masterDigits: string,
  prefix: string,
  decimalPosition: number,
  targetBand: DigitBand | null,
): PatternTransitionResult {
  const counts = new Map<number, number>();
  let totalMatches = 0;

  const exact = countNextDigitsAfterPrefix(masterDigits, prefix);
  let exactMatches = exact.totalMatches;
  if (prefix) {
    for (const [digit, c] of exact.counts) {
      if (targetBand && !isDigitInBand(digit, targetBand)) continue;
      const weighted = c * PATTERN_WEIGHTS.exact;
      counts.set(digit, (counts.get(digit) ?? 0) + weighted);
      totalMatches += weighted;
    }
  }

  const band = countBandPatternTransitions(masterDigits, prefix, targetBand);
  mergeWeightedCounts(counts, band.counts);
  totalMatches += band.totalMatches;

  const position = countPositionTransitions(masterDigits, prefix, decimalPosition, targetBand);
  mergeWeightedCounts(counts, position.counts);
  totalMatches += position.totalMatches;

  const runBoundary = countRunBoundaryTransitions(masterDigits, prefix, targetBand);
  mergeWeightedCounts(counts, runBoundary.counts);
  totalMatches += runBoundary.totalMatches;

  if (prefix && exactMatches === 0) {
    exactMatches = band.bandPatternMatches;
  }

  return {
    counts,
    totalMatches,
    exactMatches,
    bandPatternMatches: band.bandPatternMatches,
    positionMatches: position.positionMatches,
    runBoundaryMatches: runBoundary.runBoundaryMatches,
  };
}

export function hasPatternGraphSignal(result: PatternTransitionResult): boolean {
  return (
    result.bandPatternMatches > 0 ||
    result.positionMatches > 0 ||
    result.runBoundaryMatches > 0 ||
    result.exactMatches > 0
  );
}
