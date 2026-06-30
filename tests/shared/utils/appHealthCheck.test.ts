import { describe, expect, it } from 'vitest';
import { runAppHealthCheck } from '@/shared/utils/appHealthCheck';

const sampleCodes = [
  { id: 1, code: 'C01', type: 'T', description: '', createdAt: '', updatedAt: '' },
];

describe('appHealthCheck', () => {
  it('passes when regression suite meets threshold', () => {
    const report = runAppHealthCheck(sampleCodes);
    expect(report.items.length).toBeGreaterThan(0);
    expect(report.passRate).toBeGreaterThanOrEqual(95);
    expect(report.ok).toBe(true);
  });

  it('includes engine regression, step2/step3, and dual-run items', () => {
    const report = runAppHealthCheck(sampleCodes);
    const ids = report.items.map((item) => item.id);
    expect(ids).toContain('engine-regression');
    expect(ids).toContain('step2-step3');
    expect(ids).toContain('engine-dual-run');
    const stepItem = report.items.find((item) => item.id === 'step2-step3');
    expect(stepItem?.ok).toBe(true);
    expect(stepItem?.detail).toMatch(/\d+\/\d+ passed/);
    const dualItem = report.items.find((item) => item.id === 'engine-dual-run');
    expect(dualItem?.ok).toBe(true);
  });
});
