import { describe, expect, it } from 'vitest';
import { analyzeMasterValue } from '@/shared/utils/analysisEngine';
import {
  PATTERN_PICK_STAGE_FULL,
  resolvePatternRecommendationPath,
} from '@/shared/utils/codeValueFlowEngine';
import {
  appendDigitToInput,
  clampNextDigitTopN,
  countNextDigitsAfterPrefix,
  getDigitBand,
  parseBidRateInput,
  pickModeForComboIndex,
  predictDigitChain,
  predictNextDigitStep,
  stageForComboIndex,
} from '@/shared/utils/nextDigitEngine';

describe('nextDigitEngine', () => {
  it('parses xx.123 style input', () => {
    const parsed = parseBidRateInput('xx.123');
    expect(parsed.integerPart).toBeNull();
    expect(parsed.decimalPrefix).toBe('123');
    expect(parsed.displayValue).toBe('xx.123');
  });

  it('classifies digit bands', () => {
    expect(getDigitBand(4)).toBe('low');
    expect(getDigitBand(5)).toBe('high');
    expect(getDigitBand(6)).toBe('high');
  });

  it('counts next digits after prefix in master (legacy helper)', () => {
    const { counts, totalMatches } = countNextDigitsAfterPrefix('121212', '1');
    expect(totalMatches).toBe(3);
    expect(counts.get(2)).toBe(3);
  });

  it('every step uses full path: main band + sub-band + master digits', () => {
    const result = analyzeMasterValue('00', '1213141516');
    const path = resolvePatternRecommendationPath(result, '1', PATTERN_PICK_STAGE_FULL);
    const step = predictNextDigitStep(result, [], '1', 4, PATTERN_PICK_STAGE_FULL);

    expect(path.stage).toBe('full');
    expect(path.candidatePool.length).toBeLessThanOrEqual(5);
    expect(step?.stage).toBe('full');
    expect(step!.hierarchy.mainBandReasons.length).toBeGreaterThan(0);
    expect(step!.hierarchy.subBandReasons.length).toBeGreaterThan(0);
    expect(step!.hierarchy.allowedDigits.length).toBeLessThanOrEqual(5);
  });

  it('all combo indices use full stage', () => {
    expect(stageForComboIndex(0)).toBe('full');
    expect(stageForComboIndex(1)).toBe('full');
    expect(pickModeForComboIndex(3)).toBe('full');
  });

  it('builds 4-digit combo re-evaluating full path each step', () => {
    const result = analyzeMasterValue('00', '5566778899');
    const chain = predictDigitChain(result, [], '');

    expect(chain.recommendedCombo).toHaveLength(4);
    expect(chain.chainSteps).toHaveLength(4);
    expect(chain.chainSteps.every((s) => s.stage === 'full')).toBe(true);
    expect(chain.chainSteps.every((s) => s.hierarchy.subBandReasons.length > 0)).toBe(true);
  });

  it('re-evaluates main and sub band when prefix grows', () => {
    const result = analyzeMasterValue('00', '1616161616');
    const chain = predictDigitChain(result, [], '1');

    expect(chain.nextStep?.stage).toBe('full');
    expect(chain.recommendedCombo.length).toBe(4);
  });

  it('respects custom topN within sub-band pool', () => {
    const result = analyzeMasterValue('00', '0123456789');
    const step = predictNextDigitStep(result, [], '', 8, PATTERN_PICK_STAGE_FULL);

    expect(step).not.toBeNull();
    expect(step!.candidates.length).toBeLessThanOrEqual(8);
    expect(step!.candidates.length).toBeGreaterThan(0);
  });

  it('clamps topN between 1 and 10', () => {
    expect(clampNextDigitTopN(0)).toBe(1);
    expect(clampNextDigitTopN(99)).toBe(10);
  });

  it('appendDigitToInput extends decimal input', () => {
    expect(appendDigitToInput('xx.12', 3)).toBe('xx.123');
  });
});
