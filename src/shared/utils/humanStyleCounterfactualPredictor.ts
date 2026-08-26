/**
 * Human-style V2 — State counterfactual (STEP1/2) + Digit counterfactual (STEP3).
 * NOT Production V1. Does NOT modify Analysis recommendation.
 */

import type { AnalysisResult } from './analysisEngine';
import { analyzeMasterValue, buildRuns, toClassSequence } from './analysisEngine';
import {
  getDigitSubBand,
  getMainBandLabel,
  getSubBandLabel,
  type DigitBand,
  type DigitSubBand,
} from './digitSubBand';
import {
  analyzeRecursivePatternFlow,
  classifyOneDuplicateRunRelation,
  computePatternNaturalness,
  findFirstDiscriminatingPattern,
  flattenPatternLayers,
  futureShapeSignature,
  getPatternLayerLeaf,
  inferParentBranchImplication,
  type ChildPatternBehavior,
  type ParentBranchImplication,
  type PatternField,
  type PatternLayerTrace,
  type PatternNaturalness,
} from './humanStylePatternCore';
import {
  extractCodeValuesFromBaseSequence,
  type CodeValueSubPatterns,
} from './codeValueSubAnalysis';
import {
  simulateMainBandState,
  simulateSubBandState,
  getSubBandBaselineSequence,
  type StateTransitionKind,
} from './humanStyleStateSimulation';
import { trailingValueRun } from './humanStylePatternCore';
import {
  resolveStateStepWinner,
  TIE_MARGIN_THRESHOLD,
  type BaselineStateContext,
  type CandidateTieEvidence,
  type TieResolutionMethod,
  type TieResolutionResult,
  type RunProgressionTrace,
} from './humanStyleTieResolution';
import {
  HUMAN_DIAGNOSTIC_FIXTURE_MASTER,
  HUMAN_FIXTURE_EXPECTED,
  runHumanStyleDiagnostic,
  type HumanStyleDiagnosticResult,
} from './humanStyleDiagnosticPredictor';
import {
  formatHumanStyleStep3Trace,
  selectHumanStyleFinalDigit,
  type HumanStyleStep3Trace,
} from './humanStyleFinalDigitSelector';
import { predictNextDigitStep } from './nextDigitEngine';
import { buildCodeValueStats } from './analysisEngine';

export {
  HUMAN_DIAGNOSTIC_FIXTURE_MASTER,
  HUMAN_FIXTURE_EXPECTED,
  TIE_MARGIN_THRESHOLD,
};
export type { HumanStyleStep3Trace };
export type {
  PatternNaturalness,
  PatternLayerTrace,
  PatternField,
  CandidateTieEvidence,
  TieResolutionMethod,
  TieResolutionResult,
};

export interface CounterfactualCandidateResult {
  id: string;
  label: string;
  /** STEP3 only — actual MasterDigit append; STEP1/2 use state label */
  virtualAppend: string;
  virtualChange: string;
  recursivePath: PatternLayerTrace;
  futureShape: string;
  childBehavior: ChildPatternBehavior;
  parentImplication: ParentBranchImplication;
  naturalness: PatternNaturalness;
  /** STEP1/2 state counterfactual metadata */
  stateKind?: StateTransitionKind;
  simulatedSequence?: readonly number[];
  candidateMatchesCurrent?: boolean;
  level?: 'mainBand' | 'subBand';
  /** STEP1/2 tie-resolution evidence */
  tieEvidence?: CandidateTieEvidence;
}

export interface TieResolutionTrace {
  margin: number;
  threshold: number;
  resolutionMethod: TieResolutionMethod;
  uncertain: boolean;
  deeperDrillUsed: boolean;
  structuralDecisionUsed: boolean;
  structuralReason: string | null;
  evidence: CandidateTieEvidence[];
  runProgression?: RunProgressionTrace | null;
}

export interface CounterfactualStepResult {
  step: 1 | 2 | 3;
  title: string;
  currentBranch: string;
  candidates: CounterfactualCandidateResult[];
  firstDiscriminatingPattern: PatternField | null;
  winnerId: string;
  winnerLabel: string;
  tieResolution?: TieResolutionTrace;
  /** STEP3 sequential selection trace */
  step3Trace?: HumanStyleStep3Trace;
}

