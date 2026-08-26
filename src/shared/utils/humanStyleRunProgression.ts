/**
 * Human-style V2 — Run Progression / Termination Zone layer.
 * STEP1/STEP2 structural evidence only. NOT Production V1.
 */

import type { CodeValueSubPatterns } from './codeValueSubAnalysis';
import type { DigitSubBand } from './digitSubBand';
import {
  analyzeRecursivePatternFlow,
  computePatternNaturalness,
  flattenPatternLayers,
  getPatternLayerLeaf,
  selectInformativeDrillDown,
  trailingValueRun,
  type PatternField,
  type PatternLayerTrace,
  type PatternNaturalness,
} from './humanStylePatternCore';

export type RunProgressionPhase =
  | 'early'
  | 'progressing'
  | 'approaching_termination'
  | 'at_termination_zone'
  | 'beyond_typical_shape'
  | 'insufficient_evidence';

export type RunStructuralPreference = 'continue' | 'terminate' | 'neutral';

export interface RunProgressionEvidence {
  activeRun: number;
  historicalRuns: number[];
  selectedPattern: PatternField | null;
  typicalCenter: number | null;
  typicalUpperBoundary: number | null;
  phase: RunProgressionPhase;
  continuationShape: PatternNaturalness | null;
  terminationShape: PatternNaturalness | null;
  structuralPreference: RunStructuralPreference;
  confidence: number;
  reason: string;
}

export interface RunProgressionContext {
  sequence: readonly number[];
  sequenceLabel: string;
  side: 'low' | 'high';
  sub: DigitSubBand;
  liveRunLength: number;
  altPatternsAtRoot?: CodeValueSubPatterns;
  recursivePath?: PatternLayerTrace;
}

const MIN_HISTORICAL_RUNS = 2;
const SHAPE_WEAK_MARGIN = 0.05;
const SHAPE_STRONG_MARGIN = 0.12;

function extendTrailingRun(sequence: readonly number[], runLength: number): number[] {
  const seq = [...sequence];
  if (seq.length === 0) return [runLength + 1];
  seq[seq.length - 1] = runLength + 1;
  return seq;
}

function appendNewRun(sequence: readonly number[]): number[] {
  return [...sequence, 1];
}

export function collectHistoricalRunsForTrailingMarker(sequence: readonly number[]): {
  activeRun: number;
  historicalRuns: number[];
  marker: number | null;
} {
  if (sequence.length === 0) {
    return { activeRun: 0, historicalRuns: [], marker: null };
  }
  const marker = sequence.at(-1)!;
  const historicalRuns: number[] = [];
  let i = 0;
  while (i < sequence.length) {
    const v = sequence[i]!;
    let len = 1;
    while (i + len < sequence.length && sequence[i + len] === v) len += 1;
    if (v === marker && i + len < sequence.length) {
      historicalRuns.push(len);
    }
    i += len;
  }
  return {
    activeRun: trailingValueRun(sequence),
    historicalRuns,
    marker,
  };
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

function quartile(values: number[], q: 0.25 | 0.75): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base]! + rest * (sorted[base + 1]! - sorted[base]!);
  }
  return sorted[base]!;
}

function robustUpperBoundary(values: number[], center: number): number {
  const q3 = quartile(values, 0.75) ?? center;
  const q1 = quartile(values, 0.25) ?? center;
  const iqr = Math.max(q3 - q1, 0);
  const iqrCap = center + iqr * 0.5;
  const maxObs = Math.max(...values);
  return Math.min(maxObs, Math.max(q3, iqrCap));
}

export function determineRunProgressionPhase(
  activeRun: number,
  typicalCenter: number | null,
  typicalUpperBoundary: number | null,
): RunProgressionPhase {
  if (typicalCenter === null || typicalUpperBoundary === null) {
    return 'insufficient_evidence';
  }
  if (activeRun <= 1) return 'early';
  if (activeRun < typicalCenter - 1) return 'progressing';
  if (activeRun < typicalUpperBoundary) return 'approaching_termination';
  if (activeRun <= typicalUpperBoundary + 1) return 'at_termination_zone';
  return 'beyond_typical_shape';
}

function selectedPatternFromPath(path: PatternLayerTrace | undefined): PatternField | null {
  if (!path) return null;
  const layers = flattenPatternLayers(path);
  for (let i = layers.length - 1; i >= 0; i -= 1) {
    const drill = layers[i]!.selectedDrillDown;
    if (drill) return drill;
  }
  const leaf = getPatternLayerLeaf(path);
  const { field } = selectInformativeDrillDown(
    leaf.patternSummary as import('./codeValueSubAnalysis').CodeValueSubPatterns,
    leaf.sequence,
  );
  return field;
}

function analyzeFutureShape(
  sequence: number[],
  ctx: RunProgressionContext,
  liveRunLength: number,
): PatternNaturalness {
  const path = analyzeRecursivePatternFlow({
    sequence,
    sequenceLabel: `${ctx.sequenceLabel} (future shape)`,
    side: ctx.side,
    currentSub: ctx.sub,
    liveRunLength,
    altPatternsAtRoot: ctx.altPatternsAtRoot,
  });
  return computePatternNaturalness(path, liveRunLength);
}

