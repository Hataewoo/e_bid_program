import { describe, expect, it } from 'vitest';
import type { FrequencyItem } from '@/features/statistics/types/frequency.types';
import {
  barHeightPercent,
  findModeItem,
  isLowDigit,
  maxFrequencyCount,
} from '@/features/statistics/utils/chart-metrics';

const sampleItems: FrequencyItem[] = Array.from({ length: 10 }, (_, digit) => ({
  digit,
  count: digit === 2 ? 5 : digit === 7 ? 3 : 0,
  ratio: digit === 2 ? 62.5 : digit === 7 ? 37.5 : 0,
}));

describe('chart-metrics', () => {
  it('classifies low digits 0-4', () => {
    expect(isLowDigit(0)).toBe(true);
    expect(isLowDigit(4)).toBe(true);
    expect(isLowDigit(5)).toBe(false);
  });

  it('computes bar height with minimum percent for non-zero counts', () => {
    expect(barHeightPercent(0, 10)).toBe(0);
    expect(barHeightPercent(1, 10)).toBeGreaterThanOrEqual(4);
    expect(barHeightPercent(10, 10)).toBe(100);
  });

  it('finds mode digit and max count', () => {
    expect(findModeItem(sampleItems)?.digit).toBe(2);
    expect(maxFrequencyCount(sampleItems)).toBe(5);
  });
});
