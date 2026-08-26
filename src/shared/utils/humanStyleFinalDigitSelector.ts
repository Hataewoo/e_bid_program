/**
 * Human-style V2 STEP3 — sequential recent-anchor repeat → eliminate → pair.
 * NOT Production V1. Does not modify STEP1/STEP2 tie-resolution.
 */

import type { AnalysisResult } from './analysisEngine';
import { analyzeMasterValue } from './analysisEngine';
import { getLegacyStepCodeOrder } from '../fixtures/legacy-step-code-catalog';
import {
  buildLegacyCodeContentForCodeName,
  resolvePrimaryCodeForDigit,
} from './legacyCodeFlowAnalysis';
import {
  getDigitsInSubBand,
  getSubBandLabel,
  type DigitBand,
  type DigitSubBand,
} from './digitSubBand';
import { resolveLegacyCodeObjectBase } from './legacyEmyoungAlgorithms';
import {
  analyzeRecursivePatternFlow,
  classifyOneDuplicateRunRelation,
  computePatternNaturalness,
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
  buildDeeperDiscriminationPath,
  TIE_MARGIN_THRESHOLD,
} from './humanStyleTieResolution';
import type { CounterfactualCandidateResult } from './humanStyleCounterfactualPredictor';

export type RepeatDecision = 'REPEAT' | 'TERMINATE';

export type Step3DecisionMethod =
  | 'structural_parent_keep'
  | 'structural_parent_switch'
  | 'deeper_parent_keep'
  | 'deeper_parent_switch'
  | 'naturalness_continuation_margin'
  | 'naturalness_termination_margin'
  | 'uncertain_fallback_naturalness';

export interface Step3RepeatDecisionResult {
  decision: RepeatDecision;
  decisionReason: string;
  decisionMethod: Step3DecisionMethod;
  uncertain: boolean;
  deeperParentImplication: ParentBranchImplication;
  deeperChildBehavior: ChildPatternBehavior;
}

export interface PatternFlowEvaluation {
  codeName: string;
  gapCount: number;
  childBehavior: ChildPatternBehavior;
  naturalness: PatternNaturalness;
  parentImplication: ParentBranchImplication;
  deeperParentImplication: ParentBranchImplication;
  deeperChildBehavior: ChildPatternBehavior;
  recursivePath: PatternLayerTrace;
  futureShape: string;
  decision: RepeatDecision;
  decisionReason: string;
  decisionMethod: Step3DecisionMethod;
  uncertain: boolean;
  label: string;
}

export interface HumanStyleStep3Trace {
  selectedSubBand: DigitSubBand;
  pool: readonly number[];
  recentOrder: number[];
  primaryCandidate: number | null;
  repeatCode: string | null;
  repeatEvaluation: PatternFlowEvaluation | null;
  eliminated: number[];
  remainingAfterElimination: number[];
  pairAnchor: number | null;
  pairOther: number | null;
  pairCode: string | null;
  pairEvaluation: PatternFlowEvaluation | null;
  pairDecision: number | null;
  finalDigit: number;
  method: 'repeat' | 'pair' | 'singleton';
}

export interface HumanStyleFinalDigitResult {
  winnerId: string;
  winnerLabel: string;
  finalDigit: number;
  candidates: CounterfactualCandidateResult[];
  trace: HumanStyleStep3Trace;
}

function liveRunAtTail(master: string): { side: 'low' | 'high'; length: number } {
  if (master.length === 0) return { side: 'low', length: 1 };
  const last = Number(master.at(-1));
  return { side: last <= 4 ? 'low' : 'high', length: 1 };
}

/** Master 꼬리에서 pool에 속하는 가장 최근 digit (evaluation order only). */
export function findMostRecentDigitInPool(
  masterDigits: string,
  pool: readonly number[],
): number | null {
  const poolSet = new Set(pool);
  for (let i = masterDigits.length - 1; i >= 0; i -= 1) {
    const d = Number(masterDigits[i]);
    if (Number.isInteger(d) && d >= 0 && d <= 9 && poolSet.has(d)) return d;
  }
  return null;
}

