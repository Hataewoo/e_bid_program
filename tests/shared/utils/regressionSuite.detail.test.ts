import { describe, expect, it } from 'vitest';
import { runBuiltInRegressionSuite } from '@/shared/utils/regressionSuite';

const sampleCodes = [
  { id: 1, code: 'C01', type: 'T', description: '', createdAt: '', updatedAt: '' },
];

describe('regressionSuite detail', () => {
  it('lists any failing built-in cases for diagnosis', () => {
    const summary = runBuiltInRegressionSuite(sampleCodes);
    const failures = summary.results.filter((row) => !row.passed);
    if (failures.length > 0) {
      const lines = failures.map(
        (row) => `${row.name} [${row.field}] expected="${row.expected}" actual="${row.actual}"`,
      );
      expect.fail(`Regression failures:\n${lines.join('\n')}`);
    }
    expect(summary.passRate).toBeGreaterThanOrEqual(95);
  });
});
