import { describe, expect, it } from 'vitest';
import { analyzeMasterValue, buildCodeValueStats } from '@/shared/utils/analysisEngine';
import {
  appendDigitToInput,
  clampNextDigitTopN,
  parseBidRateInput,
  predictDigitChain,
  predictNextDigitStep,
} from '@/shared/utils/nextDigitEngine';

const CODES = [
  { id: 1, code: '01', type: '저점', description: '저점,저점' },
  { id: 2, code: '02', type: '저점', description: '저점,고점' },
  { id: 3, code: '04', type: '저점', description: '고점,고점' },
  { id: 4, code: '23', type: '고점', description: '고점,고점' },
];

describe('nextDigitEngine', () => {
  it('parses xx.123 style input', () => {
    const parsed = parseBidRateInput('xx.123');
    expect(parsed.integerPart).toBeNull();
    expect(parsed.decimalPrefix).toBe('123');
    expect(parsed.displayValue).toBe('xx.123');
  });

  it('uses code profile for empty input on block master', () => {
    const result = analyzeMasterValue('00', '01234');
    const stats = buildCodeValueStats(result, CODES);
    const step = predictNextDigitStep(result, stats, '');

    expect(step).not.toBeNull();
    expect(step!.source).toBe('pattern');
    expect(step!.candidates[0]?.digit).toBeLessThanOrEqual(4);
  });

  it('uses pattern sequence for alternating master', () => {
    const result = analyzeMasterValue('00', '1819281938');
    const stats = buildCodeValueStats(result, CODES);
    const step = predictNextDigitStep(result, stats, '');

    expect(step).not.toBeNull();
    expect(step!.codeProfile?.profile.patternMatch?.sequence).toEqual(['low', 'high']);
    expect(step!.candidates[0]?.digit).toBeLessThanOrEqual(4);
  });

  it('returns single candidate by default', () => {
    const result = analyzeMasterValue('00', '123456');
    const stats = buildCodeValueStats(result, CODES);
    const step = predictNextDigitStep(result, stats, '');

    expect(step!.candidates).toHaveLength(1);
  });

  it('builds four-step chain', () => {
    const result = analyzeMasterValue('00', '123456');
    const stats = buildCodeValueStats(result, CODES);
    const chain = predictDigitChain(result, stats, '');

    expect(chain.chainSteps).toHaveLength(4);
  });

  it('clamps topN between 1 and 10', () => {
    expect(clampNextDigitTopN(0)).toBe(1);
    expect(clampNextDigitTopN(15)).toBe(10);
  });

  it('appendDigitToInput extends decimal input', () => {
    expect(appendDigitToInput('1', 3)).toBe('13');
    expect(appendDigitToInput('xx.12', 3)).toBe('xx.123');
  });
});
