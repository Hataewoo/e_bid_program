/**
 * Master digit sequence helpers — source of truth is result.digits (+ optional prefix).
 * Never uses Pattern Code Value (token.value) for digit candidacy.
 */

import type { AnalysisResult } from './analysisEngine';
import { getDigitSubBand, type DigitSubBand } from './digitSubBand';
import { asMasterDigit, type MasterDigit } from './digitTypes';
import { virtualMasterDigits, type SubBandPhase } from './subBandRepeatJudgment';

/** Source: A — virtualMasterDigits(result, prefix) === result.digits + prefix */
export function masterDigitsInSubBandSequence(
  result: AnalysisResult,
  prefix: string,
  subBand: DigitSubBand,
): MasterDigit[] {
  const context = virtualMasterDigits(result, prefix);
  const out: MasterDigit[] = [];
  for (const ch of context) {
    const d = asMasterDigit(Number(ch));
    if (d !== null && getDigitSubBand(d) === subBand) out.push(d);
  }
  return out;
}

export interface MasterDigitEvidence {
  digit: MasterDigit;
  /** Relative weight within sub-band (master-sequence derived only). */
  weight: number;
  evidence: 'repeat-tail' | 'alternation' | 'historical' | 'sub-band-default';
}

/**
 * Per-digit evidence from actual Master sequence within sub-band.
 * PatternState signals apply as multipliers on these weights — never as direct digit picks.
 */
export function masterDigitEvidenceInSubBand(
  phase: SubBandPhase,
  result: AnalysisResult,
  prefix: string,
  subBand: DigitSubBand,
): MasterDigitEvidence[] {
  const seq = masterDigitsInSubBandSequence(result, prefix, subBand);
  const tail = seq.at(-1) ?? null;
  const prev = seq.at(-2) ?? null;
  const evidence = new Map<MasterDigit, MasterDigitEvidence>();

  if (phase === 'repeat' && tail !== null) {
    evidence.set(tail, { digit: tail, weight: 1, evidence: 'repeat-tail' });
    return [...evidence.values()];
  }

  if (tail !== null && prev !== null && prev !== tail) {
    evidence.set(prev, { digit: prev, weight: 1, evidence: 'alternation' });
  }

  for (let i = seq.length - 1; i >= 0; i -= 1) {
    const d = seq[i]!;
    if (d === tail) continue;
    if (!evidence.has(d)) {
      evidence.set(d, { digit: d, weight: 0.55, evidence: 'historical' });
    }
  }

  return [...evidence.values()];
}

/** Flow order for scoring — recent master digits in sub-band first. */
export function flowOrderFromMasterSequence(
  masterSeq: readonly MasterDigit[],
  pool: readonly number[],
  preferRepeatDigit?: number | null,
): number[] {
  const seen = new Set<number>();
  const order: number[] = [];

  if (
    preferRepeatDigit !== null &&
    preferRepeatDigit !== undefined &&
    pool.includes(preferRepeatDigit)
  ) {
    order.push(preferRepeatDigit);
    seen.add(preferRepeatDigit);
  }

  for (let i = masterSeq.length - 1; i >= 0; i -= 1) {
    const d = masterSeq[i]!;
    if (pool.includes(d) && !seen.has(d)) {
      order.push(d);
      seen.add(d);
    }
  }
  for (const d of pool) {
    if (!seen.has(d)) order.push(d);
  }
  return order;
}

/** @deprecated use masterDigitEvidenceInSubBand */
export function masterDigitCandidatesForPhase(
  phase: SubBandPhase,
  result: AnalysisResult,
  prefix: string,
  subBand: DigitSubBand,
): MasterDigit[] {
  return masterDigitEvidenceInSubBand(phase, result, prefix, subBand).map((e) => e.digit);
}
