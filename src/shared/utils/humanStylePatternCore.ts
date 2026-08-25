/**
 * Shared pattern-flow analysis for Human-style V1 diagnostic and V2 counterfactual.
 * NOT Production V1 scoring.
 */

import type { DigitClass } from './analysisEngine';
import {
  extractCodeValuesFromBaseSequence,
  type CodeValueSubPatterns,
} from './codeValueSubAnalysis';
import { inferSubBandPhaseFromOneBetween } from './subBandRepeatJudgment';
import type { DigitSubBand } from './digitSubBand';

export type PatternField = keyof CodeValueSubPatterns;
export type DiagnosticPhase = 'repeat' | 'transition';

export type ChildPatternBehavior =
  | 'extends'
  | 'terminates'
  | 'marker_complete'
  | 'marker_in_progress'
  | 'uncertain';

export type ParentBranchImplication = 'keep' | 'switch' | 'neutral';

export interface PatternNaturalness {
  continuationFit: number;
  terminationFit: number;
  markerProgressFit: number;
  alternationFit: number;
  nestedPatternAgreement: number;
  contradictionPenalty: number;
  structuralChangePenalty: number;
  total: number;
}

export interface OneDuplicateRunRelation {
  expectedHint: number;
  activeRun: number;
  relation:
    | 'below_termination_zone'
    | 'at_termination_boundary'
    | 'at_hint_ceiling'
    | 'beyond_hint';
  childBehavior: ChildPatternBehavior;
}

export interface TailFlowAssessment {
  phase: DiagnosticPhase;
  label: string;
  repeatWeight: number;
  transitionWeight: number;
  oneDuplicateRelation: OneDuplicateRunRelation | null;
}

export interface PatternLayerTrace {
  depth: number;
  sequenceLabel: string;
  sequence: readonly number[];
  patternSummary: Partial<Record<PatternField, number[]>>;
  selectedDrillDown: PatternField | null;
  drillDownReason: string;
  informativenessScore: number;
  child: PatternLayerTrace | null;
  tailFlow: TailFlowAssessment | null;
}

export const MAX_RECURSION_DEPTH = 4;

export const ALL_PATTERN_FIELDS: PatternField[] = [
  'oneDuplicate',
  'oneBetween',
  'commaAlpha_2_3',
  'plusAlpha_3_2',
  'plusAlpha_4_3',
  'plusAlpha_4_4',
  'threeOrMore',
  'fiveOrMore',
  'alphaPlus_3_2',
  'alphaPlus_4_3',
];

export function trailingValueRun(sequence: readonly number[]): number {
  if (sequence.length === 0) return 0;
  const last = sequence.at(-1)!;
  let run = 1;
  for (let i = sequence.length - 2; i >= 0; i -= 1) {
    if (sequence[i] === last) run += 1;
    else break;
  }
  return run;
}

export function extractDrillDownSequence(
  sequence: readonly number[],
  field: PatternField,
): number[] {
  const patterns = extractCodeValuesFromBaseSequence([...sequence]);
  const values = patterns[field] ?? [];
  if (values.length > 0) return [...values];

  if (field === 'oneBetween') {
    const markers = sequence.map((v, i) => (v === 1 ? i : -1)).filter((i) => i >= 0);
    if (markers.length >= 2) {
      const betweenCounts: number[] = [];
      for (let m = 0; m < markers.length - 1; m += 1) {
        betweenCounts.push(markers[m + 1]! - markers[m]! - 1);
      }
      return betweenCounts.filter((c) => c > 0);
    }
  }
  return [];
}

export function summarizePatterns(
  patterns: CodeValueSubPatterns,
): Partial<Record<PatternField, number[]>> {
  const out: Partial<Record<PatternField, number[]>> = {};
  for (const key of ALL_PATTERN_FIELDS) {
    const vals = patterns[key];
    if (vals.length > 0) out[key] = vals;
  }
  return out;
}

/**
 * expectedHint = latest 1중복 run-length hint in Pattern CodeValue space (NOT MasterDigit).
 * activeRun = trailing identical-value run in the analyzed sequence.
 */
