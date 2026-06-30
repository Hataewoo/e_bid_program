import { describe, expect, it } from 'vitest';
import {
  BUILTIN_REGRESSION_CASES,
  runBuiltInRegressionSuite,
  runRegressionCaseJsonMatch,
} from '@/shared/utils/regressionSuite';

const sampleCodes = [
  { id: 1, code: 'C01', type: 'T', description: '', createdAt: '', updatedAt: '' },
];

describe('regressionSuite', () => {
  it('loads built-in regression cases', () => {
    expect(BUILTIN_REGRESSION_CASES.length).toBeGreaterThanOrEqual(10);
  });

  it('runs built-in suite with high pass rate', () => {
    const summary = runBuiltInRegressionSuite(sampleCodes);
    expect(summary.total).toBeGreaterThan(0);
    expect(summary.passRate).toBeGreaterThanOrEqual(95);
  });

  it('matches step2/step3 for digits 0-9 case', () => {
    const testCase = BUILTIN_REGRESSION_CASES.find((row) => row.name.includes('0-9'));
    expect(testCase).toBeDefined();
    expect(runRegressionCaseJsonMatch(testCase!.input, testCase!.expected, sampleCodes)).toBe(true);
  });
});