/** object digit = anchor 인 코드 중 catalog 상 가장 구체적인(긴) 코드 — e.g. 4 → 423 */
export function resolveRepeatEvaluationCode(
  anchorDigit: number,
  mainBand: DigitBand,
): string {
  const order = getLegacyStepCodeOrder(mainBand);
  const anchorStr = String(anchorDigit);
  let best: string | null = null;
  for (const code of order) {
    const { objectDigits } = resolveLegacyCodeObjectBase(code);
    if (objectDigits === anchorStr && (!best || code.length > best.length)) {
      best = code;
    }
  }
  return best ?? resolvePrimaryCodeForDigit(anchorDigit, mainBand);
}

/** anchor(object) vs other(base) pair code — prefer exact base match, e.g. 3,2 → 32 */
export function resolvePairEvaluationCode(
  anchorDigit: number,
  otherDigit: number,
  mainBand: DigitBand,
): string {
  const order = getLegacyStepCodeOrder(mainBand);
  const a = String(anchorDigit);
  const b = String(otherDigit);
  for (const code of order) {
    const { objectDigits, baseDigits } = resolveLegacyCodeObjectBase(code);
    if (objectDigits === a && baseDigits === b) return code;
  }
  let best: string | null = null;
  let bestBaseLen = Infinity;
  for (const code of order) {
    const { objectDigits, baseDigits } = resolveLegacyCodeObjectBase(code);
    if (objectDigits === a && baseDigits.startsWith(b) && baseDigits.length < bestBaseLen) {
      best = code;
      bestBaseLen = baseDigits.length;
    }
  }
  if (best) return best;
  const concat = `${a}${b}`;
  if ((order as readonly string[]).includes(concat)) return concat;
  return resolvePrimaryCodeForDigit(anchorDigit, mainBand);
}

function firstDrillFieldInPath(path: PatternLayerTrace): PatternField | null {
  for (const layer of flattenPatternLayers(path)) {
    if (layer.selectedDrillDown) return layer.selectedDrillDown;
  }
  return null;
}

/**
 * STEP3 repeat/terminate — child pattern ≠ parent digit decision.
 * Mirrors STEP1/2 structural hierarchy: parent implication drives outcome.
 */
export function decideStep3RepeatDecision(options: {
  path: PatternLayerTrace;
  childBehavior: ChildPatternBehavior;
  parentImplication: ParentBranchImplication;
  naturalness: PatternNaturalness;
  mainBand: DigitBand;
  subBand: DigitSubBand;
  liveRunLength: number;
  candidateMatchesCurrent: boolean;
}): Step3RepeatDecisionResult {
  const {
    path,
    childBehavior,
    parentImplication,
    naturalness,
    mainBand,
    subBand,
    liveRunLength,
    candidateMatchesCurrent,
  } = options;

  const drillField = firstDrillFieldInPath(path);
  let deeperParent = parentImplication;
  let deeperChild = childBehavior;

  if (drillField) {
    const deeper = buildDeeperDiscriminationPath(path, drillField, {
      side: mainBand,
      sub: subBand,
      liveRunLength,
      candidateMatchesCurrent,
      level: 'subBand',
    });
    deeperParent = deeper.parentImplication;
    deeperChild = deeper.childBehavior;
  }

  if (parentImplication === 'keep') {
    return {
      decision: 'REPEAT',
      decisionReason: 'structural_parent_keep',
      decisionMethod: 'structural_parent_keep',
      uncertain: false,
      deeperParentImplication: deeperParent,
      deeperChildBehavior: deeperChild,
    };
  }
  if (parentImplication === 'switch') {
    return {
      decision: 'TERMINATE',
      decisionReason: 'structural_parent_switch',
      decisionMethod: 'structural_parent_switch',
      uncertain: false,
      deeperParentImplication: deeperParent,
      deeperChildBehavior: deeperChild,
    };
  }

  if (deeperParent === 'keep') {
    return {
      decision: 'REPEAT',
      decisionReason: 'deeper_parent_keep',
      decisionMethod: 'deeper_parent_keep',
      uncertain: false,
      deeperParentImplication: deeperParent,
      deeperChildBehavior: deeperChild,
    };
  }
  if (deeperParent === 'switch') {
    return {
      decision: 'TERMINATE',
      decisionReason: 'deeper_parent_switch',
      decisionMethod: 'deeper_parent_switch',
      uncertain: false,
      deeperParentImplication: deeperParent,
      deeperChildBehavior: deeperChild,
    };
  }

  const cont = naturalness.continuationFit;
  const term = naturalness.terminationFit;
  const diff = cont - term;
  if (diff >= TIE_MARGIN_THRESHOLD) {
    return {
      decision: 'REPEAT',
      decisionReason: 'naturalness_continuation_margin',
      decisionMethod: 'naturalness_continuation_margin',
      uncertain: false,
      deeperParentImplication: deeperParent,
      deeperChildBehavior: deeperChild,
    };
  }
  if (term - cont >= TIE_MARGIN_THRESHOLD) {
    return {
      decision: 'TERMINATE',
      decisionReason: 'naturalness_termination_margin',
      decisionMethod: 'naturalness_termination_margin',
      uncertain: false,
      deeperParentImplication: deeperParent,
      deeperChildBehavior: deeperChild,
    };
  }

  const decision: RepeatDecision = cont >= term ? 'REPEAT' : 'TERMINATE';
  return {
    decision,
    decisionReason: 'uncertain_fallback_naturalness',
    decisionMethod: 'uncertain_fallback_naturalness',
    uncertain: true,
    deeperParentImplication: deeperParent,
    deeperChildBehavior: deeperChild,
  };
}

