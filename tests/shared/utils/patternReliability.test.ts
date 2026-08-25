import { describe, expect, it } from 'vitest';
import { analyzeMasterValue } from '../../../src/shared/utils/analysisEngine';
import {
  computePatternStateSignals,
  applyPatternStateSignalsToMasterDigitScores,
} from '../../../src/shared/utils/patternPredictionSignals';
import { resolvePatternRecommendPath } from '../../../src/shared/utils/patternRecommendEngine';
import {
  PATTERN_RELIABILITY,
  PATTERN_REDUNDANCY_CLUSTERS,
  DIGIT_PREDICTION_WEIGHTS,
} from '../../../src/shared/utils/digitPredictionWeights';

describe('pattern reliability production weights', () => {
  it('PATTERN_RELIABILITY ranks 3,4+α highest and 3이상/5이상 near zero', () => {
    expect(PATTERN_RELIABILITY.plusAlpha_3_2).toBeGreaterThan(PATTERN_RELIABILITY.commaAlpha_2_3!);
    expect(PATTERN_RELIABILITY.threeOrMore).toBeLessThan(0.1);
    expect(PATTERN_RELIABILITY.fiveOrMore).toBeLessThan(0.1);
  });

  it('threeOrMore does not always predict repeat on typical tail', () => {
    const master = '5142716075797444702810858208';
    const result = analyzeMasterValue('00', master.slice(0, 24));
    const path = resolvePatternRecommendPath(result, '', []);
    const signals = computePatternStateSignals(result, '', path.targetSubBand);
    const threeOrMore = signals.find((s) => s.patternField === 'threeOrMore');
    if (threeOrMore) {
      const repeatCount = signals.filter(
        (s) => s.patternField === 'threeOrMore' && s.predictedPhase === 'repeat',
      ).length;
      const transitionCount = signals.filter(
        (s) => s.patternField === 'threeOrMore' && s.predictedPhase === 'transition',
      ).length;
      expect(repeatCount + transitionCount).toBeLessThanOrEqual(1);
      expect(threeOrMore.confidence).toBeLessThanOrEqual(0.25);
    }
  });

  it('cluster diminishing reduces stacked between-marker scores', () => {
    const master = '5142716075797444702810858208';
    const result = analyzeMasterValue('00', master.slice(0, 20));
    const path = resolvePatternRecommendPath(result, '', []);
    const signals = computePatternStateSignals(result, '', path.targetSubBand);
    const betweenCount = signals.filter((s) =>
      (PATTERN_REDUNDANCY_CLUSTERS.betweenMarker as readonly string[]).includes(s.patternField),
    ).length;
    if (betweenCount >= 2) {
      const scores = applyPatternStateSignalsToMasterDigitScores(
        signals,
        result,
        '',
        path.targetSubBand,
      );
      const maxScore = Math.max(...[...scores.values()].map((v) => v.score));
      const naiveMax = betweenCount * DIGIT_PREDICTION_WEIGHTS.patternSignal;
      expect(maxScore).toBeLessThan(naiveMax * 0.85);
    }
  });
});
