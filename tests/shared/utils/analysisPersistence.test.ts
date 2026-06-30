import { describe, expect, it } from 'vitest';
import { analyzeMasterValue } from '@/shared/utils/analysisEngine';
import {
  buildAnalysisHistoryCreatePayload,
  buildAnalysisSummary,
  buildMasterStatisticsRecord,
} from '@/shared/utils/analysisPersistence';

describe('analysisPersistence', () => {
  it('builds compact analysis summary from result', () => {
    const result = analyzeMasterValue('01', '0011223344');
    const summary = buildAnalysisSummary(result);

    expect(summary.masterNo).toBe('01');
    expect(summary.totalCount).toBe(10);
    expect(summary.runCount).toBeGreaterThan(0);
  });

  it('builds analysis history create payload', () => {
    const result = analyzeMasterValue('02', '01234');
    const payload = buildAnalysisHistoryCreatePayload(result, 'analysis', '120');

    expect(payload.bidNumber).toBe('02');
    expect(payload.status).toBe('completed');
    expect(payload.result).toContain('"source":"analysis"');
    expect(payload.result).toContain('"prediction"');
  });

  it('builds master statistics record for DB', () => {
    const result = analyzeMasterValue('03', '111222');
    const record = buildMasterStatisticsRecord(result, 'statistics');

    expect(record.masterNo).toBe('03');
    expect(record.source).toBe('statistics');
    expect(record.runCount).toBeGreaterThan(0);
  });
});
