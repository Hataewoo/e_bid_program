import { describe, expect, it } from 'vitest';
import { analyzeMasterValue } from '@/shared/utils/analysisEngine';
import {
  appendDigitToInput,
  clampNextDigitTopN,
  countNextDigitsAfterPrefix,
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

  it('counts next digits after prefix in master', () => {
    const { counts, totalMatches } = countNextDigitsAfterPrefix('121212', '1');
    expect(totalMatches).toBe(3);
    expect(counts.get(2)).toBe(3);
  });

  it('recommends top candidates after typing 1', () => {
    const result = analyzeMasterValue('00', '1213141516');
    const step = predictNextDigitStep(result, [], '1');

    expect(step).not.toBeNull();
    expect(step!.prefix).toBe('1');
    expect(step!.candidates.length).toBe(4);
    expect(step!.candidates[0]!.digit).toBe(2);
    expect(step!.candidates[0]!.matchCount).toBeGreaterThan(0);
  });

  it('differentiates probabilities using frequency and global signals', () => {
    const result = analyzeMasterValue('00', '1212121212');
    const step = predictNextDigitStep(result, [], '1');

    expect(step).not.toBeNull();
    const top = step!.candidates[0]!;
    const second = step!.candidates[1]!;
    expect(top.digit).toBe(2);
    expect(top.probability).toBeGreaterThan(50);
    expect(top.probability).toBeGreaterThan(second.probability);
  });

  it('breaks ties among equal prefix matches with side and code boosts', () => {
    const result = analyzeMasterValue('00', '1213141516');
    const step = predictNextDigitStep(result, [{ code: '01', type: '저점', description: '', count: 5, percent: 50 }], '1');

    expect(step).not.toBeNull();
    const probs = step!.candidates.map((c) => c.probability);
    const unique = new Set(probs);
    expect(unique.size).toBeGreaterThan(1);
  });

  it('chains 4 digits by re-comparing prefix each step', () => {
    const result = analyzeMasterValue('00', '123412341234');
    const chain = predictDigitChain(result, [], '1');

    expect(chain.nextStep?.candidates[0]?.digit).toBe(2);
    expect(chain.chainSteps.length).toBe(4);
    expect(chain.suggestedChain.length).toBe(5);
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
