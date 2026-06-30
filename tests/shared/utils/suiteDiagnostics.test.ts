import { describe, expect, it } from 'vitest';
import {
  buildSuiteDiagnosisReport,
  classifyFailureCategory,
  formatSuiteDiagnosisMarkdown,
  mergeSuiteSummaries,
} from '@/shared/utils/suiteDiagnostics';
import type { SuiteRunSummary } from '@/shared/utils/verificationSuite';

describe('suiteDiagnostics', () => {
  it('classifies failure fields', () => {
    expect(classifyFailureCategory('step2')).toBe('STEP2');
    expect(classifyFailureCategory('statistics')).toBe('STATISTICS');
    expect(classifyFailureCategory('error')).toBe('ERROR');
  });

  it('builds diagnosis report from failing summary', () => {
    const summary: SuiteRunSummary = {
      total: 2,
      passed: 1,
      failed: 1,
      passRate: 50,
      results: [
        {
          id: '1',
          name: 'Case A',
          field: 'step2',
          expected: '012',
          actual: '013',
          passed: false,
          source: 'verification',
        },
        {
          id: '2',
          name: 'Case B',
          field: 'step3',
          expected: '5',
          actual: '5',
          passed: true,
          source: 'verification',
        },
      ],
    };

    const report = buildSuiteDiagnosisReport(summary);
    expect(report.failed).toBe(1);
    expect(report.byCategory.STEP2).toBe(1);
    expect(report.meetsTarget).toBe(false);
    expect(report.failures[0]?.hint).toContain('extractLowPart');
  });

  it('renders markdown report', () => {
    const report = buildSuiteDiagnosisReport({
      total: 1,
      passed: 1,
      failed: 0,
      passRate: 100,
      results: [],
    });
    const md = formatSuiteDiagnosisMarkdown(report);
    expect(md).toContain('# Test Suite Failure Diagnosis Report');
    expect(md).toContain('✅ PASS');
  });

  it('merges suite summaries', () => {
    const merged = mergeSuiteSummaries([
      { total: 10, passed: 10, failed: 0, passRate: 100, results: [] },
      { total: 4, passed: 3, failed: 1, passRate: 75, results: [] },
    ]);
    expect(merged.total).toBe(14);
    expect(merged.passed).toBe(13);
  });
});
