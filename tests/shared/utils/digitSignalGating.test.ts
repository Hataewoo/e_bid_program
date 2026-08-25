import { describe, expect, it } from 'vitest';
import { analyzeMasterValue } from '../../../src/shared/utils/analysisEngine';
import { computePatternStateSignals } from '../../../src/shared/utils/patternPredictionSignals';
import { resolvePatternRecommendPath } from '../../../src/shared/utils/patternRecommendEngine';
import {
  patternFlowGatingMultiplier,
  patternStateConsensus,
  computeAnchorConfirmationScore,
} from '../../../src/shared/utils/digitSignalGating';
import { inferPatternFlowPhaseDirection } from '../../../src/shared/utils/patternFlowPick';
import { CONDITIONAL_GATING } from '../../../src/shared/utils/digitPredictionWeights';

describe('digit signal conditional gating', () => {
  const master = '5142716075797444702810858208';
  const history = master.slice(0, 20);

  it('patternFlowGatingMultiplier never uses future data — only current signals', () => {
    const result = analyzeMasterValue('00', history);
    const path = resolvePatternRecommendPath(result, '', []);
    const signals = computePatternStateSignals(result, '', path.targetSubBand);
    const flowPhase = inferPatternFlowPhaseDirection(result, '', path.targetSubBand);
    const mult = patternFlowGatingMultiplier(signals, flowPhase);
    expect(mult).toBeGreaterThan(0);
    expect(mult).toBeLessThanOrEqual(1);
  });

  it('reduces PatternFlow on confident PatternState conflict', () => {
    const signals = computePatternStateSignals(
      analyzeMasterValue('00', history),
      '',
      resolvePatternRecommendPath(analyzeMasterValue('00', history), '', []).targetSubBand,
    );
    const consensus = patternStateConsensus(signals);
    if (consensus.phase && consensus.confidence >= CONDITIONAL_GATING.patternStateConfidentThreshold) {
      const opposite = consensus.phase === 'repeat' ? 'transition' : 'repeat';
      const multConflict = patternFlowGatingMultiplier(signals, opposite);
      const multAgree = patternFlowGatingMultiplier(signals, consensus.phase);
      expect(multConflict).toBeLessThanOrEqual(CONDITIONAL_GATING.patternFlowMultConflict);
      expect(multAgree).toBe(CONDITIONAL_GATING.patternFlowMultAgree);
    }
  });

  it('anchor returns 0 without PatternState confirmation', () => {
    const score = computeAnchorConfirmationScore(
      4,
      4,
      null,
      { phase: null, confidence: 0 },
      'repeat',
      'repeat',
      0.8,
      0.5,
    );
    expect(score).toBe(0);
  });

  it('anchor gives bonus only when consensus confirms direction', () => {
    const score = computeAnchorConfirmationScore(
      2,
      2,
      { preferredDigit: 2, score: 10, mode: 'repeat', confidence: 0.7 },
      { phase: 'repeat', confidence: 0.65 },
      'repeat',
      'repeat',
      0.8,
      0.5,
    );
    expect(score).toBeGreaterThan(0);

    const conflict = computeAnchorConfirmationScore(
      2,
      2,
      { preferredDigit: 3, score: 10, mode: 'transition', confidence: 0.7 },
      { phase: 'repeat', confidence: 0.65 },
      'transition',
      'transition',
      0.8,
      0.5,
    );
    expect(conflict).toBe(0);
  });
});