export interface HumanStyleV2Result {
  masterTailDigit: number;
  masterLength: number;
  step1: CounterfactualStepResult;
  step2: CounterfactualStepResult | null;
  step3: CounterfactualStepResult | null;
  finalDigit: number | null;
  v1Diagnostic: HumanStyleDiagnosticResult;
  humanFixtureMatch: boolean;
  v1VsV2Divergence: 'STEP1' | 'STEP2' | 'STEP3' | null;
}

const SUB_BAND_IDS: Record<DigitSubBand, string> = {
  lowLow: 'LOW_LOW',
  lowHigh: 'LOW_HIGH',
  highLow: 'HIGH_LOW',
  highHigh: 'HIGH_HIGH',
};

const SUB_BAND_FROM_ID: Record<string, DigitSubBand> = {
  LOW_LOW: 'lowLow',
  LOW_HIGH: 'lowHigh',
  HIGH_LOW: 'highLow',
  HIGH_HIGH: 'highHigh',
};

function liveRunAtTail(context: string): { side: 'low' | 'high'; length: number } {
  const runs = buildRuns(toClassSequence(context));
  if (runs.length === 0) return { side: 'low', length: 1 };
  const last = runs[runs.length - 1]!;
  return { side: last.cls, length: last.length };
}

function subBandForMain(mainBand: DigitBand): DigitSubBand[] {
  return mainBand === 'low' ? ['lowLow', 'lowHigh'] : ['highLow', 'highHigh'];
}

function defaultSubForBand(band: DigitBand): DigitSubBand {
  return band === 'low' ? 'lowLow' : 'highHigh';
}

function evaluateStateCandidate(options: {
  id: string;
  label: string;
  virtualChange: string;
  sequence: readonly number[];
  sequenceLabel: string;
  side: 'low' | 'high';
  sub: DigitSubBand;
  liveRunLength: number;
  candidateMatchesCurrent: boolean;
  altPatternsAtRoot?: CodeValueSubPatterns;
  stateKind: StateTransitionKind;
  level: 'mainBand' | 'subBand';
}): CounterfactualCandidateResult {
  const path = analyzeRecursivePatternFlow({
    sequence: [...options.sequence],
    sequenceLabel: options.sequenceLabel,
    side: options.side,
    currentSub: options.sub,
    liveRunLength: options.liveRunLength,
    altPatternsAtRoot: options.altPatternsAtRoot,
  });

  const leaf = getPatternLayerLeaf(path);
  const dup =
    leaf.tailFlow?.oneDuplicateRelation ??
    classifyOneDuplicateRunRelation(leaf.sequence, options.liveRunLength);
  const childBehavior: ChildPatternBehavior = dup?.childBehavior ?? 'uncertain';
  const naturalness = computePatternNaturalness(path, options.liveRunLength);
  const parentImplication = inferParentBranchImplication(childBehavior, options.level, {
    candidateMatchesCurrent: options.candidateMatchesCurrent,
    naturalness,
  });

  return {
    id: options.id,
    label: options.label,
    virtualAppend: options.stateKind,
    virtualChange: options.virtualChange,
    recursivePath: path,
    futureShape: futureShapeSignature(path),
    childBehavior,
    parentImplication,
    naturalness,
    stateKind: options.stateKind,
    simulatedSequence: options.sequence,
    candidateMatchesCurrent: options.candidateMatchesCurrent,
    level: options.level,
  };
}

function attachTieEvidence(
  candidates: CounterfactualCandidateResult[],
  evidence: CandidateTieEvidence[],
): CounterfactualCandidateResult[] {
  return candidates.map((c) => {
    const ev = evidence.find((e) => e.candidateId === c.id);
    return ev ? { ...c, tieEvidence: ev } : c;
  });
}

