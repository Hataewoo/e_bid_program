/**
 * Human-style V2 tie-resolution — deeper recursive + structural decision hierarchy.
 * STEP1/STEP2 only. NOT Production V1.
 */

import {
  analyzeRecursivePatternFlow,
  classifyOneDuplicateRunRelation,
  computePatternNaturalness,
  extractDrillDownSequence,
  findFirstDiscriminatingPattern,
  flattenPatternLayers,
  getPatternLayerLeaf,
  inferParentBranchImplication,
  MAX_RECURSION_DEPTH,
  trailingValueRun,
  type ChildPatternBehavior,
  type ParentBranchImplication,
  type PatternField,
  type PatternLayerTrace,
  type PatternNaturalness,
} from './humanStylePatternCore';
import type { CodeValueSubPatterns } from './codeValueSubAnalysis';
import type { DigitSubBand } from './digitSubBand';
import type { StateTransitionKind } from './humanStyleStateSimulation';
import {
  analyzeRunProgression,
  RUN_PROGRESSION_CONFIDENCE_THRESHOLD,
  type RunProgressionEvidence,
} from './humanStyleRunProgression';

/** Conservative fixed threshold — no grid search. */
export const TIE_MARGIN_THRESHOLD = 0.08;

/** Min gap in blended deeper score to win without structural signal. */
const DEEPER_SCORE_MARGIN = 0.02;

export interface FutureShapeDelta {
  patternCompleted: boolean;
  forcedExtension: boolean;
  markerBroken: boolean;
  validNewRun: boolean;
  structuralConflict: boolean;
  deltaScore: number;
  label: string;
}

export interface DeeperDiscriminationTrace {
  field: PatternField | null;
  deeperPath: PatternLayerTrace;
  deeperNaturalness: PatternNaturalness;
  childBehavior: ChildPatternBehavior;
  parentImplication: ParentBranchImplication;
}

export interface StructuralDecisionTrace {
  candidateId: string;
  primaryChildBehavior: ChildPatternBehavior;
  primaryParentImplication: ParentBranchImplication;
  deeperChildBehavior: ChildPatternBehavior;
  deeperParentImplication: ParentBranchImplication;
  candidateMatchesCurrent: boolean;
  stateKind?: StateTransitionKind;
}

export interface CandidateTieEvidence {
  candidateId: string;
  primaryTotal: number;
  futureShapeDelta: FutureShapeDelta;
  deeper: DeeperDiscriminationTrace | null;
  discriminationScore: number;
  structural: StructuralDecisionTrace;
}

export type TieResolutionMethod =
  | 'naturalness_total'
  | 'deeper_discrimination'
  | 'structural_decision'
  | 'run_progression_structural'
  | 'uncertain_fallback';

export interface RunProgressionTrace {
  selectedPattern: PatternField | null;
  activeRun: number;
  historicalRunsTail: number[];
  typicalCenter: number | null;
  typicalUpperBoundary: number | null;
  phase: RunProgressionEvidence['phase'];
  continuationShapeTotal: number | null;
  terminationShapeTotal: number | null;
  structuralPreference: RunProgressionEvidence['structuralPreference'];
  confidence: number;
  reason: string;
}

export interface TieResolutionResult {
  winnerId: string;
  winnerLabel: string;
  margin: number;
  resolutionMethod: TieResolutionMethod;
  uncertain: boolean;
  deeperDrillUsed: boolean;
  structuralDecisionUsed: boolean;
  structuralReason: string | null;
  firstDiscriminatingPattern: PatternField | null;
  evidence: CandidateTieEvidence[];
  structuralTraces: StructuralDecisionTrace[];
  runProgression: RunProgressionTrace | null;
}

export interface StateCandidateForTieResolution {
  id: string;
  label: string;
  recursivePath: PatternLayerTrace;
  naturalness: PatternNaturalness;
  childBehavior: ChildPatternBehavior;
  parentImplication: ParentBranchImplication;
  candidateMatchesCurrent: boolean;
  stateKind?: StateTransitionKind;
  simulatedSequence?: readonly number[];
  baseline?: BaselineStateContext;
  level: 'mainBand' | 'subBand';
}

export interface BaselineStateContext {
  sequence: readonly number[];
  side: 'low' | 'high';
  sub: DigitSubBand;
  liveRunLength: number;
  altPatternsAtRoot?: CodeValueSubPatterns;
}