function evaluateCodeContentPatternFlow(options: {
  result: AnalysisResult;
  mainBand: DigitBand;
  subBand: DigitSubBand;
  codeName: string;
  anchorDigit: number;
  virtualMaster?: string;
  sequenceLabel: string;
}): PatternFlowEvaluation {
  const side = options.mainBand;
  const row = buildLegacyCodeContentForCodeName(
    options.result,
    options.mainBand,
    options.codeName,
    [],
  );
  const virtualMaster = options.virtualMaster ?? options.result.digits;
  const live = liveRunAtTail(virtualMaster);
  const path = analyzeRecursivePatternFlow({
    sequence: [...row.gaps],
    sequenceLabel: options.sequenceLabel,
    side,
    currentSub: options.subBand,
    liveRunLength: live.length,
  });
  const leaf = getPatternLayerLeaf(path);
  const dup =
    leaf.tailFlow?.oneDuplicateRelation ??
    classifyOneDuplicateRunRelation(leaf.sequence, live.length);
  const childBehavior: ChildPatternBehavior = dup?.childBehavior ?? 'uncertain';
  const naturalness = computePatternNaturalness(path, live.length);
  const candidateMatchesCurrent =
    Number(virtualMaster.at(-1)) === options.anchorDigit;
  const parentImplication = inferParentBranchImplication(childBehavior, 'digit', {
    candidateMatchesCurrent,
    naturalness,
  });
  const step3Decision = decideStep3RepeatDecision({
    path,
    childBehavior,
    parentImplication,
    naturalness,
    mainBand: options.mainBand,
    subBand: options.subBand,
    liveRunLength: live.length,
    candidateMatchesCurrent,
  });
  const drills = flattenPatternLayers(path)
    .map((l) => l.selectedDrillDown ?? 'leaf')
    .join(' → ');
  return {
    codeName: options.codeName,
    gapCount: row.gaps.length,
    childBehavior,
    naturalness,
    parentImplication,
    deeperParentImplication: step3Decision.deeperParentImplication,
    deeperChildBehavior: step3Decision.deeperChildBehavior,
    recursivePath: path,
    futureShape: futureShapeSignature(path),
    decision: step3Decision.decision,
    decisionReason: step3Decision.decisionReason,
    decisionMethod: step3Decision.decisionMethod,
    uncertain: step3Decision.uncertain,
    label: `${options.codeName} gaps(${row.gaps.length}) → ${drills} | child=${childBehavior} parent=${parentImplication} deeper=${step3Decision.deeperParentImplication} method=${step3Decision.decisionMethod} → ${step3Decision.decision}`,
  };
}

