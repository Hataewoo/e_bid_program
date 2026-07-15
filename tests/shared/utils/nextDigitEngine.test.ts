import { describe, expect, it } from 'vitest';
import { analyzeMasterValue } from '@/shared/utils/analysisEngine';
import {
  appendDigitToInput,
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

  it('chains 4 digits by re-comparing prefix each step', () => {
    const result = analyzeMasterValue('00', '123412341234');
    const chain = predictDigitChain(result, [], '1');

    expect(chain.nextStep?.candidates[0]?.digit).toBe(2);
    expect(chain.chainSteps.length).toBe(4);
    expect(chain.suggestedChain.length).toBe(5);
    expect(chain.suggestedChain.startsWith('1')).toBe(true);
  });

  it('appendDigitToInput extends decimal input', () => {
    expect(appendDigitToInput('1', 3)).toBe('13');
    expect(appendDigitToInput('xx.12', 3)).toBe('xx.123');
    expect(appendDigitToInput('100.1', 5)).toBe('100.15');
  });
});
