/**
 * ③ 세분화 digit — STEP2/STEP3 코드명 「내용」 기반 repeat/transition
 * Legacy는 prediction signal — 최종 결정은 digitCandidateScoring에서 통합.
 */

import type { AnalysisResult, CodeMatchInput, DigitClass } from './analysisEngine';
import { filterDigitsByClass } from './analysisEngine';
import {
  buildLegacyCodeContentRow,
  type LegacyCodeContentRow,
} from './legacyCodeContentEngine';
import { getLegacyStepCodeDefinition } from '../fixtures/legacy-step-code-catalog';
import {
  dominantPhaseFromCodeFlow,
  formatCodeFlowVotes,
  resolvePrimaryCodeForDigit,
  scoreAnchorDigitCodeFlow,
} from './legacyCodeFlowAnalysis';
import {
  getDigitSubBand,
  getSubBandLabel,
  getDigitsInSubBand,
  type DigitBand,
  type DigitSubBand,
} from './digitSubBand';
import {
  findLastDigitInMainBand,
  findLastDigitInSubBand,
  virtualMasterDigits,
} from './subBandRepeatJudgment';
import { resolveAnchorDigitForSubBand } from './subBandCrossRefinement';
import { wouldFormRepetitivePattern } from './patternRepeatGuard';
import type { PatternFlowPickMode, PatternFlowPickResult } from './patternFlowPick';
import {
  computePatternFlowDigitScores,
  pickDigitByPatternFlow,
} from './patternFlowPick';
import { DIGIT_PREDICTION_WEIGHTS } from './digitPredictionWeights';

export interface LegacyDigitSignal {
  preferredDigit: number;
  mode: PatternFlowPickMode;
  score: number;
  confidence: number;
  reason: string;
}

export function resolveLegacyCodeForLastDigit(lastDigit: number, mainBand: DigitBand): string {
  return resolvePrimaryCodeForDigit(lastDigit, mainBand);
}

function resolveCodeInput(
  codeStr: string,
  dbCode: CodeMatchInput | undefined,
  mainBand: DigitBand,
): CodeMatchInput {
  const catalog = getLegacyStepCodeDefinition(codeStr, mainBand);
  return {
    id: dbCode?.id ?? 0,
    code: codeStr,
    type: dbCode?.type?.trim() || catalog?.type || '',
    description: dbCode?.description?.trim() || catalog?.description || '',
  };
}

export function buildLegacyCodeContentForLastDigit(
  result: AnalysisResult,
  mainBand: DigitBand,
  lastDigit: number,
  codes: readonly CodeMatchInput[],
): { codeName: string; row: LegacyCodeContentRow } {
  const codeName = resolveLegacyCodeForLastDigit(lastDigit, mainBand);
  const side: DigitClass = mainBand === 'low' ? 'low' : 'high';
  const pointValues = filterDigitsByClass(result.digits, side);
  const codeByKey = new Map(codes.map((c) => [c.code, c]));
  const input = resolveCodeInput(codeName, codeByKey.get(codeName), mainBand);
  const row = buildLegacyCodeContentRow(pointValues, input, mainBand);
  return { codeName, row };
}

function resolveAnchorInSubBand(
  result: AnalysisResult,
  prefix: string,
  subBand: DigitSubBand,
  pool: readonly number[],
): number | null {
  const mainBand = subBand === 'lowLow' || subBand === 'lowHigh' ? 'low' : 'high';
  const context = virtualMasterDigits(result, prefix);
  return (
    resolveAnchorDigitForSubBand(context, subBand, pool) ??
    findLastDigitInSubBand(context, subBand) ??
    findLastDigitInMainBand(context, mainBand)
  );
}

/**
 * Legacy code content → per-digit signal scores (not a single pick).
 * Transition uses pattern-flow scores within sub-band, not pool.find order.
 */
