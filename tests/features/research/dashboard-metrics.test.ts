import { describe, expect, it } from 'vitest';
import {
  buildRecentFailRows,
  computeVerificationPassStats,
  trendChartEntries,
} from '@/features/research/utils/dashboard-metrics';
import type { Verification } from '@/types/electron';

const baseVerification = (overrides: Partial<Verification>): Verification => ({
  id: 1,
  experimentId: null,
  hypothesisId: null,
  name: 'case',
  inputData: '{}',
  expectedResult: '1',
  actualResult: '2',
  passed: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  ...overrides,
});

describe('dashboard-metrics', () => {
  it('computeVerificationPassStats counts pass/fail/pending', () => {
    const stats = computeVerificationPassStats([
      baseVerification({ id: 1, passed: true }),
      baseVerification({ id: 2, passed: false }),
      baseVerification({ id: 3, passed: null }),
    ]);
    expect(stats).toEqual({
      evaluated: 2,
      passed: 1,
      failed: 1,
      pending: 1,
      passRate: 50,
    });
  });

  it('buildRecentFailRows merges verification and suite failures', () => {
    const rows = buildRecentFailRows(
      [baseVerification({ id: 1, name: 'V1' })],
      [
        {
          id: 's1',
          name: 'S1',
          field: 'step2',
          expected: 'a',
          actual: 'b',
          passed: false,
          source: 'verification',
        },
      ],
      5,
    );
    expect(rows).toHaveLength(2);
    expect(rows.some((r) => r.source === 'verification')).toBe(true);
    expect(rows.some((r) => r.source === 'suite')).toBe(true);
  });

  it('trendChartEntries keeps last N points in order', () => {
    const history = Array.from({ length: 20 }, (_, i) => ({
      id: String(i),
      runAt: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`,
      kind: 'full' as const,
      total: 10,
      passed: 9,
      failed: 1,
      passRate: 90,
    }));
    const sliced = trendChartEntries(history, 5);
    expect(sliced).toHaveLength(5);
    expect(sliced[0].id).toBe('15');
  });
});
