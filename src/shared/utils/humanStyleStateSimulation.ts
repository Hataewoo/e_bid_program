/**
 * Human-style V2 state-level counterfactual simulation.
 * STEP1/STEP2 only — no MasterDigit discrimination.
 * NOT Production V1.
 */

import type { AnalysisResult } from './analysisEngine';
import {
  buildPointValueTokens,
  filterPointValuesToSubBand,
  getSidePointValues,
} from './pointValuesCodeFlow';
import type { DigitBand, DigitSubBand } from './digitSubBand';
import { trailingValueRun } from './humanStylePatternCore';

export type StateTransitionKind = 'continuation' | 'switch';

export interface MainBandStateSimulation {
  candidateBand: DigitBand;
  side: DigitBand;
  sequence: number[];
  liveRunLength: number;
  stateKind: StateTransitionKind;
  virtualChange: string;
}

export interface SubBandStateSimulation {
  candidateSub: DigitSubBand;
  sequence: number[];
  liveRunLength: number;
  stateKind: StateTransitionKind;
  virtualChange: string;
}

function extendTrailingRun(sequence: readonly number[], currentRunLength: number): number[] {
  const seq = [...sequence];
  if (seq.length === 0) return [currentRunLength + 1];
  seq[seq.length - 1] = currentRunLength + 1;
  return seq;
}

function appendNewRun(sequence: readonly number[]): number[] {
  return [...sequence, 1];
}

/**
 * Extend the active MainBand run on S (lowRunLengths or highRunLengths).
 * Semantically equivalent to one more digit in the same band class.
 */
export function simulateMainBandContinuation(
  result: AnalysisResult,
  liveSide: DigitBand,
  liveRunLength: number,
): MainBandStateSimulation {
  const sequence =
    liveSide === 'low' ? [...result.lowRunLengths] : [...result.highRunLengths];
  const nextSeq = extendTrailingRun(sequence, liveRunLength);
  return {
    candidateBand: liveSide,
    side: liveSide,
    sequence: nextSeq,
    liveRunLength: liveRunLength + 1,
    stateKind: 'continuation',
    virtualChange: `${liveSide.toUpperCase()} continuation: S run ${liveRunLength}→${liveRunLength + 1} [${sequence.join(',')} → ${nextSeq.join(',')}]`,
  };
}

/**
 * Terminate current MainBand run; start a new run in the opposite band (length 1).
 */
export function simulateMainBandSwitch(
  result: AnalysisResult,
  liveSide: DigitBand,
  liveRunLength: number,
  targetBand: DigitBand,
): MainBandStateSimulation {
  const sequence =
    targetBand === 'low' ? [...result.lowRunLengths] : [...result.highRunLengths];
  const nextSeq = appendNewRun(sequence);
  return {
    candidateBand: targetBand,
    side: targetBand,
    sequence: nextSeq,
    liveRunLength: 1,
    stateKind: 'switch',
    virtualChange: `${liveSide.toUpperCase()} run ends at ${liveRunLength}; ${targetBand.toUpperCase()} switch start → [${sequence.join(',')} → ${nextSeq.join(',')}]`,
  };
}

/**
 * STEP1 state counterfactual for one MainBand hypothesis (LOW or HIGH).
 */
export function simulateMainBandState(
  result: AnalysisResult,
  liveSide: DigitBand,
  liveRunLength: number,
  candidateId: 'LOW' | 'HIGH',
): MainBandStateSimulation {
  const candidateBand: DigitBand = candidateId === 'LOW' ? 'low' : 'high';
  if (liveSide === candidateBand) {
    return simulateMainBandContinuation(result, liveSide, liveRunLength);
  }
  return simulateMainBandSwitch(result, liveSide, liveRunLength, candidateBand);
}

function sPrimeForSubBand(
  result: AnalysisResult,
  side: DigitBand,
  sub: DigitSubBand,
  prefix: string,
): number[] {
  const filtered = filterPointValuesToSubBand(
    getSidePointValues(result, prefix, side),
    sub,
  );
  return buildPointValueTokens(filtered).map((t) => t.value);
}

/**
 * Current S′ before candidate state apply (STEP2 tie baseline).
 */
export function getSubBandBaselineSequence(
  result: AnalysisResult,
  side: DigitBand,
  sub: DigitSubBand,
  prefix = '',
): number[] {
  return sPrimeForSubBand(result, side, sub, prefix);
}

/**
 * Extend active SubBand run on S′.
 */
export function simulateSubBandContinuation(
  result: AnalysisResult,
  side: DigitBand,
  sub: DigitSubBand,
  prefix: string,
  liveRunLength: number,
): SubBandStateSimulation {
  const base = sPrimeForSubBand(result, side, sub, prefix);
  const nextSeq = extendTrailingRun(base, liveRunLength);
  return {
    candidateSub: sub,
    sequence: nextSeq,
    liveRunLength: liveRunLength + 1,
    stateKind: 'continuation',
    virtualChange: `${sub} S′ continuation: run ${liveRunLength}→${liveRunLength + 1} [${base.join(',')} → ${nextSeq.join(',')}]`,
  };
}

/**
 * Terminate current SubBand run; start new run in target SubBand on S′.
 */
export function simulateSubBandSwitch(
  result: AnalysisResult,
  side: DigitBand,
  currentSub: DigitSubBand,
  targetSub: DigitSubBand,
  prefix: string,
  liveRunLength: number,
): SubBandStateSimulation {
  const base = sPrimeForSubBand(result, side, targetSub, prefix);
  const nextSeq = appendNewRun(base);
  return {
    candidateSub: targetSub,
    sequence: nextSeq,
    liveRunLength: 1,
    stateKind: 'switch',
    virtualChange: `${currentSub} S′ ends at ${liveRunLength}; ${targetSub} switch → [${base.join(',')} → ${nextSeq.join(',')}]`,
  };
}

/**
 * STEP2 state counterfactual for one SubBand hypothesis.
 */
export function simulateSubBandState(
  result: AnalysisResult,
  side: DigitBand,
  currentSub: DigitSubBand,
  candidateSub: DigitSubBand,
  prefix: string,
): SubBandStateSimulation {
  const base = sPrimeForSubBand(result, side, currentSub, prefix);
  const liveRunLength = trailingValueRun(base) || 1;
  if (currentSub === candidateSub) {
    return simulateSubBandContinuation(result, side, candidateSub, prefix, liveRunLength);
  }
  return simulateSubBandSwitch(result, side, currentSub, candidateSub, prefix, liveRunLength);
}