export function evaluateCandidateRepeatByCodeContent(
  baseResult: AnalysisResult,
  masterNo: string,
  mainBand: DigitBand,
  subBand: DigitSubBand,
  candidate: number,
  codeName: string,
): PatternFlowEvaluation {
  const virtualMaster = baseResult.digits + String(candidate);
  const virtualResult = analyzeMasterValue(masterNo, virtualMaster);
  return evaluateCodeContentPatternFlow({
    result: virtualResult,
    mainBand,
    subBand,
    codeName,
    anchorDigit: candidate,
    virtualMaster,
    sequenceLabel: `STEP3 repeat@${codeName} digit=${candidate}`,
  });
}

export function evaluateSiblingPairByCodeContent(
  baseResult: AnalysisResult,
  mainBand: DigitBand,
  subBand: DigitSubBand,
  anchorDigit: number,
  otherDigit: number,
  pairCode: string,
): { evaluation: PatternFlowEvaluation; winner: number } {
  const evaluation = evaluateCodeContentPatternFlow({
    result: baseResult,
    mainBand,
    subBand,
    codeName: pairCode,
    anchorDigit: anchorDigit,
    sequenceLabel: `STEP3 pair@${pairCode} ${anchorDigit}vs${otherDigit}`,
  });

  const winner = evaluation.decision === 'REPEAT' ? anchorDigit : otherDigit;
  return { evaluation, winner };
}

function buildCandidateStub(
  digit: number,
  evalResult: PatternFlowEvaluation,
  virtualChange: string,
): CounterfactualCandidateResult {
  return {
    id: String(digit),
    label: `Master digit ${digit}`,
    virtualAppend: String(digit),
    virtualChange,
    recursivePath: evalResult.recursivePath,
    futureShape: evalResult.futureShape,
    childBehavior: evalResult.childBehavior,
    parentImplication: evalResult.parentImplication,
    naturalness: evalResult.naturalness,
  };
}

function recentOrderInPool(masterDigits: string, pool: readonly number[]): number[] {
  const seen = new Set<number>();
  const order: number[] = [];
  for (let i = masterDigits.length - 1; i >= 0; i -= 1) {
    const d = Number(masterDigits[i]);
    if (!Number.isInteger(d) || d < 0 || d > 9) continue;
    if (!pool.includes(d) || seen.has(d)) continue;
    seen.add(d);
    order.push(d);
  }
  return order;
}