function analyzeBaselinePath(ctx: BaselineStateContext): {
  path: PatternLayerTrace;
  naturalness: PatternNaturalness;
} {
  const path = analyzeRecursivePatternFlow({
    sequence: [...ctx.sequence],
    sequenceLabel: 'baseline (pre-candidate)',
    side: ctx.side,
    currentSub: ctx.sub,
    liveRunLength: ctx.liveRunLength,
    altPatternsAtRoot: ctx.altPatternsAtRoot,
  });
  const naturalness = computePatternNaturalness(path, ctx.liveRunLength);
  return { path, naturalness };
}

export function computeFutureShapeDelta(
  baselineNat: PatternNaturalness,
  afterNat: PatternNaturalness,
  baselinePath: PatternLayerTrace,
  afterPath: PatternLayerTrace,
  stateKind?: StateTransitionKind,
): FutureShapeDelta {
  const baseLeaf = getPatternLayerLeaf(baselinePath);
  const afterLeaf = getPatternLayerLeaf(afterPath);
  const baseRel = baseLeaf.tailFlow?.oneDuplicateRelation?.relation ?? 'none';
  const afterRel = afterLeaf.tailFlow?.oneDuplicateRelation?.relation ?? 'none';
  const afterPhase = afterLeaf.tailFlow?.phase ?? 'transition';

  const dCont = afterNat.continuationFit - baselineNat.continuationFit;
  const dTerm = afterNat.terminationFit - baselineNat.terminationFit;
  const dMarker = afterNat.markerProgressFit - baselineNat.markerProgressFit;
  const dContra = afterNat.contradictionPenalty - baselineNat.contradictionPenalty;
  const dStruct = afterNat.structuralChangePenalty - baselineNat.structuralChangePenalty;

  const patternCompleted =
    dTerm > 0.05 &&
    (afterRel === 'at_termination_boundary' ||
      afterRel === 'at_hint_ceiling' ||
      afterPhase === 'transition');

  const forcedExtension =
    dCont > 0.05 &&
    (afterRel === 'beyond_hint' || dStruct > 0.05) &&
    stateKind === 'continuation';

  const markerBroken = dContra > 0.1 || (dMarker < -0.1 && afterNat.markerProgressFit < 0.4);

  const validNewRun =
    stateKind === 'switch' &&
    afterRel === 'below_termination_zone' &&
    dStruct <= 0.05;

  const structuralConflict = dStruct > 0.08 || dContra > 0.15;

  const parts: string[] = [];
  if (patternCompleted) parts.push('patternCompleted');
  if (forcedExtension) parts.push('forcedExtension');
  if (markerBroken) parts.push('markerBroken');
  if (validNewRun) parts.push('validNewRun');
  if (structuralConflict) parts.push('structuralConflict');
  if (baseRel !== afterRel) parts.push(`rel:${baseRel}→${afterRel}`);

  const deltaScore =
    dTerm * 1.0 +
    dCont * 1.2 +
    dMarker * 0.9 -
    dContra -
    dStruct +
    (patternCompleted ? 0.15 : 0) +
    (validNewRun ? 0.12 : 0) -
    (forcedExtension ? 0.18 : 0) -
    (structuralConflict ? 0.2 : 0) -
    (markerBroken ? 0.15 : 0);

  return {
    patternCompleted,
    forcedExtension,
    markerBroken,
    validNewRun,
    structuralConflict,
    deltaScore,
    label: parts.length ? parts.join('|') : 'neutral',
  };
}

function subSequenceAtField(path: PatternLayerTrace, field: PatternField): number[] {
  const layers = flattenPatternLayers(path);
  for (const layer of layers) {
    if (layer.selectedDrillDown === field && layer.child) {
      return [...layer.child.sequence];
    }
    const vals = layer.patternSummary[field];
    if (vals && vals.length > 0) return [...vals];
  }
  const leaf = getPatternLayerLeaf(path);
  const extracted = extractDrillDownSequence(leaf.sequence, field);
  if (extracted.length > 0) return extracted;
  return [...leaf.sequence];
}