function resolveStatePair(
  candidates: CounterfactualCandidateResult[],
  fallbackBaseline: BaselineStateContext,
  perCandidateBaselines?: Record<string, BaselineStateContext>,
  defaultLevel: 'mainBand' | 'subBand' = 'mainBand',
): { winner: CounterfactualCandidateResult; tie: TieResolutionResult } {
  const tie = resolveStateStepWinner(
    candidates.map((c) => ({
      id: c.id,
      label: c.label,
      recursivePath: c.recursivePath,
      naturalness: c.naturalness,
      childBehavior: c.childBehavior,
      parentImplication: c.parentImplication,
      candidateMatchesCurrent: c.candidateMatchesCurrent ?? false,
      stateKind: c.stateKind,
      simulatedSequence: c.simulatedSequence,
      baseline: perCandidateBaselines?.[c.id],
      level: c.level ?? defaultLevel,
    })),
    fallbackBaseline,
  );
  const winner = candidates.find((c) => c.id === tie.winnerId)!;
  return { winner, tie };
}

function buildStep1StateCounterfactual(result: AnalysisResult): CounterfactualStepResult {
  const tailDigit = Number(result.digits.at(-1));
  const live = liveRunAtTail(result.digits);

  const lowState = simulateMainBandState(result, live.side, live.length, 'LOW');
  const highState = simulateMainBandState(result, live.side, live.length, 'HIGH');

  const lowPatterns = extractCodeValuesFromBaseSequence(lowState.sequence);
  const highPatterns = extractCodeValuesFromBaseSequence(highState.sequence);

  const lowCand = evaluateStateCandidate({
    id: 'LOW',
    label: '저점 [0~4]',
    virtualChange: lowState.virtualChange,
    sequence: lowState.sequence,
    sequenceLabel: 'S (저점) state counterfactual',
    side: 'low',
    sub: 'lowLow',
    liveRunLength: lowState.liveRunLength,
    candidateMatchesCurrent: live.side === 'low',
    altPatternsAtRoot: highPatterns,
    stateKind: lowState.stateKind,
    level: 'mainBand',
  });

  const highCand = evaluateStateCandidate({
    id: 'HIGH',
    label: '고점 [5~9]',
    virtualChange: highState.virtualChange,
    sequence: highState.sequence,
    sequenceLabel: 'S (고점) state counterfactual',
    side: 'high',
    sub: 'highHigh',
    liveRunLength: highState.liveRunLength,
    candidateMatchesCurrent: live.side === 'high',
    altPatternsAtRoot: lowPatterns,
    stateKind: highState.stateKind,
    level: 'mainBand',
  });

  const candidates = [lowCand, highCand];

  const baselineSeq =
    live.side === 'low' ? result.lowRunLengths : result.highRunLengths;
  const highBaselineSeq = [...result.highRunLengths];
  const lowBaselineSeq = [...result.lowRunLengths];

  const { winner, tie } = resolveStatePair(
    candidates,
    {
      sequence: baselineSeq,
      side: live.side,
      sub: live.side === 'low' ? 'lowLow' : 'highHigh',
      liveRunLength: live.length,
      altPatternsAtRoot:
        live.side === 'low'
          ? extractCodeValuesFromBaseSequence(highState.sequence)
          : extractCodeValuesFromBaseSequence(lowState.sequence),
    },
    {
      LOW: {
        sequence: lowBaselineSeq,
        side: 'low',
        sub: 'lowLow',
        liveRunLength: live.side === 'low' ? live.length : 1,
        altPatternsAtRoot: highPatterns,
      },
      HIGH: {
        sequence: highBaselineSeq,
        side: 'high',
        sub: 'highHigh',
        liveRunLength: live.side === 'high' ? live.length : 1,
        altPatternsAtRoot: lowPatterns,
      },
    },
  );

  const withEvidence = attachTieEvidence(candidates, tie.evidence);

  return {
    step: 1,
    title: 'STEP1 — MainBand state counterfactual',
    currentBranch: `tail ${tailDigit} · MainBand=${live.side.toUpperCase()} run ×${live.length}`,
    candidates: withEvidence,
    firstDiscriminatingPattern: tie.firstDiscriminatingPattern,
    winnerId: winner.id,
    winnerLabel: winner.label,
    tieResolution: {
      margin: tie.margin,
      threshold: TIE_MARGIN_THRESHOLD,
      resolutionMethod: tie.resolutionMethod,
      uncertain: tie.uncertain,
      deeperDrillUsed: tie.deeperDrillUsed,
      structuralDecisionUsed: tie.structuralDecisionUsed,
      structuralReason: tie.structuralReason,
      evidence: tie.evidence,
      runProgression: tie.runProgression,
    },
  };
}

