import { describe, expect, it } from 'vitest';
import { runRegressionDualRunCheck } from '@/shared/utils/analysisDualRun';

const sampleCodes = [
  { id: 1, code: 'C01', type: 'T', description: '', createdAt: '', updatedAt: '' },
];

describe('analysisDualRun', () => {
  it('legacy direct path matches pipeline for all builtin regression cases', () => {
    const report = runRegressionDualRunCheck(sampleCodes);
    expect(report.ok).toBe(true);
    expect(report.mismatches).toHaveLength(0);
    expect(report.totalCases).toBeGreaterThanOrEqual(10);
  });
});