export function computeLegacyDigitSignals(
  result: AnalysisResult,
  prefix: string,
  subBand: DigitSubBand,
  codes: readonly CodeMatchInput[],
  eligibleDigits: readonly number[],
): Map<number, LegacyDigitSignal> {
  const out = new Map<number, LegacyDigitSignal>();
  const w = DIGIT_PREDICTION_WEIGHTS;
  const subPool = getDigitsInSubBand(subBand);
  const anchor = resolveAnchorInSubBand(result, prefix, subBand, subPool);

  if (anchor === null) return out;

  const mainBand = subBand === 'lowLow' || subBand === 'lowHigh' ? 'low' : 'high';
  const currentSub = getDigitSubBand(anchor);
  if (!currentSub) return out;

  const flowScore = scoreAnchorDigitCodeFlow(
    result,
    mainBand,
    anchor,
    currentSub,
    codes,
    resolvePrimaryCodeForDigit(anchor, mainBand),
  );
  if (flowScore.votes.length === 0) return out;

  const phase = dominantPhaseFromCodeFlow(flowScore);
  const totalW = flowScore.repeatWeight + flowScore.transitionWeight;
  const confidence = totalW > 0
    ? Math.max(flowScore.repeatWeight, flowScore.transitionWeight) / totalW
    : 0.5;
  const codeSummary = flowScore.consultedCodes.join('+');
  const voteSummary = formatCodeFlowVotes(flowScore.votes);
  const baseReason = `[${codeSummary}] ${voteSummary}`;

  if (phase === 'repeat' && !wouldFormRepetitivePattern(prefix, anchor)) {
    const score = confidence * w.legacy;
    out.set(anchor, {
      preferredDigit: anchor,
      mode: 'repeat',
      score,
      confidence,
      reason: `Legacy ${baseReason} · digit ${anchor} 유지`,
    });
    return out;
  }

  const transitionCandidates = eligibleDigits.filter(
    (d) => subPool.includes(d) && d !== anchor && !wouldFormRepetitivePattern(prefix, d),
  );
  const flowScores = computePatternFlowDigitScores(result, prefix, subBand);
  let bestDigit: number | null = null;
  let bestFlow = -Infinity;

  for (const digit of transitionCandidates) {
    const fs = flowScores.get(digit)?.score ?? 0;
    if (fs > bestFlow) {
      bestFlow = fs;
      bestDigit = digit;
    }
  }

  if (bestDigit === null && transitionCandidates.length > 0) {
    bestDigit = [...transitionCandidates].sort((a, b) => {
      const fa = flowScores.get(a)?.score ?? 0;
      const fb = flowScores.get(b)?.score ?? 0;
      return fb - fa;
    })[0]!;
  }

  if (bestDigit !== null) {
    const score = confidence * w.legacy * (0.85 + (bestFlow > 0 ? 0.15 : 0));
    out.set(bestDigit, {
      preferredDigit: bestDigit,
      mode: 'transition',
      score,
      confidence,
      reason: `Legacy ${baseReason} · digit ${bestDigit} 전환`,
    });
  }

  return out;
}

/** @deprecated signal-only — returns highest legacy signal digit if any */
export function pickDigitByLegacyCodeContent(
  pool: readonly number[],
  result: AnalysisResult,
  prefix: string,
  subBand: DigitSubBand,
  codes: readonly CodeMatchInput[],
): PatternFlowPickResult | null {
  const signals = computeLegacyDigitSignals(result, prefix, subBand, codes, pool);
  if (signals.size === 0) return null;

  let best: LegacyDigitSignal | null = null;
  for (const sig of signals.values()) {
    if (!best || sig.score > best.score) best = sig;
  }
  if (!best) return null;

  return {
    digit: best.preferredDigit,
    mode: best.mode,
    reason: best.reason,
  };
}

/** Unified scoring — combines legacy signal max + pattern flow (no early return). */
export function pickDigitWithLegacyCodeOrFlow(
  pool: readonly number[],
  result: AnalysisResult,
  prefix: string,
  subBand: DigitSubBand,
  codes: readonly CodeMatchInput[],
): PatternFlowPickResult {
  const legacySignals = computeLegacyDigitSignals(result, prefix, subBand, codes, pool);
  const flowScores = computePatternFlowDigitScores(result, prefix, subBand);

  let bestDigit = -1;
  let bestScore = -Infinity;
  let bestMode: PatternFlowPickMode = 'pattern';
  let bestReason = '';

  for (const digit of pool) {
    if (wouldFormRepetitivePattern(prefix, digit)) continue;
    const legacy = legacySignals.get(digit)?.score ?? 0;
    const flow = flowScores.get(digit)?.score ?? 0;
    const combined = legacy + flow;
    if (combined > bestScore) {
      bestScore = combined;
      bestDigit = digit;
      bestMode = legacySignals.get(digit)?.mode ?? flowScores.get(digit)?.mode ?? 'pattern';
      bestReason =
        legacySignals.get(digit)?.reason ??
        flowScores.get(digit)?.reason ??
        `통합 ${combined.toFixed(1)}`;
    }
  }

  if (bestDigit >= 0) {
    return { digit: bestDigit, mode: bestMode, reason: bestReason };
  }

  return pickDigitByPatternFlow(pool, result, prefix, subBand);
}

export function getSubBandLabelForPick(sub: DigitSubBand): string {
  return getSubBandLabel(sub);
}
