/**
 * Per-digit prediction score aggregation — combines all signals (no frequency counting).
 */

import type { AnalysisResult, CodeMatchInput } from './analysisEngine';
import type { PatternRecommendPath } from './patternRecommendEngine';
import {
  getDigitBand,
  getDigitSubBand,
  getSubBandMainBand,
  type DigitSubBand,
} from './digitSubBand';
import { wouldFormRepetitivePattern } from './patternRepeatGuard';
import {
  computeLegacyDigitSignals,
  type LegacyDigitSignal,
} from './legacyDigitCodePick';
import { computePatternFlowDigitScores, inferPatternFlowPhaseDirection, type PatternFlowDigitScore } from './patternFlowPick';
import {
  applyPatternStateSignalsToMasterDigitScores,
  computePatternStateSignals,
} from './patternPredictionSignals';
import { DIGIT_PREDICTION_WEIGHTS, CONDITIONAL_GATING } from './digitPredictionWeights';
import {
  computeAnchorConfirmationScore,
  dominantLegacyPhase,
  patternStateConsensus,
} from './digitSignalGating';
import {
  findLastDigitInMainBand,
  findLastDigitInSubBand,
  virtualMasterDigits,
} from './subBandRepeatJudgment';
import { resolveAnchorDigitForSubBand } from './subBandCrossRefinement';
import type { FinalDigitPickMode } from './patternRecommendEngine';

export interface DigitPredictionScore {
  digit: number;
  totalScore: number;
  mainBandScore: number;
  subBandScore: number;
  legacyScore: number;
  patternFlowScore: number;
  patternSignalsScore: number;
  anchorScore: number;
  agreementBonus: number;
  penalty: number;
  penaltyReasons: string[];
  reasons: string[];
  mode: FinalDigitPickMode;
  legacySignal: LegacyDigitSignal | null;
}

export interface DigitScoreLayerOptions {
  mainBand?: boolean;
  subBand?: boolean;
  legacy?: boolean;
  patternFlow?: boolean;
  patternState?: boolean;
  anchor?: boolean;
  agreement?: boolean;
}

export const DEFAULT_DIGIT_SCORE_LAYERS: Required<DigitScoreLayerOptions> = {
  mainBand: true,
  subBand: true,
  legacy: true,
  patternFlow: true,
  patternState: true,
  anchor: true,
  agreement: true,
};

export interface DigitScoreOptions {
  layers?: DigitScoreLayerOptions;
  /** Diagnostic only — reproduce pre-gating scoring for walk-forward comparison */
  skipConditionalGating?: boolean;
}

export interface DigitScoreBreakdown {
  scores: DigitPredictionScore[];
  patternSignalCount: number;
  legacyWouldPick: number | null;
  patternFlowWouldPick: number | null;
  winningDigit: number;
  winningMode: FinalDigitPickMode;
  summaryReason: string;
}