export function classifyOneDuplicateRunRelation(
  sequence: readonly number[],
  liveRunLength: number,
): OneDuplicateRunRelation | null {
  const patterns = extractCodeValuesFromBaseSequence([...sequence]);
  const hints = (patterns.oneDuplicate ?? []).filter((v) => v > 0);
  if (hints.length === 0) return null;

  const expectedHint = hints[hints.length - 1]!;
  const seqTrailing = trailingValueRun(sequence);
  const activeRun = Math.max(liveRunLength, seqTrailing);

  let relation: OneDuplicateRunRelation['relation'];
  let childBehavior: ChildPatternBehavior;

  if (activeRun < expectedHint - 1) {
    relation = 'below_termination_zone';
    childBehavior = 'extends';
  } else if (activeRun === expectedHint - 1) {
    relation = 'at_termination_boundary';
    childBehavior = 'terminates';
  } else if (activeRun === expectedHint) {
    relation = 'at_hint_ceiling';
    childBehavior = 'terminates';
  } else {
    relation = 'beyond_hint';
    childBehavior = 'marker_complete';
  }

  return { expectedHint, activeRun, relation, childBehavior };
}

export function assessTailFlow(
  sequence: readonly number[],
  side: DigitClass,
  currentSub: DigitSubBand,
  liveRunLength: number,
): TailFlowAssessment {
  let repeatWeight = 0;
  let transitionWeight = 0;
  const parts: string[] = [];

  const dupRelation = classifyOneDuplicateRunRelation(sequence, liveRunLength);
  if (dupRelation) {
    switch (dupRelation.relation) {
      case 'below_termination_zone':
        repeatWeight += 2;
        parts.push(
          `1중복 hint ${dupRelation.expectedHint}: run ${dupRelation.activeRun} < ${dupRelation.expectedHint - 1} → 진행 중`,
        );
        break;
      case 'at_termination_boundary':
        terminationWeight(dupRelation, parts);
        repeatWeight += 1.5;
        transitionWeight += 1;
        parts.push(
          `1중복 hint ${dupRelation.expectedHint}: run ${dupRelation.activeRun} = hint-1 → 종료 경계`,
        );
        break;
      case 'at_hint_ceiling':
        transitionWeight += 2;
        parts.push(
          `1중복 hint ${dupRelation.expectedHint}: run ${dupRelation.activeRun} = hint → 천장 도달`,
        );
        break;
      case 'beyond_hint':
        transitionWeight += 3;
        parts.push(
          `1중복 hint ${dupRelation.expectedHint}: run ${dupRelation.activeRun} > hint → 구조 초과`,
        );
        break;
    }
  }

  const oneBetween = inferSubBandPhaseFromOneBetween([...sequence], side, currentSub);
  if (oneBetween) {
    const w = 2;
    if (oneBetween.phase === 'repeat') repeatWeight += w;
    else transitionWeight += w;
    parts.push(`1사이: ${oneBetween.label}`);
  }

  if (repeatWeight === 0 && transitionWeight === 0) {
    transitionWeight = 0.5;
    parts.push('종합: 신호 약함');
  }

  const phase: DiagnosticPhase =
    repeatWeight > transitionWeight ? 'repeat' : 'transition';

  return {
    phase,
    label: parts.join(' | '),
    repeatWeight,
    transitionWeight,
    oneDuplicateRelation: dupRelation,
  };
}

function terminationWeight(_rel: OneDuplicateRunRelation, _parts: string[]): void {
  void _rel;
  void _parts;
}

/** Score how informative a pattern field is for drill-down (not fixed 1사이→1중복). */
export function scorePatternInformativeness(
  field: PatternField,
  patterns: CodeValueSubPatterns,
  sequence: readonly number[],
  altPatterns?: CodeValueSubPatterns,
): number {
  const vals = patterns[field] ?? [];
  const extracted = vals.length > 0 ? vals : extractDrillDownSequence(sequence, field);
  if (extracted.length === 0) return 0;

  let score = Math.min(extracted.length, 5) * 0.15;

  const tail = extracted.at(-1) ?? 0;
  const tailRun = trailingValueRun(extracted);
  if (field === 'oneBetween') {
    score += 1.2;
    if (sequence.at(-1) === 1) score += 0.8;
  }
  if (field === 'oneDuplicate') {
    score += 0.9;
    if (tailRun <= tail) score += 0.5;
  }
  if (field.startsWith('plusAlpha') || field.startsWith('commaAlpha')) {
    score += 0.4;
  }

  if (altPatterns) {
    const altVals = altPatterns[field] ?? [];
    const altTail = altVals.at(-1) ?? -1;
    if (altTail !== tail || altVals.length !== vals.length) {
      score += 1.5;
    }
  }

  return score;
}

