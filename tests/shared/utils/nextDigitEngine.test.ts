import { describe, expect, it } from 'vitest';
import { analyzeMasterValue } from '@/shared/utils/analysisEngine';
import {
  appendDigitToInput,
  parseBidRateInput,
  predictFromCodeValuePatterns,
} from '@/shared/utils/nextDigitEngine';

describe('nextDigitEngine', () => {
  it('parses xx.123 style input', () => {
    const parsed = parseBidRateInput('xx.123');
    expect(parsed.integerPart).toBeNull();
    expect(parsed.decimalPrefix).toBe('123');
    expect(parsed.displayValue).toBe('xx.123');
  });

  it('predicts S pattern segment for empty prefix', () => {
    const result = analyzeMasterValue('00', '01234');
    const pred = predictFromCodeValuePatterns(result, '');

    expect(pred).not.toBeNull();
    expect(pred!.segment.nextSegmentCandidates.length).toBeGreaterThan(0);
  });

  it('appendDigitToInput extends decimal input', () => {
    expect(appendDigitToInput('1', 3)).toBe('13');
    expect(appendDigitToInput('xx.12', 3)).toBe('xx.123');
  });
});