export function selectHumanStyleFinalDigit(options: {
  baseResult: AnalysisResult;
  masterNo: string;
  mainBand: DigitBand;
  subBand: DigitSubBand;
}): HumanStyleFinalDigitResult {
  const { baseResult, masterNo, mainBand, subBand } = options;
  const pool = getDigitsInSubBand(subBand);
  const masterDigits = baseResult.digits;
  const recentOrder = recentOrderInPool(masterDigits, pool);

  const trace: HumanStyleStep3Trace = {
    selectedSubBand: subBand,
    pool,
    recentOrder,
    primaryCandidate: null,
    repeatCode: null,
    repeatEvaluation: null,
    eliminated: [],
    remainingAfterElimination: [],
    pairAnchor: null,
    pairOther: null,
    pairCode: null,
    pairEvaluation: null,
    pairDecision: null,
    finalDigit: pool[0]!,
    method: 'singleton',
  };

  const candidates: CounterfactualCandidateResult[] = [];

  if (pool.length === 1) {
    const only = pool[0]!;
    trace.finalDigit = only;
    trace.method = 'singleton';
    const code = resolveRepeatEvaluationCode(only, mainBand);
    const ev = evaluateCandidateRepeatByCodeContent(
      baseResult,
      masterNo,
      mainBand,
      subBand,
      only,
      code,
    );
    candidates.push(
      buildCandidateStub(only, ev, `singleton ${only} via ${code}`),
    );
    return {
      winnerId: String(only),
      winnerLabel: `Master digit ${only}`,
      finalDigit: only,
      candidates,
      trace,
    };
  }

  let remaining = [...pool];

  if (pool.length >= 3) {
    const primary = findMostRecentDigitInPool(masterDigits, remaining)!;
    trace.primaryCandidate = primary;
    trace.repeatCode = resolveRepeatEvaluationCode(primary, mainBand);
    const repeatEval = evaluateCandidateRepeatByCodeContent(
      baseResult,
      masterNo,
      mainBand,
      subBand,
      primary,
      trace.repeatCode,
    );
    trace.repeatEvaluation = repeatEval;
    candidates.push(
      buildCandidateStub(
        primary,
        repeatEval,
        `repeat eval ${primary} via ${trace.repeatCode}`,
      ),
    );

    if (repeatEval.decision === 'REPEAT') {
      trace.finalDigit = primary;
      trace.method = 'repeat';
      return {
        winnerId: String(primary),
        winnerLabel: `Master digit ${primary}`,
        finalDigit: primary,
        candidates,
        trace,
      };
    }

    trace.eliminated.push(primary);
    remaining = remaining.filter((d) => d !== primary);
    trace.remainingAfterElimination = [...remaining];
  }

  const pairAnchor = findMostRecentDigitInPool(masterDigits, remaining)!;
  const pairOther = remaining.find((d) => d !== pairAnchor)!;
  trace.pairAnchor = pairAnchor;
  trace.pairOther = pairOther;
  trace.pairCode = resolvePairEvaluationCode(pairAnchor, pairOther, mainBand);
  const { evaluation: pairEval, winner } = evaluateSiblingPairByCodeContent(
    baseResult,
    mainBand,
    subBand,
    pairAnchor,
    pairOther,
    trace.pairCode,
  );
  trace.pairEvaluation = pairEval;
  trace.pairDecision = winner;
  trace.finalDigit = winner;
  trace.method = 'pair';

  const anchorEval =
    pairAnchor === winner
      ? pairEval
      : evaluateCandidateRepeatByCodeContent(
          baseResult,
          masterNo,
          mainBand,
          subBand,
          pairAnchor,
          resolveRepeatEvaluationCode(pairAnchor, mainBand),
        );
  const otherEval =
    pairOther === winner
      ? pairEval
      : evaluateCandidateRepeatByCodeContent(
          baseResult,
          masterNo,
          mainBand,
          subBand,
          pairOther,
          resolveRepeatEvaluationCode(pairOther, mainBand),
        );
  candidates.push(
    buildCandidateStub(pairAnchor, anchorEval, `pair anchor ${pairAnchor} via ${trace.pairCode}`),
    buildCandidateStub(pairOther, otherEval, `pair other ${pairOther}`),
  );

  return {
    winnerId: String(winner),
    winnerLabel: `Master digit ${winner}`,
    finalDigit: winner,
    candidates,
    trace,
  };
}

export function formatHumanStyleStep3Trace(trace: HumanStyleStep3Trace): string[] {
  const lines = [
    `STEP3 sequential selection (${getSubBandLabel(trace.selectedSubBand)})`,
    `pool = [${trace.pool.join(',')}]`,
    `recent order: ${trace.recentOrder.join(' → ') || '—'}`,
  ];
  if (trace.primaryCandidate !== null) {
    lines.push(`PRIMARY CANDIDATE = ${trace.primaryCandidate}`);
    lines.push(`repeatCode = ${trace.repeatCode ?? '—'}`);
    if (trace.repeatEvaluation) {
      lines.push(`repeat path: ${trace.repeatEvaluation.label}`);
      lines.push(
        `repeatDecision = ${trace.repeatEvaluation.decision} (${trace.repeatEvaluation.decisionMethod}${trace.repeatEvaluation.uncertain ? ', uncertain' : ''})`,
      );
    }
    if (trace.eliminated.length) {
      lines.push(`${trace.eliminated.join(',')} removed`);
      lines.push(`remaining = [${trace.remainingAfterElimination.join(',')}]`);
    }
  }
  if (trace.pairAnchor !== null && trace.pairOther !== null) {
    lines.push(`pair anchor = ${trace.pairAnchor}, other = ${trace.pairOther}`);
    lines.push(`pairCode = ${trace.pairCode ?? '—'}`);
    if (trace.pairEvaluation) {
      lines.push(`pair path: ${trace.pairEvaluation.label}`);
      lines.push(
        `pair structural: child=${trace.pairEvaluation.childBehavior} parent=${trace.pairEvaluation.parentImplication} → ${trace.pairEvaluation.decision} (${trace.pairEvaluation.decisionMethod})`,
      );
    }
    lines.push(`pairDecision = ${trace.pairDecision ?? '—'}`);
  }
  lines.push(`method = ${trace.method}`);
  lines.push(`FINAL = ${trace.finalDigit}`);
  return lines;
}