export function buildDeeperDiscriminationPath(
  rootPath: PatternLayerTrace,
  field: PatternField,
  ctx: {
    side: 'low' | 'high';
    sub: DigitSubBand;
    liveRunLength: number;
    altPatternsAtRoot?: CodeValueSubPatterns;
    candidateMatchesCurrent: boolean;
    level: 'mainBand' | 'subBand';
  },
): DeeperDiscriminationTrace {
  const subSeq = subSequenceAtField(rootPath, field);
  const liveRun = trailingValueRun(subSeq) || ctx.liveRunLength;
  const deeperPath = analyzeRecursivePatternFlow({
    sequence: subSeq,
    sequenceLabel: `deeper@${field}`,
    side: ctx.side,
    currentSub: ctx.sub,
    liveRunLength: liveRun,
    altPatternsAtRoot: ctx.altPatternsAtRoot,
    maxDepth: MAX_RECURSION_DEPTH,
  });
  const leaf = getPatternLayerLeaf(deeperPath);
  const dup =
    leaf.tailFlow?.oneDuplicateRelation ??
    classifyOneDuplicateRunRelation(leaf.sequence, liveRun);
  const childBehavior: ChildPatternBehavior = dup?.childBehavior ?? 'uncertain';
  const deeperNaturalness = computePatternNaturalness(deeperPath, liveRun);
  const parentImplication = inferParentBranchImplication(childBehavior, ctx.level, {
    candidateMatchesCurrent: ctx.candidateMatchesCurrent,
    naturalness: deeperNaturalness,
  });
  return { field, deeperPath, deeperNaturalness, childBehavior, parentImplication };
}

function buildStructuralTrace(evidence: CandidateTieEvidence): StructuralDecisionTrace {
  return evidence.structural;
}

/**
 * Decision hierarchy (no numeric bonus): deeper parentImplication namespace
 * is separate from child continuation/termination namespace.
 */
export function tryStructuralDecision(
  traces: StructuralDecisionTrace[],
): { winnerId: string; reason: string } | null {
  if (traces.length < 2) return null;

  const byImpl = (impl: ParentBranchImplication) =>
    traces.filter((t) => t.deeperParentImplication === impl);

  const keepTraces = byImpl('keep');
  const switchTraces = byImpl('switch');
  const neutralTraces = byImpl('neutral');

  const uniqueImpls = new Set(traces.map((t) => t.deeperParentImplication));
  if (uniqueImpls.size <= 1) return null;

  // Exactly one deeper `keep` — inner pattern supports this branch hypothesis (human: terminate → parent keep)
  if (keepTraces.length === 1 && switchTraces.length === 0) {
    return {
      winnerId: keepTraces[0]!.candidateId,
      reason: 'unique_deeper_keep',
    };
  }

  // keep vs switch: keep wins (child/parent namespaces separated; terminate≠auto-switch)
  if (keepTraces.length >= 1 && switchTraces.length >= 1 && traces.length === 2) {
    return {
      winnerId: keepTraces[0]!.candidateId,
      reason: 'keep_over_switch',
    };
  }

  // Unique switch with all others neutral
  if (
    switchTraces.length === 1 &&
    neutralTraces.length === traces.length - 1 &&
    keepTraces.length === 0
  ) {
    return {
      winnerId: switchTraces[0]!.candidateId,
      reason: 'unique_deeper_switch',
    };
  }

  return null;
}

function buildRunProgressionTrace(rp: RunProgressionEvidence): RunProgressionTrace {
  const tail = rp.historicalRuns.slice(-5);
  return {
    selectedPattern: rp.selectedPattern,
    activeRun: rp.activeRun,
    historicalRunsTail: tail,
    typicalCenter: rp.typicalCenter,
    typicalUpperBoundary: rp.typicalUpperBoundary,
    phase: rp.phase,
    continuationShapeTotal: rp.continuationShape?.total ?? null,
    terminationShapeTotal: rp.terminationShape?.total ?? null,
    structuralPreference: rp.structuralPreference,
    confidence: rp.confidence,
    reason: rp.reason,
  };
}

function computeBaselineRunProgression(
  fallbackBaseline: BaselineStateContext,
): RunProgressionEvidence {
  const { path } = analyzeBaselinePath(fallbackBaseline);
  return analyzeRunProgression({
    sequence: fallbackBaseline.sequence,
    sequenceLabel: 'baseline run progression',
    side: fallbackBaseline.side,
    sub: fallbackBaseline.sub,
    liveRunLength: fallbackBaseline.liveRunLength,
    altPatternsAtRoot: fallbackBaseline.altPatternsAtRoot,
    recursivePath: path,
  });
}

/**
 * Run progression structural signal — only when shape comparison and recursive evidence agree.
 * Phase alone never forces SWITCH.
 */