function currentSubInMainBand(tailDigit: number, mainBand: DigitBand): DigitSubBand {
  const sub = getDigitSubBand(tailDigit);
  if (mainBand === 'low') {
    if (sub === 'lowLow' || sub === 'lowHigh') return sub;
    return 'lowLow';
  }
  if (sub === 'highLow' || sub === 'highHigh') return sub;
  return 'highLow';
}

function buildStep2StateCounterfactual(
  result: AnalysisResult,
  mainBand: DigitBand,
): CounterfactualStepResult {
  const side: DigitBand = mainBand;
  const tailDigit = Number(result.digits.at(-1));
  const currentSub = currentSubInMainBand(tailDigit, mainBand);
  const subs = subBandForMain(mainBand);
  const prefix = '';

  const states = subs.map((sub) => simulateSubBandState(result, side, currentSub, sub, prefix));

  const patterns = states.map((s) => extractCodeValuesFromBaseSequence(s.sequence));

  const candidates = states.map((state, i) => {
    const sub = subs[i]!;
    const alt = patterns[1 - i];
    return evaluateStateCandidate({
      id: SUB_BAND_IDS[sub],
      label: getSubBandLabel(sub),
      virtualChange: state.virtualChange,
      sequence: state.sequence,
      sequenceLabel: `S′ ${getSubBandLabel(sub)} state counterfactual`,
      side,
      sub,
      liveRunLength: state.liveRunLength,
      candidateMatchesCurrent: sub === currentSub,
      altPatternsAtRoot: alt,
      stateKind: state.stateKind,
      level: 'subBand',
    });
  });

  const baselineSubSeq = getSubBandBaselineSequence(result, side, currentSub, prefix);
  const baselineLiveRun = trailingValueRun(baselineSubSeq) || 1;
  const altSub = subs.find((s) => s !== currentSub)!;
  const altIdx = subs.indexOf(altSub);

  const { winner, tie } = resolveStatePair(
    candidates,
    {
      sequence: baselineSubSeq,
      side,
      sub: currentSub,
      liveRunLength: baselineLiveRun,
      altPatternsAtRoot: patterns[altIdx],
    },
    Object.fromEntries(
      subs.map((sub, i) => [
        SUB_BAND_IDS[sub],
        {
          sequence: getSubBandBaselineSequence(result, side, sub, prefix),
          side,
          sub,
          liveRunLength:
            sub === currentSub ? baselineLiveRun : 1,
          altPatternsAtRoot: patterns[1 - i],
        },
      ]),
    ) as Record<string, BaselineStateContext>,
    'subBand',
  );

  const withEvidence = attachTieEvidence(candidates, tie.evidence);

  return {
    step: 2,
    title: 'STEP2 — SubBand state counterfactual',
    currentBranch: `${getMainBandLabel(mainBand)} · current ${getSubBandLabel(currentSub)}`,
    candidates: withEvidence,
    firstDiscriminatingPattern: tie.firstDiscriminatingPattern,
    winnerId: winner.id,
    winnerLabel: winner.label,
    tieResolution: {
      margin: tie.margin,
      threshold: TIE_MARGIN_THRESHOLD,
      resolutionMethod: tie.resolutionMethod,
      uncertain: tie.uncertain,
      deeperDrillUsed: tie.deeperDrillUsed,
      structuralDecisionUsed: tie.structuralDecisionUsed,
      structuralReason: tie.structuralReason,
      evidence: tie.evidence,
      runProgression: tie.runProgression,
    },
  };
}

