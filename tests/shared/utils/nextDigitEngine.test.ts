import { describe, expect, it } from 'vitest';
import { analyzeMasterValue } from '@/shared/utils/analysisEngine';
import {
  appendDigitToInput,
  clampNextDigitTopN,
  countNextDigitsAfterPrefix,
  getDigitBand,
  getOppositeBand,
  parseBidRateInput,
  predictDigitChain,
  predictNextDigitStep,
} from '@/shared/utils/nextDigitEngine';

describe('nextDigitEngine', () => {
  it('parses xx.123 style input', () => {
    const parsed = parseBidRateInput('xx.123');
    expect(parsed.integerPart).toBeNull();
    expect(parsed.decimalPrefix).toBe('123');
    expect(parsed.displayValue).toBe('xx.123');
  });

  it('parses plain digit prefix', () => {
    const parsed = parseBidRateInput('1');
    expect(parsed.decimalPrefix).toBe('1');
  });

  it('classifies digit bands with 5 as pivot', () => {
    expect(getDigitBand(4)).toBe('low');
    expect(getDigitBand(5)).toBeNull();
    expect(getDigitBand(6)).toBe('high');
    expect(getOppositeBand('low')).toBe('high');
    expect(getOppositeBand('high')).toBe('low');
  });

  it('counts next digits after prefix in master', () => {
    const { counts, totalMatches } = countNextDigitsAfterPrefix('121212', '1');
    expect(totalMatches).toBe(3);
    expect(counts.get(2)).toBe(3);
  });

  it('after low digit recommends high band only', () => {
    const result = analyzeMasterValue('00', '1213141516');
    const step = predictNextDigitStep(result, [], '1');

    expect(step).not.toBeNull();
    expect(step!.source).toBe('pattern');
    expect(step!.candidates.every((c) => c.digit > 5)).toBe(true);
    expect(step!.candidates[0]!.digit).toBe(6);
  });

  it('after high digit recommends low band only', () => {
    const result = analyzeMasterValue('00', '6768676867');
    const step = predictNextDigitStep(result, [], '6');

    expect(step).not.toBeNull();
    expect(step!.source).toBe('pattern');
    expect(step!.candidates.every((c) => c.digit < 5)).toBe(true);
  });

  it('uses global high band when prefix has no opposite matches', () => {
    const result = analyzeMasterValue('00', '1212121212');
    const step = predictNextDigitStep(result, [], '1');

    expect(step).not.toBeNull();
    expect(step!.candidates.every((c) => c.digit > 5)).toBe(true);
    expect(step!.candidates[0]!.probability).toBeGreaterThan(0);
  });

  it('breaks ties among equal prefix matches with side and code boosts', () => {
    const result = analyzeMasterValue('00', '1213141516');
    const step = predictNextDigitStep(result, [{
      seq: 1,
      code: '01',
      type: '저점',
      description: '',
      count: 5,
      percent: 50,
      matchKind: 'pattern',
      isTop: true,
    }], '1');

    expect(step).not.toBeNull();
    const probs = step!.candidates.map((c) => c.probability);
    const unique = new Set(probs);
    expect(unique.size).toBeGreaterThan(1);
  });

  it('chains digits alternating bands each step', () => {
    const result = analyzeMasterValue('00', '1616161616');
    const chain = predictDigitChain(result, [], '1');

    expect(chain.nextStep?.candidates.every((c) => c.digit > 5)).toBe(true);
    expect(chain.chainSteps.length).toBeGreaterThan(0);
    expect(chain.suggestedChain.startsWith('1')).toBe(true);
  });

  it('respects custom topN for candidate count', () => {
    const result = analyzeMasterValue('00', '0123456789');
    const step = predictNextDigitStep(result, [], '', 8);

    expect(step).not.toBeNull();
    expect(step!.candidates.length).toBe(8);
  });

  it('clamps topN between 1 and 10', () => {
    expect(clampNextDigitTopN(0)).toBe(1);
    expect(clampNextDigitTopN(15)).toBe(10);
    expect(clampNextDigitTopN(5)).toBe(5);
  });

  it('appendDigitToInput extends decimal input', () => {
    expect(appendDigitToInput('1', 3)).toBe('13');
    expect(appendDigitToInput('xx.12', 3)).toBe('xx.123');
    expect(appendDigitToInput('100.1', 5)).toBe('100.15');
  });
});