function stableContextTieBreak(master: string, prefix: string, digit: number): number {
  let h = 2166136261;
  const s = `${master}|${prefix}|${digit}`;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function softMainBandScore(digit: number, targetMain: 'low' | 'high'): number {
  const w = DIGIT_PREDICTION_WEIGHTS;
  const band = getDigitBand(digit);
  if (band === targetMain) return w.mainBandMatchBonus;
  return w.mainBandMismatchPenalty;
}

function softSubBandScore(
  digit: number,
  targetSub: DigitSubBand,
  targetMain: 'low' | 'high',
): number {
  const w = DIGIT_PREDICTION_WEIGHTS;
  const sub = getDigitSubBand(digit);
  if (sub === targetSub) return w.subBandMatchBonus;
  const main = getDigitBand(digit);
  if (main === targetMain) return w.sameMainSiblingPenalty;
  return w.oppositeMainPenalty;
}

function resolveAnchorDigit(
  result: AnalysisResult,
  prefix: string,
  subBand: DigitSubBand,
  eligible: readonly number[],
): number | null {
  const context = virtualMasterDigits(result, prefix);
  const mainBand = getSubBandMainBand(subBand);
  return (
    resolveAnchorDigitForSubBand(context, subBand, eligible) ??
    findLastDigitInSubBand(context, subBand) ??
    findLastDigitInMainBand(context, mainBand)
  );
}

function inferModeFromSignals(
  digit: number,
  legacy: LegacyDigitSignal | null,
  patternFlowMode: FinalDigitPickMode | undefined,
  anchor: number | null,
): FinalDigitPickMode {
  if (legacy?.preferredDigit === digit) return legacy.mode;
  if (patternFlowMode) return patternFlowMode;
  if (anchor === digit) return 'repeat';
  return 'pattern';
}

/** Score all digits 0–9 with soft gating (no hard pool filter). */
export function computeDigitPredictionScores(
  path: PatternRecommendPath,
  result: AnalysisResult,
  prefix: string,
  codes: readonly CodeMatchInput[],
  eligibleDigits: readonly number[],
  options?: DigitScoreOptions,
): DigitScoreBreakdown {
  const layers = { ...DEFAULT_DIGIT_SCORE_LAYERS, ...options?.layers };
  const w = DIGIT_PREDICTION_WEIGHTS;
  const targetMain = path.targetMainBand;
  const targetSub = path.targetSubBand;

  const legacySignals = layers.legacy
    ? computeLegacyDigitSignals(result, prefix, targetSub, codes, eligibleDigits)
    : new Map<number, LegacyDigitSignal>();
  const patternFlowScores: Map<number, PatternFlowDigitScore> = layers.patternFlow
    ? computePatternFlowDigitScores(result, prefix, targetSub)
    : new Map();
  const patternStateSignals = layers.patternState
    ? computePatternStateSignals(result, prefix, targetSub)
    : [];
  const patternDigitScores = layers.patternState
    ? applyPatternStateSignalsToMasterDigitScores(patternStateSignals, result, prefix, targetSub)
    : new Map<number, { score: number; reasons: string[] }>();

  const anchor = layers.anchor
    ? resolveAnchorDigit(result, prefix, targetSub, eligibleDigits)
    : null;

  const patternConsensus = patternStateConsensus(patternStateSignals);
  const flowPhaseDirection = layers.patternFlow
    ? inferPatternFlowPhaseDirection(result, prefix, targetSub)
    : null;
  const legacyPhaseDominant = dominantLegacyPhase(legacySignals);
  const useFlowGating =
    !options?.skipConditionalGating && layers.patternFlow && layers.patternState;

  const eligibleSet = new Set(eligibleDigits);
  const scores: DigitPredictionScore[] = [];

  let legacyWouldPick: number | null = null;
  let legacyBest = -Infinity;
  let patternFlowWouldPick: number | null = null;
  let patternFlowBest = -Infinity;

  for (let digit = 0; digit <= 9; digit += 1) {
    const mainBandScore = layers.mainBand ? softMainBandScore(digit, targetMain) : 0;
    const subBandScore = layers.subBand ? softSubBandScore(digit, targetSub, targetMain) : 0;

    const legacySig = legacySignals.get(digit) ?? null;
    let legacyScore = layers.legacy ? (legacySig?.score ?? 0) : 0;
    if (layers.legacy) legacyScore = Math.min(legacyScore, w.legacyAbsoluteCap);

    const pf = patternFlowScores.get(digit);
    const rawPatternFlow = layers.patternFlow
      ? Math.min(pf?.score ?? 0, w.patternFlowMaxPerDigit)
      : 0;

    const ps = patternDigitScores.get(digit);
    const patternSignalsScore = layers.patternState ? (ps?.score ?? 0) : 0;

    const patternFlowScore = rawPatternFlow;

    let anchorScore = 0;
    if (layers.anchor) {
      if (options?.skipConditionalGating) {
        if (anchor !== null && digit === anchor && legacySig?.mode === 'repeat') {
          anchorScore = w.anchorRepeat * (legacySig.confidence ?? 0.5);
        } else if (anchor !== null && digit !== anchor && legacySig?.mode === 'transition') {
          anchorScore = w.anchorTransition * (legacySig.confidence ?? 0.5);
        }
      } else if (layers.patternState) {
        anchorScore = computeAnchorConfirmationScore(
          digit,
          anchor,
          legacySig,
          patternConsensus,
          flowPhaseDirection,
          legacyPhaseDominant,
          w.anchorRepeat,
          w.anchorTransition,
        );
      }
    }

    let agreementBonus = 0;
    if (layers.agreement) {
      const legacySupports = legacySig && legacySig.score > 0;
      const flowAgreesWithPattern =
        !useFlowGating ||
        patternConsensus.phase === null ||
        patternConsensus.confidence < CONDITIONAL_GATING.patternStateConfidentThreshold ||
        flowPhaseDirection === null ||
        flowPhaseDirection === patternConsensus.phase;
      const flowSupports = patternFlowScore > 2 && flowAgreesWithPattern;
      const patternsSupport = patternSignalsScore > 2;
      if (legacySupports && flowSupports && patternsSupport) {
        agreementBonus = w.multiSignalAgreementBonus;
      }
    }

    let penalty = 0;
    const penaltyReasons: string[] = [];
    if (!eligibleSet.has(digit)) {
      penalty += -50;
      penaltyReasons.push('prefix-used digit excluded from pool');
    }
    if (wouldFormRepetitivePattern(prefix, digit)) {
      penalty += w.repetitivePrefixPenalty;
      penaltyReasons.push('repetitive prefix pattern');
    }

    const reasons: string[] = [];
    if (mainBandScore !== 0) reasons.push(`MainBand ${mainBandScore > 0 ? '+' : ''}${mainBandScore}`);
    if (subBandScore !== 0) reasons.push(`SubBand ${subBandScore > 0 ? '+' : ''}${subBandScore}`);
    if (legacyScore > 0) reasons.push(`Legacy +${legacyScore.toFixed(1)}`);
    if (patternFlowScore > 0) reasons.push(`PatternFlow +${patternFlowScore.toFixed(1)}`);
    if (patternSignalsScore > 0) {
      reasons.push(`10Patterns +${patternSignalsScore.toFixed(1)}`);
      if (ps?.reasons.length) reasons.push(ps.reasons.slice(0, 2).join('; '));
    }
    if (anchorScore > 0) reasons.push(`Anchor +${anchorScore.toFixed(1)}`);
    if (agreementBonus > 0) reasons.push(`Agreement +${agreementBonus}`);
    if (penalty < 0) reasons.push(`Penalty ${penalty} (${penaltyReasons.join('; ')})`);

    const totalScore =
      mainBandScore +
      subBandScore +
      legacyScore +
      patternFlowScore +
      patternSignalsScore +
      anchorScore +
      agreementBonus +
      penalty;

    const mode = inferModeFromSignals(digit, legacySig, pf?.mode, anchor);

    scores.push({
      digit,
      totalScore,
      mainBandScore,
      subBandScore,
      legacyScore,
      patternFlowScore,
      patternSignalsScore,
      anchorScore,
      agreementBonus,
      penalty,
      penaltyReasons,
      reasons,
      mode,
      legacySignal: legacySig,
    });

    if (legacySig && legacySig.score > legacyBest) {
      legacyBest = legacySig.score;
      legacyWouldPick = digit;
    }
    if (patternFlowScore > patternFlowBest) {
      patternFlowBest = patternFlowScore;
      patternFlowWouldPick = digit;
    }
  }

  scores.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    const confA =
      a.patternSignalsScore + a.patternFlowScore + (a.legacySignal?.confidence ?? 0);
    const confB =
      b.patternSignalsScore + b.patternFlowScore + (b.legacySignal?.confidence ?? 0);
    if (confB !== confA) return confB - confA;
    return stableContextTieBreak(result.digits, prefix, a.digit) -
      stableContextTieBreak(result.digits, prefix, b.digit);
  });

  const winner = scores[0]!;
  const flowEntry = patternFlowScores.get(winner.digit);
  const flowDetail = flowEntry?.reason ?? winner.reasons.find((r) => r.startsWith('PatternFlow')) ?? '';
  const patternDetail = winner.reasons.find((r) => r.startsWith('10Patterns')) ?? '';
  const summaryReason = [
    `종합 ${winner.totalScore.toFixed(1)}점`,
    flowDetail || patternDetail || winner.reasons.slice(0, 3).join(' · '),
  ]
    .filter(Boolean)
    .join(' · ');

  return {
    scores,
    patternSignalCount: patternStateSignals.length,
    legacyWouldPick,
    patternFlowWouldPick,
    winningDigit: winner.digit,
    winningMode: winner.mode,
    summaryReason,
  };
}

export function formatDigitScoreTrace(score: DigitPredictionScore): string {
  const lines = [
    `digit ${score.digit}`,
    `MainBand ${score.mainBandScore >= 0 ? '+' : ''}${score.mainBandScore}`,
    `SubBand ${score.subBandScore >= 0 ? '+' : ''}${score.subBandScore}`,
    `Legacy +${score.legacyScore.toFixed(1)}`,
    `PatternFlow +${score.patternFlowScore.toFixed(1)}`,
    `10PatternState +${score.patternSignalsScore.toFixed(1)}`,
    `Anchor +${score.anchorScore.toFixed(1)}`,
  ];
  if (score.penalty < 0) {
    const detail = score.penaltyReasons.length ? ` (${score.penaltyReasons.join('; ')})` : '';
    lines.push(`Penalty ${score.penalty}${detail}`);
  }
  if (score.agreementBonus > 0) lines.push(`Agreement +${score.agreementBonus}`);
  lines.push(`Total ${score.totalScore.toFixed(1)}`);
  return lines.join('\n');
}