function buildStep3DigitCounterfactual(
  baseResult: AnalysisResult,
  masterNo: string,
  mainBand: DigitBand,
  subBand: DigitSubBand,
): CounterfactualStepResult {
  const tailDigit = Number(baseResult.digits.at(-1));
  const selection = selectHumanStyleFinalDigit({
    baseResult,
    masterNo,
    mainBand,
    subBand,
  });

  let firstDisc: PatternField | null = null;
  if (selection.candidates.length >= 2) {
    firstDisc = findFirstDiscriminatingPattern(
      selection.candidates[0]!.recursivePath,
      selection.candidates[1]!.recursivePath,
    );
  }

  return {
    step: 3,
    title: `STEP3 — MasterDigit sequential (${getSubBandLabel(subBand)})`,
    currentBranch: `${getSubBandLabel(subBand)} · tail ${tailDigit}`,
    candidates: selection.candidates,
    firstDiscriminatingPattern: firstDisc,
    winnerId: selection.winnerId,
    winnerLabel: selection.winnerLabel,
    step3Trace: selection.trace,
  };
}

export function runHumanStyleV2(
  masterValue: string = HUMAN_DIAGNOSTIC_FIXTURE_MASTER,
  masterNo = '00',
): HumanStyleV2Result {
  const baseResult = analyzeMasterValue(masterNo, masterValue);
  const v1Diagnostic = runHumanStyleDiagnostic(masterValue, masterNo);

  const step1 = buildStep1StateCounterfactual(baseResult);
  const mainBand: DigitBand = step1.winnerId === 'LOW' ? 'low' : 'high';

  const step2 = buildStep2StateCounterfactual(baseResult, mainBand);
  const subBand = SUB_BAND_FROM_ID[step2.winnerId] ?? defaultSubForBand(mainBand);

  const step3 = buildStep3DigitCounterfactual(baseResult, masterNo, mainBand, subBand);

  const finalDigit = Number(step3.winnerId);

  let v1VsV2: 'STEP1' | 'STEP2' | 'STEP3' | null = null;
  if (step1.winnerId !== v1Diagnostic.step1.winnerId) v1VsV2 = 'STEP1';
  else if (step2.winnerId !== v1Diagnostic.step2?.winnerId) v1VsV2 = 'STEP2';
  else if (finalDigit !== v1Diagnostic.finalDigit) v1VsV2 = 'STEP3';

  const humanFixtureMatch =
    step1.winnerId === HUMAN_FIXTURE_EXPECTED.step1 &&
    step2.winnerId === HUMAN_FIXTURE_EXPECTED.step2 &&
    finalDigit === HUMAN_FIXTURE_EXPECTED.final;

  return {
    masterTailDigit: Number(baseResult.digits.at(-1)),
    masterLength: baseResult.digits.length,
    step1,
    step2,
    step3,
    finalDigit,
    v1Diagnostic,
    humanFixtureMatch,
    v1VsV2Divergence: v1VsV2,
  };
}

export function getV1ProductionDigit(
  masterValue: string,
  masterNo = '00',
): number | null {
  const result = analyzeMasterValue(masterNo, masterValue);
  const stats = buildCodeValueStats(result, []);
  const step = predictNextDigitStep(result, stats, '', 1);
  return step?.scoreBreakdown?.winningDigit ?? null;
}

