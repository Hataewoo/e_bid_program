import { describe, expect, it } from 'vitest';
import { analyzeMasterValue } from '@/shared/utils/analysisEngine';
import {
  buildDigitFrequency,
  buildLowHighRatioFromResult,
  buildRunCountText,
} from '@/shared/utils/statisticsEngine';

describe('statisticsEngine', () => {
  it('builds digit frequency from master digits', () => {
    const result = analyzeMasterValue('01', '1122334455');
    const frequency = buildDigitFrequency(result.digits);

    expect(frequency.summary.totalDigits).toBe(10);
    expect(frequency.items.find((item) => item.digit === 1)?.count).toBe(2);
    expect(frequency.items.find((item) => item.digit === 5)?.count).toBe(2);
  });

  it('builds low/high ratio from analysis result', () => {
    const result = analyzeMasterValue('02', '01234');
    const ratio = buildLowHighRatioFromResult(result);

    expect(ratio.low).toBe(100);
    expect(ratio.high).toBe(0);
    expect(ratio.dominant).toBe('LOW');
  });

  it('builds run count summary text', () => {
    const result = analyzeMasterValue('03', '111222');
    const text = buildRunCountText(result);

    expect(text).toContain('Total Runs:');
    expect(text).toContain('Max Run:');
  });
});