export function tryRunProgressionStructuralDecision(
  candidates: StateCandidateForTieResolution[],
  runProgression: RunProgressionEvidence,
  traces: StructuralDecisionTrace[],
): { winnerId: string; reason: string } | null {
  if (
    runProgression.structuralPreference === 'neutral' ||
    runProgression.confidence < RUN_PROGRESSION_CONFIDENCE_THRESHOLD ||
    runProgression.phase === 'insufficient_evidence'
  ) {
    return null;
  }

  const continuationCand = candidates.find(
    (c) => c.candidateMatchesCurrent && c.stateKind === 'continuation',
  );
  const switchCand = candidates.find(
    (c) => !c.candidateMatchesCurrent && c.stateKind === 'switch',
  );

  const preferredId =
    runProgression.structuralPreference === 'continue'
      ? continuationCand?.id
      : switchCand?.id;
  if (!preferredId) return null;

  const prefTrace = traces.find((t) => t.candidateId === preferredId);
  if (!prefTrace) return null;

  const contTotal = runProgression.continuationShape?.total ?? 0;
  const termTotal = runProgression.terminationShape?.total ?? 0;

  if (runProgression.structuralPreference === 'continue') {
    if (prefTrace.deeperParentImplication === 'switch') return null;
    if (contTotal <= termTotal) return null;
  } else {
    if (prefTrace.deeperParentImplication === 'keep') return null;
    if (termTotal <= contTotal) return null;
    if (
      runProgression.phase !== 'approaching_termination' &&
      runProgression.phase !== 'at_termination_zone' &&
      runProgression.phase !== 'beyond_typical_shape'
    ) {
      return null;
    }
  }

  return {
    winnerId: preferredId,
    reason: `run_progression_${runProgression.phase}_${runProgression.structuralPreference}`,
  };
}

function discriminationScore(
  primaryTotal: number,
  delta: FutureShapeDelta,
  deeper: DeeperDiscriminationTrace | null,
): number {
  const deeperTotal = deeper?.deeperNaturalness.total ?? 0;
  const deeperWeight = deeper ? 0.55 : 0;
  const primaryWeight = deeper ? 0.25 : 0.65;
  const deltaWeight = 0.35;
  return primaryTotal * primaryWeight + deeperTotal * deeperWeight + delta.deltaScore * deltaWeight;
}

function uncertainFallbackWinner(
  candidates: StateCandidateForTieResolution[],
  traces: StructuralDecisionTrace[],
): { winnerId: string; reason: string } {
  const keep = traces.find((t) => t.deeperParentImplication === 'keep');
  if (keep) {
    return { winnerId: keep.candidateId, reason: 'fallback_prefer_deeper_keep' };
  }
  const switchT = traces.find((t) => t.deeperParentImplication === 'switch');
  if (switchT && traces.every((t) => t.deeperParentImplication !== 'keep')) {
    return { winnerId: switchT.candidateId, reason: 'fallback_prefer_deeper_switch' };
  }
  const sorted = [...candidates].sort((a, b) => a.id.localeCompare(b.id));
  return { winnerId: sorted[0]!.id, reason: 'fallback_lexicographic' };
}