export function formatCounterfactualStep(step: CounterfactualStepResult): string[] {
  const lines = [step.title, `branch: ${step.currentBranch}`, ''];
  for (const c of step.candidates) {
    lines.push(`candidate ${c.id} (${c.label}):`);
    if (c.stateKind) {
      lines.push(`  state: ${c.stateKind}`);
      lines.push(`  simulated S: [${c.simulatedSequence?.join(',') ?? '—'}]`);
    }
    lines.push(`  virtual: ${c.virtualChange}`);
    lines.push(`  future shape: ${c.futureShape}`);
    lines.push(`  childBehavior: ${c.childBehavior}`);
    lines.push(`  parentImplication: ${c.parentImplication}`);
    lines.push(
      `  naturalness: cont=${c.naturalness.continuationFit.toFixed(2)} term=${c.naturalness.terminationFit.toFixed(2)} marker=${c.naturalness.markerProgressFit.toFixed(2)} alt=${c.naturalness.alternationFit.toFixed(2)} nested=${c.naturalness.nestedPatternAgreement.toFixed(2)} penalty=${(c.naturalness.contradictionPenalty + c.naturalness.structuralChangePenalty).toFixed(2)} total=${c.naturalness.total.toFixed(2)}`,
    );
    if (c.tieEvidence) {
      lines.push(
        `  tie: delta=${c.tieEvidence.futureShapeDelta.deltaScore.toFixed(3)} (${c.tieEvidence.futureShapeDelta.label}) disc=${c.tieEvidence.discriminationScore.toFixed(3)}`,
      );
      lines.push(
        `  structural: primary child=${c.tieEvidence.structural.primaryChildBehavior}→parent=${c.tieEvidence.structural.primaryParentImplication} | deeper child=${c.tieEvidence.structural.deeperChildBehavior}→parent=${c.tieEvidence.structural.deeperParentImplication}`,
      );
      if (c.tieEvidence.deeper) {
        lines.push(
          `  deeper@${c.tieEvidence.deeper.field}: total=${c.tieEvidence.deeper.deeperNaturalness.total.toFixed(2)} child=${c.tieEvidence.deeper.childBehavior} parent=${c.tieEvidence.deeper.parentImplication}`,
        );
      }
    }
    const drills = flattenPatternLayers(c.recursivePath)
      .map((l) => l.selectedDrillDown ?? 'leaf')
      .join(' → ');
    lines.push(`  recursive path: ${drills}`);
    lines.push('');
  }
  lines.push(
    `firstDiscriminatingPattern: ${step.firstDiscriminatingPattern ?? '—'}`,
  );
  if (step.tieResolution) {
    const tr = step.tieResolution;
    lines.push(
      `tieResolution: margin=${tr.margin.toFixed(4)} threshold=${tr.threshold} method=${tr.resolutionMethod} uncertain=${tr.uncertain} deeperDrill=${tr.deeperDrillUsed} structural=${tr.structuralDecisionUsed}${tr.structuralReason ? ` reason=${tr.structuralReason}` : ''}`,
    );
    if (tr.runProgression) {
      const rp = tr.runProgression;
      lines.push('runProgression:');
      lines.push(`  selectedPattern: ${rp.selectedPattern ?? '—'}`);
      lines.push(`  activeRun: ${rp.activeRun}`);
      lines.push(`  historicalRuns tail: [${rp.historicalRunsTail.join(',')}]`);
      lines.push(
        `  typicalCenter: ${rp.typicalCenter ?? '—'} typicalUpperBoundary: ${rp.typicalUpperBoundary ?? '—'}`,
      );
      lines.push(`  phase: ${rp.phase}`);
      lines.push(
        `  continuationShape: ${rp.continuationShapeTotal?.toFixed(2) ?? '—'} switchShape: ${rp.terminationShapeTotal?.toFixed(2) ?? '—'}`,
      );
      lines.push(
        `  structuralPreference: ${rp.structuralPreference} confidence: ${rp.confidence.toFixed(2)}`,
      );
      lines.push(`  reason: ${rp.reason}`);
      const winnerCand = step.candidates.find((c) => c.id === step.winnerId);
      if (winnerCand) {
        lines.push(
          `  childBehavior: ${winnerCand.childBehavior} parentImplication: ${winnerCand.parentImplication}`,
        );
      }
      lines.push(`  final winner: ${step.winnerId} method=${tr.resolutionMethod}`);
    }
  }
  if (step.step3Trace) {
    lines.push('');
    lines.push(...formatHumanStyleStep3Trace(step.step3Trace));
  }
  lines.push(`winner: ${step.winnerId} (${step.winnerLabel})`);
  return lines;
}

export function formatHumanStyleV2Report(v2: HumanStyleV2Result): string {
  const lines = [
    `Human-style V2 state counterfactual — ${v2.masterLength} digits, tail=${v2.masterTailDigit}`,
    '',
    ...formatCounterfactualStep(v2.step1),
    '',
  ];
  if (v2.step2) lines.push(...formatCounterfactualStep(v2.step2), '');
  if (v2.step3) lines.push(...formatCounterfactualStep(v2.step3), '');
  lines.push(`FINAL = ${v2.finalDigit}`);
  lines.push(`Human fixture: ${v2.humanFixtureMatch ? 'MATCH' : 'MISMATCH'}`);
  lines.push(`V1 diagnostic: ${v2.v1Diagnostic.finalDigit} (divergence: ${v2.v1VsV2Divergence ?? 'none'})`);
  return lines.join('\n');
}
