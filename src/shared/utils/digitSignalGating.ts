/**
 * Runtime conditional gating for PatternFlow and Anchor.
 * Uses history-derived signals only — never future actual state.
 */

import type { PatternStateSignal } from './patternPredictionSignals';
import type { LegacyDigitSignal } from './legacyDigitCodePick';
import { CONDITIONAL_GATING } from './digitPredictionWeights';

export interface PatternStateConsensus {
  phase: 'repeat' | 'transition' | null;
  confidence: number;
}

export function patternStateConsensus(
  signals: readonly PatternStateSignal[],
): PatternStateConsensus {
  if (signals.length === 0) return { phase: null, confidence: 0 };

  let repeatWeight = 0;
  let transitionWeight = 0;
  for (const s of signals) {
    if (s.predictedPhase === 'repeat') repeatWeight += s.confidence;
    else transitionWeight += s.confidence;
  }
  const total = repeatWeight + transitionWeight;
  if (total <= 0) return { phase: null, confidence: 0 };

  const phase: 'repeat' | 'transition' =
    repeatWeight >= transitionWeight ? 'repeat' : 'transition';
  return {
    phase,
    confidence: Math.max(repeatWeight, transitionWeight) / total,
  };
}

function bandSwitchConsensus(signals: readonly PatternStateSignal[]): boolean {
  const switchSigs = signals.filter((s) => s.bandBehavior === 'switch');
  if (switchSigs.length < 2) return false;
  const avgConf =
    switchSigs.reduce((sum, s) => sum + s.confidence, 0) / switchSigs.length;
  return avgConf >= CONDITIONAL_GATING.bandSwitchConfThreshold;
}

/**
 * Per-digit PatternFlow multiplier — dampen only when this digit's flow mode
 * opposes confident PatternState (avoids global stack penalty on agreeing digits).
 */
export function patternFlowDigitGatingMultiplier(
  flowMode: 'repeat' | 'transition' | 'pattern' | undefined,
  signals: readonly PatternStateSignal[],
  flowPhase: 'repeat' | 'transition' | null,
  consensus: PatternStateConsensus,
  patternSignalsScore = 0,
  rawPatternFlow = 0,
): number {
  const globalMult = patternFlowGatingMultiplier(signals, flowPhase);
  if (globalMult >= 1 || rawPatternFlow <= 0) return 1;
  if (patternSignalsScore > 0 && rawPatternFlow <= patternSignalsScore) return 1;
  if (rawPatternFlow <= patternSignalsScore * 1.15) return 1;
  if (!flowMode || flowMode === 'pattern') return 1;
  if (consensus.phase === null || consensus.confidence < 0.6) return 1;

  const opposes =
    (consensus.phase === 'repeat' && flowMode === 'transition') ||
    (consensus.phase === 'transition' && flowMode === 'repeat');
  return opposes ? globalMult : 1;
}

/** Global PatternFlow phase relationship multiplier (history-only). */
export function patternFlowGatingMultiplier(
  signals: readonly PatternStateSignal[],
  flowPhase: 'repeat' | 'transition' | null,
): number {
  if (flowPhase === null) return CONDITIONAL_GATING.patternFlowMultAgree;

  const g = CONDITIONAL_GATING;
  const consensus = patternStateConsensus(signals);

  let mult: number = g.patternFlowMultAgree;

  if (consensus.phase === null || consensus.confidence < g.patternStateUncertainThreshold) {
    mult = g.patternFlowMultUncertain;
  } else if (consensus.phase === flowPhase) {
    mult = g.patternFlowMultAgree;
  } else if (consensus.confidence >= 0.6) {
    mult = g.patternFlowMultConflict;
  } else {
    mult = g.patternFlowMultUncertain;
  }

  if (bandSwitchConsensus(signals) && flowPhase === 'repeat') {
    mult = Math.min(mult, g.patternFlowMultSwitchRepeat);
  }

  return mult;
}

export function dominantLegacyPhase(
  legacySignals: ReadonlyMap<number, LegacyDigitSignal>,
): 'repeat' | 'transition' | null {
  let best: LegacyDigitSignal | null = null;
  for (const sig of legacySignals.values()) {
    if (!best || sig.score > best.score) best = sig;
  }
  if (!best) return null;
  const mode = best.mode;
  return mode === 'repeat' || mode === 'transition' ? mode : null;
}

/**
 * Anchor: confirmation when PatternState confident; legacy-only when uncertain.
 * Zero (never negative) when confident PatternState conflicts with anchor direction.
 */
export function computeAnchorConfirmationScore(
  digit: number,
  anchor: number | null,
  legacySig: LegacyDigitSignal | null,
  consensus: PatternStateConsensus,
  flowPhase: 'repeat' | 'transition' | null,
  legacyPhase: 'repeat' | 'transition' | null,
  anchorRepeatWeight: number,
  anchorTransitionWeight: number,
): number {
  if (anchor === null) return 0;

  const g = CONDITIONAL_GATING;
  const anchorRepeatDigit = digit === anchor;
  const anchorTransitionDigit = digit !== anchor;

  const legacyRepeat =
    legacySig?.mode === 'repeat' && anchorRepeatDigit;
  const legacyTransition =
    legacySig?.mode === 'transition' && anchorTransitionDigit;

  if (consensus.phase !== null && consensus.confidence >= g.patternStateConfidentThreshold) {
    if (consensus.phase === 'repeat' && !anchorRepeatDigit) return 0;
    if (consensus.phase === 'transition' && !anchorTransitionDigit) return 0;

    const legacyAgrees =
      legacyPhase !== null && legacyPhase === consensus.phase;
    const flowAgrees = flowPhase !== null && flowPhase === consensus.phase;
    if (!legacyAgrees && !flowAgrees) return 0;

    const conf = Math.min(
      consensus.confidence,
      legacySig?.confidence ?? consensus.confidence,
    );
    if (consensus.phase === 'repeat' && anchorRepeatDigit) {
      return anchorRepeatWeight * conf;
    }
    if (consensus.phase === 'transition' && anchorTransitionDigit) {
      return anchorTransitionWeight * conf;
    }
    return 0;
  }

  if (legacyRepeat) {
    return anchorRepeatWeight * (legacySig?.confidence ?? 0.5);
  }
  if (legacyTransition) {
    return anchorTransitionWeight * (legacySig?.confidence ?? 0.5);
  }
  return 0;
}
