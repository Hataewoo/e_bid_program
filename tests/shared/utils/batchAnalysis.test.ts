import { describe, expect, it } from 'vitest';
import type { Master } from '@/types/electron';
import { analyzeAllMasterSlots, batchAnalysisToCsv } from '@/shared/utils/batchAnalysis';

describe('batchAnalysis', () => {
  it('analyzes all 100 master slots', () => {
    const masters: Master[] = [
      {
        id: 1,
        masterNo: '01',
        masterValue: '01234',
        memo: null,
        createdAt: '',
        updatedAt: '',
      },
    ];

    const summary = analyzeAllMasterSlots(masters, []);
    expect(summary.totalSlots).toBe(100);
    expect(summary.analyzed).toBe(1);
    expect(summary.empty).toBe(99);
    expect(summary.rows.find((row) => row.masterNo === '01')?.status).toBe('ok');
  });

  it('exports csv with header', () => {
    const summary = analyzeAllMasterSlots([], []);
    const csv = batchAnalysisToCsv(summary);
    expect(csv.split('\n')[0]).toContain('masterNo');
    expect(csv.split('\n').length).toBe(101);
  });
});
