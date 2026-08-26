import { describe, expect, it } from 'vitest';
import { analyzeMasterValue } from '../../../src/shared/utils/analysisEngine';
import {
  evaluateSiblingPairByCodeContent,
  findMostRecentDigitInPool,
  resolvePairEvaluationCode,
  resolveRepeatEvaluationCode,
  selectHumanStyleFinalDigit,
} from '../../../src/shared/utils/humanStyleFinalDigitSelector';
import {
  HUMAN_DIAGNOSTIC_FIXTURE_MASTER,
  HUMAN_FIXTURE_EXPECTED,
  runHumanStyleV2,
} from '../../../src/shared/utils/humanStyleCounterfactualPredictor';

describe('humanStyleFinalDigitSelector', () => {
  it('findMostRecentDigitInPool scans from tail, not master last digit', () => {
    const digits = '123403897';
    expect(findMostRecentDigitInPool(digits, [2, 3, 4])).toBe(3);
    expect(findMostRecentDigitInPool(digits, [0, 1])).toBe(0);
  });

  it('resolveRepeatEvaluationCode uses object-digit catalog mapping', () => {
    expect(resolveRepeatEvaluationCode(4, 'low')).toBe('423');
    expect(resolveRepeatEvaluationCode(3, 'low')).toBe('324');
  });

  it('resolvePairEvaluationCode uses object/base mapping', () => {
    expect(resolvePairEvaluationCode(3, 2, 'low')).toBe('32');
    expect(resolvePairEvaluationCode(9, 8, 'high')).toBe('98');
    expect(resolvePairEvaluationCode(0, 1, 'low')).toBe('01');
  });

  it('STEP3 uses sequential trace not simultaneous pool scoring', () => {
    const v2 = runHumanStyleV2(HUMAN_DIAGNOSTIC_FIXTURE_MASTER);
    expect(v2.step3?.step3Trace).toBeDefined();
    expect(v2.step3!.step3Trace!.method).toMatch(/repeat|pair|singleton/);
    expect(v2.step3!.step3Trace!.recentOrder.length).toBeGreaterThan(0);
    expect(v2.step3!.winnerId).toBe(String(v2.finalDigit));
  });

  it('recent order is evaluation order only — primary is pool latest not tail', () => {
    const result = analyzeMasterValue('00', HUMAN_DIAGNOSTIC_FIXTURE_MASTER);
    const v2 = runHumanStyleV2(HUMAN_DIAGNOSTIC_FIXTURE_MASTER);
    const trace = v2.step3!.step3Trace!;
    if (trace.pool.length >= 3 && trace.primaryCandidate !== null) {
      expect(trace.primaryCandidate).toBe(
        findMostRecentDigitInPool(result.digits, trace.pool),
      );
    }
  });

  it('selectHumanStyleFinalDigit for 2-digit pool uses pair directly', () => {
    const result = analyzeMasterValue('00', '001122');
    const pick = selectHumanStyleFinalDigit({
      baseResult: result,
      masterNo: '00',
      mainBand: 'low',
      subBand: 'lowLow',
    });
    expect(pick.trace.method).toBe('pair');
    expect(pick.trace.pairCode).toBeTruthy();
    expect(pick.finalDigit).toBeGreaterThanOrEqual(0);
    expect(pick.finalDigit).toBeLessThanOrEqual(1);
  });

  it('child terminates + parent keep does not map to TERMINATE (CASE C)', () => {
    const result = analyzeMasterValue('00', HUMAN_DIAGNOSTIC_FIXTURE_MASTER);
    const { evaluation } = evaluateSiblingPairByCodeContent(
      result,
      'low',
      'lowLow',
      0,
      1,
      '01',
    );
    expect(evaluation.childBehavior).toBe('terminates');
    expect(evaluation.parentImplication).toBe('keep');
    expect(evaluation.decision).toBe('REPEAT');
    expect(evaluation.decisionMethod).toBe('structural_parent_keep');
  });

  it('human fixture STEP3 restores parent-consistent repeat via pair 01', () => {
    const v2 = runHumanStyleV2(HUMAN_DIAGNOSTIC_FIXTURE_MASTER);
    expect(v2.step1.winnerId).toBe(HUMAN_FIXTURE_EXPECTED.step1);
    expect(v2.step2?.winnerId).toBe(HUMAN_FIXTURE_EXPECTED.step2);
    expect(v2.finalDigit).toBe(HUMAN_FIXTURE_EXPECTED.final);
    expect(v2.humanFixtureMatch).toBe(true);
    const pairEval = v2.step3!.step3Trace!.pairEvaluation!;
    expect(pairEval.childBehavior).toBe('terminates');
    expect(pairEval.parentImplication).toBe('keep');
    expect(pairEval.decision).toBe('REPEAT');
  });
});