export function selectInformativeDrillDown(
  patterns: CodeValueSubPatterns,
  sequence: readonly number[],
  altPatterns?: CodeValueSubPatterns,
): { field: PatternField | null; reason: string; score: number } {
  let best: PatternField | null = null;
  let bestScore = 0;
  let reason = 'drill-down 없음';

  for (const field of ALL_PATTERN_FIELDS) {
    const score = scorePatternInformativeness(field, patterns, sequence, altPatterns);
    if (score > bestScore) {
      bestScore = score;
      best = field;
      const vals = patterns[field] ?? extractDrillDownSequence(sequence, field);
      reason = `${field} informativeness=${score.toFixed(2)} tail=[${vals.slice(-3).join(',')}]`;
    }
  }

  return { field: bestScore > 0 ? best : null, reason, score: bestScore };
}

export function analyzeRecursivePatternFlow(options: {
  sequence: readonly number[];
  sequenceLabel: string;
  side: DigitClass;
  currentSub: DigitSubBand;
  liveRunLength: number;
  depth?: number;
  maxDepth?: number;
  altPatternsAtRoot?: CodeValueSubPatterns;
}): PatternLayerTrace {
  const depth = options.depth ?? 0;
  const maxDepth = options.maxDepth ?? MAX_RECURSION_DEPTH;
  const sequence = [...options.sequence];
  const patterns = extractCodeValuesFromBaseSequence(sequence, options.side);
  const alt = depth === 0 ? options.altPatternsAtRoot : undefined;
  const { field, reason, score } = selectInformativeDrillDown(patterns, sequence, alt);

  if (field && depth < maxDepth) {
    const childSeq =
      (patterns[field]?.length ?? 0) > 0
        ? [...patterns[field]!]
        : extractDrillDownSequence(sequence, field);
    if (childSeq.length > 0) {
      return {
        depth,
        sequenceLabel: options.sequenceLabel,
        sequence,
        patternSummary: summarizePatterns(patterns),
        selectedDrillDown: field,
        drillDownReason: reason,
        informativenessScore: score,
        child: analyzeRecursivePatternFlow({
          sequence: childSeq,
          sequenceLabel: `${options.sequenceLabel} → ${field}`,
          side: options.side,
          currentSub: options.currentSub,
          liveRunLength: trailingValueRun(childSeq),
          depth: depth + 1,
          maxDepth,
        }),
        tailFlow: null,
      };
    }
  }

  return {
    depth,
    sequenceLabel: options.sequenceLabel,
    sequence,
    patternSummary: summarizePatterns(patterns),
    selectedDrillDown: null,
    drillDownReason: reason,
    informativenessScore: score,
    child: null,
    tailFlow: assessTailFlow(sequence, options.side, options.currentSub, options.liveRunLength),
  };
}

/** Candidate-specific future shape at hint ceiling (Pattern CodeValue space only). */
export interface CeilingFutureShape {
  terminatesAtCeiling: boolean;
  exceedsCeiling: boolean;
  newRunStarted: boolean;
  nestedPatternComplete: boolean;
}