export function resolveStateStepWinner(
  candidates: StateCandidateForTieResolution[],
  fallbackBaseline: BaselineStateContext,
): TieResolutionResult {
  const runProgressionRaw = computeBaselineRunProgression(fallbackBaseline);
  const runProgression = buildRunProgressionTrace(runProgressionRaw);

  if (candidates.length < 2) {
    const only = candidates[0]!;
    return {
      winnerId: only.id,
      winnerLabel: only.label,
      margin: 0,
      resolutionMethod: 'naturalness_total',
      uncertain: false,
      deeperDrillUsed: false,
      structuralDecisionUsed: false,
      structuralReason: null,
      firstDiscriminatingPattern: null,
      evidence: [],
      structuralTraces: [],
      runProgression,
    };
  }

  const [a, b] = candidates;
  const margin = Math.abs(a!.naturalness.total - b!.naturalness.total);
  const firstDisc = findFirstDiscriminatingPattern(a!.recursivePath, b!.recursivePath);

  const buildEvidence = (c: StateCandidateForTieResolution): CandidateTieEvidence => {
    const baseline = c.baseline ?? fallbackBaseline;
    const { path: basePath, naturalness: baseNat } = analyzeBaselinePath(baseline);
    const delta = computeFutureShapeDelta(
      baseNat,
      c.naturalness,
      basePath,
      c.recursivePath,
      c.stateKind,
    );
    let deeper: DeeperDiscriminationTrace | null = null;
    if (firstDisc) {
      deeper = buildDeeperDiscriminationPath(c.recursivePath, firstDisc, {
        side: baseline.side,
        sub: baseline.sub,
        liveRunLength: c.stateKind === 'switch' ? 1 : baseline.liveRunLength,
        altPatternsAtRoot: baseline.altPatternsAtRoot,
        candidateMatchesCurrent: c.candidateMatchesCurrent,
        level: c.level,
      });
    }
    const primaryParentImplication = inferParentBranchImplication(c.childBehavior, c.level, {
      candidateMatchesCurrent: c.candidateMatchesCurrent,
      naturalness: c.naturalness,
    });
    const structural: StructuralDecisionTrace = {
      candidateId: c.id,
      primaryChildBehavior: c.childBehavior,
      primaryParentImplication,
      deeperChildBehavior: deeper?.childBehavior ?? c.childBehavior,
      deeperParentImplication: deeper?.parentImplication ?? primaryParentImplication,
      candidateMatchesCurrent: c.candidateMatchesCurrent,
      stateKind: c.stateKind,
    };
    return {
      candidateId: c.id,
      primaryTotal: c.naturalness.total,
      futureShapeDelta: delta,
      deeper,
      discriminationScore: discriminationScore(c.naturalness.total, delta, deeper),
      structural,
    };
  };

  if (margin >= TIE_MARGIN_THRESHOLD) {
    const winner = a!.naturalness.total >= b!.naturalness.total ? a! : b!;
    const evidence = candidates.map(buildEvidence);
    return {
      winnerId: winner.id,
      winnerLabel: winner.label,
      margin,
      resolutionMethod: 'naturalness_total',
      uncertain: false,
      deeperDrillUsed: false,
      structuralDecisionUsed: false,
      structuralReason: null,
      firstDiscriminatingPattern: firstDisc,
      evidence,
      structuralTraces: evidence.map((e) => e.structural),
      runProgression,
    };
  }

  const evidence = candidates.map(buildEvidence);
  const structuralTraces = evidence.map((e) => e.structural);

  const structural = tryStructuralDecision(structuralTraces);
  if (structural) {
    const winner = candidates.find((c) => c.id === structural.winnerId)!;
    return {
      winnerId: winner.id,
      winnerLabel: winner.label,
      margin,
      resolutionMethod: 'structural_decision',
      uncertain: false,
      deeperDrillUsed: firstDisc !== null,
      structuralDecisionUsed: true,
      structuralReason: structural.reason,
      firstDiscriminatingPattern: firstDisc,
      evidence,
      structuralTraces,
      runProgression,
    };
  }

  const runProgDecision = tryRunProgressionStructuralDecision(
    candidates,
    runProgressionRaw,
    structuralTraces,
  );
  if (runProgDecision) {
    const winner = candidates.find((c) => c.id === runProgDecision.winnerId)!;
    return {
      winnerId: winner.id,
      winnerLabel: winner.label,
      margin,
      resolutionMethod: 'run_progression_structural',
      uncertain: false,
      deeperDrillUsed: firstDisc !== null,
      structuralDecisionUsed: true,
      structuralReason: runProgDecision.reason,
      firstDiscriminatingPattern: firstDisc,
      evidence,
      structuralTraces,
      runProgression,
    };
  }

  const sorted = [...evidence].sort((x, y) => y.discriminationScore - x.discriminationScore);
  const top = sorted[0]!;
  const second = sorted[1]!;
  const deepMargin = top.discriminationScore - second.discriminationScore;

  if (deepMargin >= DEEPER_SCORE_MARGIN) {
    const winner = candidates.find((c) => c.id === top.candidateId)!;
    return {
      winnerId: winner.id,
      winnerLabel: winner.label,
      margin,
      resolutionMethod: 'deeper_discrimination',
      uncertain: false,
      deeperDrillUsed: true,
      structuralDecisionUsed: false,
      structuralReason: null,
      firstDiscriminatingPattern: firstDisc,
      evidence,
      structuralTraces,
      runProgression,
    };
  }

  const fb = uncertainFallbackWinner(candidates, structuralTraces);
  const fallback = candidates.find((c) => c.id === fb.winnerId)!;
  return {
    winnerId: fallback.id,
    winnerLabel: fallback.label,
    margin,
    resolutionMethod: 'uncertain_fallback',
    uncertain: true,
    deeperDrillUsed: firstDisc !== null,
    structuralDecisionUsed: false,
    structuralReason: fb.reason,
    firstDiscriminatingPattern: firstDisc,
    evidence,
    structuralTraces,
    runProgression,
  };
}

/** @internal exported for audit tests */
export { buildStructuralTrace };
