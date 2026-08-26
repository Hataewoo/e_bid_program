import { describe, expect, it } from 'vitest';
import {
  assessCeilingFutureShape,
  computePatternNaturalness,
} from '../../../src/shared/utils/humanStylePatternCore';
import {
  HUMAN_DIAGNOSTIC_FIXTURE_MASTER,
  HUMAN_FIXTURE_EXPECTED,
  runHumanStyleV2,
  TIE_MARGIN_THRESHOLD,
} from '../../../src/shared/utils/humanStyleCounterfactualPredictor';
import { analyzeMasterValue } from '../../../src/shared/utils/analysisEngine';
import { simulateMainBandState } from '../../../src/shared/utils/humanStyleStateSimulation';

describe('humanStyleStateSimulation', () => {
  it('simulateMainBandState picks continuation vs switch by candidate band', () => {
    const result = analyzeMasterValue('00', '11222');
    const low = simulateMainBandState(result, 'low', 1, 'LOW');
    const high = simulateMainBandState(result, 'low', 1, 'HIGH');
    expect(low.stateKind).toBe('continuation');
    expect(high.stateKind).toBe('switch');
  });
});

describe('humanStyleTieResolution', () => {
  it('uses deeper discrimination when primary margin below threshold', () => {
    const v2 = runHumanStyleV2(HUMAN_DIAGNOSTIC_FIXTURE_MASTER);
    expect(v2.step1.tieResolution).toBeDefined();
    expect(v2.step1.tieResolution!.margin).toBeLessThan(TIE_MARGIN_THRESHOLD);
    expect(v2.step1.tieResolution!.deeperDrillUsed).toBe(true);
    expect(v2.step1.candidates.every((c) => c.tieEvidence?.deeper)).toBe(true);
  });

  it('computeFutureShapeDelta compares baseline vs after without frequency count', () => {
    const v2 = runHumanStyleV2(HUMAN_DIAGNOSTIC_FIXTURE_MASTER);
    const low = v2.step1.candidates.find((c) => c.id === 'LOW')!;
    expect(low.tieEvidence!.futureShapeDelta.label).toBeTruthy();
    expect(typeof low.tieEvidence!.futureShapeDelta.deltaScore).toBe('number');
  });
});

describe('humanStyleCounterfactualPredictor V2 state counterfactual', () => {
  it('STEP1 compares LOW vs HIGH state only', () => {
    const v2 = runHumanStyleV2(HUMAN_DIAGNOSTIC_FIXTURE_MASTER);
    expect(v2.step1.candidates).toHaveLength(2);
    expect(v2.step1.candidates.every((c) => c.stateKind)).toBe(true);
    expect(v2.step1.candidates.every((c) => !('digitVariants' in c))).toBe(true);
  });

  it('STEP2 has tieResolution trace', () => {
    const v2 = runHumanStyleV2(HUMAN_DIAGNOSTIC_FIXTURE_MASTER);
    expect(v2.step2!.tieResolution).toBeDefined();
  });

  it('STEP3 uses sequential selection within selected subBand pool', () => {
    const v2 = runHumanStyleV2(HUMAN_DIAGNOSTIC_FIXTURE_MASTER);
    expect(v2.step3!.step3Trace).toBeDefined();
    const poolLen =
      v2.step2!.winnerId === 'LOW_LOW' || v2.step2!.winnerId === 'HIGH_HIGH' ? 2 : 3;
    expect(v2.step3!.step3Trace!.pool).toHaveLength(poolLen);
    expect(v2.step3!.step3Trace!.method).toMatch(/repeat|pair|singleton/);
  });

  it('reports human fixture without forcing', () => {
    const v2 = runHumanStyleV2(HUMAN_DIAGNOSTIC_FIXTURE_MASTER);
    expect(v2.step1.tieResolution!.resolutionMethod).toBeTruthy();
    if (v2.humanFixtureMatch) {
      expect(v2.step1.winnerId).toBe(HUMAN_FIXTURE_EXPECTED.step1);
      expect(v2.finalDigit).toBe(HUMAN_FIXTURE_EXPECTED.final);
    }
  });
});

describe('patternNaturalness', () => {
  it('at_hint_ceiling is not fixed terminationFit 0.85', () => {
    const dup = {
      expectedHint: 4,
      activeRun: 4,
      relation: 'at_hint_ceiling' as const,
      childBehavior: 'terminates' as const,
    };
    const path = {
      depth: 0,
      sequenceLabel: 'leaf',
      sequence: [1, 1, 1, 1, 1],
      patternSummary: {},
      selectedDrillDown: null,
      drillDownReason: 'leaf',
      informativenessScore: 0.5,
      child: null,
      tailFlow: {
        phase: 'transition' as const,
        label: 'ceiling',
        repeatWeight: 0,
        transitionWeight: 2,
        oneDuplicateRelation: dup,
      },
    };
    const n = computePatternNaturalness(path, 4);
    expect(n.terminationFit).not.toBe(0.85);
    expect(assessCeilingFutureShape(path, dup, 'terminates').terminatesAtCeiling).toBe(true);
  });
});