function inferStructuralPreference(
  phase: RunProgressionPhase,
  continuationShape: PatternNaturalness,
  terminationShape: PatternNaturalness,
): RunStructuralPreference {
  const delta = continuationShape.total - terminationShape.total;
  if (Math.abs(delta) < SHAPE_WEAK_MARGIN) return 'neutral';

  const shapePref: RunStructuralPreference = delta > 0 ? 'continue' : 'terminate';

  if (shapePref === 'continue') {
    if (phase === 'beyond_typical_shape' || phase === 'at_termination_zone') {
      return delta > SHAPE_STRONG_MARGIN * 2 ? 'continue' : 'neutral';
    }
    if (phase === 'insufficient_evidence') {
      return delta > SHAPE_STRONG_MARGIN ? 'continue' : 'neutral';
    }
    return delta > SHAPE_WEAK_MARGIN ? 'continue' : 'neutral';
  }

  if (phase === 'early' || phase === 'progressing' || phase === 'insufficient_evidence') {
    return -delta > SHAPE_STRONG_MARGIN ? 'terminate' : 'neutral';
  }
  return -delta > SHAPE_WEAK_MARGIN ? 'terminate' : 'neutral';
}

function computeConfidence(
  phase: RunProgressionPhase,
  historicalRuns: number[],
  continuationShape: PatternNaturalness,
  terminationShape: PatternNaturalness,
  structuralPreference: RunStructuralPreference,
): number {
  if (phase === 'insufficient_evidence' || historicalRuns.length < MIN_HISTORICAL_RUNS) {
    return 0;
  }
  const shapeGap = Math.abs(continuationShape.total - terminationShape.total);
  let c = Math.min(historicalRuns.length / 4, 0.5) + Math.min(shapeGap, 0.35);
  if (structuralPreference !== 'neutral') c += 0.15;
  if (
    phase === 'approaching_termination' ||
    phase === 'at_termination_zone' ||
    phase === 'beyond_typical_shape'
  ) {
    c += 0.1;
  }
  return Math.min(c, 1);
}

function buildReason(
  phase: RunProgressionPhase,
  activeRun: number,
  typicalCenter: number | null,
  typicalUpperBoundary: number | null,
  structuralPreference: RunStructuralPreference,
  continuationShape: PatternNaturalness,
  terminationShape: PatternNaturalness,
): string {
  const parts = [
    `activeRun=${activeRun}`,
    typicalCenter !== null ? `center≈${typicalCenter.toFixed(1)}` : 'center=—',
    typicalUpperBoundary !== null ? `upper≈${typicalUpperBoundary.toFixed(1)}` : 'upper=—',
    `phase=${phase}`,
    `cont=${continuationShape.total.toFixed(2)} term=${terminationShape.total.toFixed(2)}`,
    `pref=${structuralPreference}`,
  ];
  return parts.join(' · ');
}

/**
 * Analyze run progression from sequence run-shape (not MasterDigit frequency).
 */
export function analyzeRunProgression(ctx: RunProgressionContext): RunProgressionEvidence {
  const { activeRun, historicalRuns } = collectHistoricalRunsForTrailingMarker(ctx.sequence);
  const selectedPattern = selectedPatternFromPath(ctx.recursivePath);

  if (historicalRuns.length < MIN_HISTORICAL_RUNS) {
    const contSeq = extendTrailingRun(ctx.sequence, ctx.liveRunLength);
    const termSeq = appendNewRun(ctx.sequence);
    const continuationShape = analyzeFutureShape(contSeq, ctx, ctx.liveRunLength + 1);
    const terminationShape = analyzeFutureShape(termSeq, ctx, 1);
    return {
      activeRun,
      historicalRuns,
      selectedPattern,
      typicalCenter: null,
      typicalUpperBoundary: null,
      phase: 'insufficient_evidence',
      continuationShape,
      terminationShape,
      structuralPreference: 'neutral',
      confidence: 0,
      reason: `insufficient historical runs (${historicalRuns.length} < ${MIN_HISTORICAL_RUNS})`,
    };
  }

  const typicalCenter = median(historicalRuns);
  const typicalUpperBoundary =
    typicalCenter !== null ? robustUpperBoundary(historicalRuns, typicalCenter) : null;
  const phase = determineRunProgressionPhase(activeRun, typicalCenter, typicalUpperBoundary);

  const contSeq = extendTrailingRun(ctx.sequence, ctx.liveRunLength);
  const termSeq = appendNewRun(ctx.sequence);
  const continuationShape = analyzeFutureShape(contSeq, ctx, ctx.liveRunLength + 1);
  const terminationShape = analyzeFutureShape(termSeq, ctx, 1);
  const structuralPreference = inferStructuralPreference(phase, continuationShape, terminationShape);
  const confidence = computeConfidence(
    phase,
    historicalRuns,
    continuationShape,
    terminationShape,
    structuralPreference,
  );
  const reason = buildReason(
    phase,
    activeRun,
    typicalCenter,
    typicalUpperBoundary,
    structuralPreference,
    continuationShape,
    terminationShape,
  );

  return {
    activeRun,
    historicalRuns,
    selectedPattern,
    typicalCenter,
    typicalUpperBoundary,
    phase,
    continuationShape,
    terminationShape,
    structuralPreference,
    confidence,
    reason,
  };
}

/** Min confidence to use run progression in structural decision. */
export const RUN_PROGRESSION_CONFIDENCE_THRESHOLD = 0.55;