export function assessCeilingFutureShape(
  path: PatternLayerTrace,
  dup: OneDuplicateRunRelation,
  childBehavior: ChildPatternBehavior,
): CeilingFutureShape {
  const layers = flattenPatternLayers(path);
  const leaf = getPatternLayerLeaf(path);
  const seq = leaf.sequence;

  const exceedsCeiling =
    layers.some((l) => l.tailFlow?.oneDuplicateRelation?.relation === 'beyond_hint') ||
    childBehavior === 'marker_complete';

  const nestedPatternComplete =
    exceedsCeiling ||
    layers.some(
      (l) =>
        l.child !== null &&
        l.tailFlow === null &&
        getPatternLayerLeaf(l).tailFlow?.phase === 'transition',
    );

  const newRunStarted =
    seq.length >= 2 &&
    trailingValueRun(seq) === 1 &&
    seq.at(-1) !== seq.at(-2);

  const terminatesAtCeiling =
    dup.relation === 'at_hint_ceiling' &&
    childBehavior === 'terminates' &&
    !exceedsCeiling &&
    !newRunStarted;

  return { terminatesAtCeiling, exceedsCeiling, newRunStarted, nestedPatternComplete };
}

/** Structural direction key for branch coherence (not MasterDigit). */
export function shapeDirectionKey(
  path: PatternLayerTrace,
  childBehavior: ChildPatternBehavior,
): string {
  const leaf = getPatternLayerLeaf(path);
  const dup = leaf.tailFlow?.oneDuplicateRelation;
  return `${childBehavior}|${leaf.tailFlow?.phase ?? '?'}|${dup?.relation ?? 'none'}`;
}

function ceilingRelationScores(
  path: PatternLayerTrace,
  dup: OneDuplicateRunRelation,
): Pick<
  PatternNaturalness,
  'continuationFit' | 'terminationFit' | 'structuralChangePenalty'
> {
  const childBehavior = dup.childBehavior;
  const ceiling = assessCeilingFutureShape(path, dup, childBehavior);

  if (ceiling.exceedsCeiling) {
    return { continuationFit: 0.15, terminationFit: 0.5, structuralChangePenalty: 0.45 };
  }
  if (ceiling.newRunStarted) {
    return { continuationFit: 0.55, terminationFit: 0.4, structuralChangePenalty: 0 };
  }
  if (ceiling.nestedPatternComplete) {
    return { continuationFit: 0.3, terminationFit: 0.65, structuralChangePenalty: 0.1 };
  }
  if (ceiling.terminatesAtCeiling) {
    return { continuationFit: 0.35, terminationFit: 0.7, structuralChangePenalty: 0 };
  }
  return { continuationFit: 0.4, terminationFit: 0.55, structuralChangePenalty: 0.05 };
}

export function computePatternNaturalness(
  path: PatternLayerTrace,
  liveRunLength: number,
): PatternNaturalness {
  const leaf = getPatternLayerLeaf(path);
  const tail = leaf.tailFlow ?? assessTailFlow(leaf.sequence, 'low', 'lowLow', liveRunLength);
  const dup = tail.oneDuplicateRelation;

  let continuationFit = 0;
  let terminationFit = 0;
  let markerProgressFit = 0;
  let alternationFit = 0;
  let nestedPatternAgreement = 0;
  let contradictionPenalty = 0;
  let structuralChangePenalty = 0;

  if (dup) {
    switch (dup.relation) {
      case 'below_termination_zone':
        continuationFit = 0.85;
        terminationFit = 0.15;
        break;
      case 'at_termination_boundary':
        continuationFit = 0.45;
        terminationFit = 0.75;
        break;
      case 'at_hint_ceiling': {
        const ceilingScores = ceilingRelationScores(path, dup);
        continuationFit = ceilingScores.continuationFit;
        terminationFit = ceilingScores.terminationFit;
        structuralChangePenalty = ceilingScores.structuralChangePenalty;
        break;
      }
      case 'beyond_hint':
        continuationFit = 0.1;
        terminationFit = 0.5;
        structuralChangePenalty = 0.6;
        break;
    }
  } else {
    continuationFit = tail.phase === 'repeat' ? 0.6 : 0.3;
    terminationFit = tail.phase === 'transition' ? 0.6 : 0.3;
  }

  const oneBetweenHints = leaf.patternSummary.oneBetween;
  if (oneBetweenHints && oneBetweenHints.length > 0) {
    const expected = oneBetweenHints[oneBetweenHints.length - 1]!;
    const trailing = trailingSinceMarkerOne(leaf.sequence);
    markerProgressFit =
      trailing < expected ? 0.7 : trailing === expected ? 0.5 : 0.3;
  }

  const layers = flattenPatternLayers(path);
  if (layers.length >= 2) {
    const phases = layers
      .map((l) => l.tailFlow?.phase)
      .filter(Boolean) as DiagnosticPhase[];
    const agree = phases.every((p) => p === phases[0]);
    nestedPatternAgreement = agree ? 0.7 : 0.35;
    if (!agree) contradictionPenalty += 0.25;
  }

  if (path.informativenessScore > 0) {
    alternationFit = Math.min(path.informativenessScore / 3, 0.8);
  }

  const total =
    continuationFit * 1.2 +
    terminationFit * 1.0 +
    markerProgressFit * 0.9 +
    alternationFit * 0.7 +
    nestedPatternAgreement * 0.8 -
    contradictionPenalty -
    structuralChangePenalty;

  return {
    continuationFit,
    terminationFit,
    markerProgressFit,
    alternationFit,
    nestedPatternAgreement,
    contradictionPenalty,
    structuralChangePenalty,
    total,
  };
}

