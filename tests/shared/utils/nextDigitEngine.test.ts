import { describe, expect, it } from 'vitest';
import { analyzeMasterValue } from '@/shared/utils/analysisEngine';
import { resolvePatternRecommendPath } from '@/shared/utils/patternRecommendEngine';
import {
  appendDigitToInput,
  clampNextDigitTopN,
  countNextDigitsAfterPrefix,
  getDigitBand,
  parseBidRateInput,
  pickModeForComboIndex,
  pickChainStepDigit,
  pickTopCandidates,
  predictDigitChain,
  predictNextDigitStep,
  stageForComboIndex,
  PATTERN_PICK_STAGE_FULL,
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
    const path = resolvePatternRecommendPath(result, '1');
    const step = predictNextDigitStep(result, [], '1', 4, PATTERN_PICK_STAGE_FULL);

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

  it('re-evaluates all four sub-bands when prefix grows after a high-low pick', () => {
    const result = analyzeMasterValue('00', '5616125612');
    const step2 = resolvePatternRecommendPath(result, '6');

    expect(step2.subBandReasons.some((r) => r.includes('②') || r.includes('세부'))).toBe(true);
  });

  it('uses after-prefix S run for chain steps after the first digit', () => {
    const result = analyzeMasterValue('00', '5616125612');
    const chain = predictDigitChain(result, [], '');

    expect(chain.chainSteps.length).toBeGreaterThan(1);
    const secondMain = chain.chainSteps[1]!.hierarchy.mainBandReasons.join(' ');
    expect(secondMain.includes('run')).toBe(true);
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

  it('pickTopCandidates deprioritizes repetitive digits', () => {
    const scores = { 5: 40, 6: 38, 7: 22 };
    const withPrefix = pickTopCandidates(scores, 3, [5, 6, 7], '16');
    expect(withPrefix[0]!.digit).not.toBe(6);
  });

  it('primary candidate exposes repeat or transition pick mode', () => {
    const result = analyzeMasterValue('00', '5566778899');
    const step = predictNextDigitStep(result, [], '', 4, PATTERN_PICK_STAGE_FULL);
    expect(step).not.toBeNull();
    const top = step!.candidates[0]!;
    expect(['repeat', 'transition', 'pattern']).toContain(top.pickMode);
    expect(top.patternScore).toBeGreaterThan(0);
  });

  it('pickChainStepDigit avoids consecutive same digit', () => {
    const candidates = [
      { digit: 6, patternScore: 40, pickMode: 'repeat' as const, pickReason: '' },
      { digit: 5, patternScore: 35, pickMode: 'transition' as const, pickReason: '' },
      { digit: 7, patternScore: 25, pickMode: 'pattern' as const, pickReason: '' },
    ];
    expect(pickChainStepDigit(candidates, '16')!.digit).toBe(5);
  });

  it('chain steps are not all highLow on high-dominant master', () => {
    const result = analyzeMasterValue('00', '5566778899');
    const chain = predictDigitChain(result, [], '');

    expect(chain.chainSteps).toHaveLength(4);
    const subBands = chain.chainSteps.map((s) => s.hierarchy.subBandLabel);
    const highLowOnly = subBands.every((l) => l.includes('5~7') || l.includes('5-7'));
    expect(highLowOnly).toBe(false);
  });

  it('does not build 6666 combo on long master with many high 6 tokens', () => {
    const master = ('5676565656'.repeat(120)).slice(0, 1000);
    const result = analyzeMasterValue('00', master);
    const chain = predictDigitChain(result, [], '1');

    expect(chain.recommendedCombo).not.toBe('6666');
    expect(/^6{4}$/.test(chain.recommendedCombo)).toBe(false);
  });
});
