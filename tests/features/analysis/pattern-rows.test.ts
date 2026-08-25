import { describe, expect, it } from 'vitest';
import {
  parseLegacyPatternContent,
  patternModalFromLegacyRow,
} from '@/features/analysis/types/pattern-rows';

describe('pattern-rows legacy helpers', () => {
  it('parseLegacyPatternContent splits comma values', () => {
    expect(parseLegacyPatternContent('1, 2, 3')).toEqual([1, 2, 3]);
    expect(parseLegacyPatternContent('-')).toEqual([]);
    expect(parseLegacyPatternContent('')).toEqual([]);
  });

  it('patternModalFromLegacyRow maps legacy label and side', () => {
    const modal = patternModalFromLegacyRow('low', '2,3+α', '1,2,1');
    expect(modal).toEqual({
      side: 'low',
      code: '2, 3+α',
      values: [1, 2, 1],
      valueKind: 'length',
    });
  });

  it('returns null when content is empty', () => {
    expect(patternModalFromLegacyRow('high', '1 중복', '')).toBeNull();
  });
});
