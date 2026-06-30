import { describe, expect, it } from 'vitest';
import { extractLowPart, extractHighPart } from '@/shared/utils/digitSequence';
import { analyzeMasterValue } from '@/shared/utils/analysisEngine';

describe('digitSequence', () => {
  it('extracts low and high parts in order', () => {
    expect(extractLowPart('0123456789')).toBe('01234');
    expect(extractHighPart('0123456789')).toBe('56789');
  });

  it('matches analysis engine low/high counts', () => {
    const digits = '00112233445566778899';
    const result = analyzeMasterValue('01', digits);
    expect(extractLowPart(digits).length).toBe(result.lowCount);
    expect(extractHighPart(digits).length).toBe(result.highCount);
  });
});