function trailingSinceMarkerOne(sequence: readonly number[]): number {
  let count = 0;
  for (let i = sequence.length - 1; i >= 0; i -= 1) {
    if (sequence[i] === 1) break;
    count += 1;
  }
  return count;
}

export function getPatternLayerLeaf(path: PatternLayerTrace): PatternLayerTrace {
  return path.child ? getPatternLayerLeaf(path.child) : path;
}

export function flattenPatternLayers(path: PatternLayerTrace): PatternLayerTrace[] {
  const out: PatternLayerTrace[] = [path];
  if (path.child) out.push(...flattenPatternLayers(path.child));
  return out;
}

/**
 * Child pattern behavior ≠ parent branch decision (explicit separation).
 */
export function inferParentBranchImplication(
  childBehavior: ChildPatternBehavior,
  level: 'mainBand' | 'subBand' | 'digit',
  opts: {
    candidateMatchesCurrent: boolean;
    naturalness: PatternNaturalness;
  },
): ParentBranchImplication {
  void level;
  const { candidateMatchesCurrent, naturalness } = opts;

  if (childBehavior === 'extends' && naturalness.continuationFit > 0.5) {
    return candidateMatchesCurrent ? 'keep' : 'switch';
  }
  if (childBehavior === 'terminates' && naturalness.terminationFit > 0.5) {
    return candidateMatchesCurrent ? 'keep' : 'neutral';
  }
  if (childBehavior === 'marker_complete') {
    return 'switch';
  }
  return naturalness.total >= 0 ? 'neutral' : 'neutral';
}

export function findFirstDiscriminatingPattern(
  pathA: PatternLayerTrace,
  pathB: PatternLayerTrace,
): PatternField | null {
  const layersA = flattenPatternLayers(pathA);
  const layersB = flattenPatternLayers(pathB);
  const len = Math.min(layersA.length, layersB.length);

  for (let i = 0; i < len; i += 1) {
    const a = layersA[i]!;
    const b = layersB[i]!;
    const drillA = a.selectedDrillDown;
    const drillB = b.selectedDrillDown;
    if (drillA !== drillB) return drillA ?? drillB;

    for (const field of ALL_PATTERN_FIELDS) {
      const va = a.patternSummary[field]?.join(',') ?? '';
      const vb = b.patternSummary[field]?.join(',') ?? '';
      if (va !== vb && (va || vb)) return field;
    }
  }

  const tailA = getPatternLayerLeaf(pathA).tailFlow?.phase;
  const tailB = getPatternLayerLeaf(pathB).tailFlow?.phase;
  if (tailA !== tailB) {
    return getPatternLayerLeaf(pathA).selectedDrillDown ?? 'oneBetween';
  }
  return null;
}

export function futureShapeSignature(path: PatternLayerTrace): string {
  const leaf = getPatternLayerLeaf(path);
  const dup = leaf.tailFlow?.oneDuplicateRelation;
  const drill = flattenPatternLayers(path)
    .map((l) => l.selectedDrillDown ?? 'leaf')
    .join('>');
  return `${drill}|dup=${dup?.relation ?? 'none'}|phase=${leaf.tailFlow?.phase ?? '?'}`;
}
