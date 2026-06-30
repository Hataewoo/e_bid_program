import type { SuiteCaseResult, SuiteRunSummary } from './verificationSuite';

export type SuiteFailureCategory =
  'STEP2' | 'STEP3' | 'STATISTICS' | 'PREDICTION' | 'OTHER' | 'ERROR';

export interface SuiteFailureRow {
  id: string;
  name: string;
  field: string;
  category: SuiteFailureCategory;
  expected: string;
  actual: string;
  hint: string;
}

export interface SuiteDiagnosisReport {
  generatedAt: string;
  passRate: number;
  total: number;
  passed: number;
  failed: number;
  meetsTarget: boolean;
  targetPassRate: number;
  byCategory: Record<SuiteFailureCategory, number>;
  byField: Record<string, number>;
  failures: SuiteFailureRow[];
}

const TARGET_PASS_RATE = 95;

const FIELD_HINTS: Record<string, string> = {
  step2:
    'STEP2 = masterValue에서 0–4 digit만 순서 유지 추출 (digitSequence.extractLowPart). 포맷 문자(쉼표/공백) 제거 후 비교.',
  step3: 'STEP3 = masterValue에서 5–9 digit만 순서 유지 추출 (digitSequence.extractHighPart).',
  statistics:
    'Statistics = statisticsEngine.buildStatisticsSummaryText — 자릿수/Low%/High%/최빈값 형식. calcRate는 소수 첫째 자리.',
  prediction: 'Prediction은 휴리스틱 — Phase 1 gate 대상 아님. legacy 관측 전 FAIL은 정상.',
  error: '입력 파싱 또는 masterValue 누락 — inputData JSON 확인.',
  all: 'expectedResult JSON 키(step2/step3/statistics)별 partial compare — engineVerification.evaluateVerificationMatch',
};

export function classifyFailureCategory(field: string): SuiteFailureCategory {
  const key = field.toLowerCase();
  if (key === 'step2') return 'STEP2';
  if (key === 'step3') return 'STEP3';
  if (key === 'statistics' || key === 'stat') return 'STATISTICS';
  if (key === 'prediction' || key === 'pred') return 'PREDICTION';
  if (key === 'error') return 'ERROR';
  return 'OTHER';
}

export function failureHint(field: string, expected: string, actual: string): string {
  const base = FIELD_HINTS[field.toLowerCase()] ?? FIELD_HINTS.all ?? '';
  if (actual.includes('masterValue')) {
    return `${base} masterValue가 비어 있거나 TBD placeholder입니다.`.trim();
  }
  if (field === 'statistics' && expected.includes('%') && actual.includes('%')) {
    return `${base} Low/High % rounding(정수 vs 소수 1자리) 불일치 가능.`.trim();
  }
  if ((field === 'step2' || field === 'step3') && expected === '' && actual !== '') {
    return `${base} legacy는 빈 출력인데 엔진이 digit를 추출함 — 입력 정규화 또는 분류 규칙 확인.`.trim();
  }
  return base;
}

export function buildSuiteDiagnosisReport(
  summary: SuiteRunSummary,
  targetPassRate = TARGET_PASS_RATE,
): SuiteDiagnosisReport {
  const failedRows = summary.results.filter((row) => !row.passed);
  const byCategory: Record<SuiteFailureCategory, number> = {
    STEP2: 0,
    STEP3: 0,
    STATISTICS: 0,
    PREDICTION: 0,
    OTHER: 0,
    ERROR: 0,
  };
  const byField: Record<string, number> = {};

  const failures: SuiteFailureRow[] = failedRows.map((row) => {
    const category = classifyFailureCategory(row.field);
    byCategory[category] += 1;
    byField[row.field] = (byField[row.field] ?? 0) + 1;
    return {
      id: row.id,
      name: row.name,
      field: row.field,
      category,
      expected: row.expected,
      actual: row.actual,
      hint: failureHint(row.field, row.expected, row.actual),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    passRate: summary.passRate,
    total: summary.total,
    passed: summary.passed,
    failed: summary.failed,
    meetsTarget: summary.passRate >= targetPassRate,
    targetPassRate,
    byCategory,
    byField,
    failures,
  };
}

export function formatSuiteDiagnosisMarkdown(report: SuiteDiagnosisReport): string {
  const lines: string[] = [
    '# Test Suite Failure Diagnosis Report',
    '',
    `| Item | Value |`,
    `|------|-------|`,
    `| Generated | ${report.generatedAt} |`,
    `| Total | ${report.total} |`,
    `| Passed | ${report.passed} |`,
    `| Failed | ${report.failed} |`,
    `| Pass Rate | **${report.passRate}%** |`,
    `| Target | ≥ ${report.targetPassRate}% |`,
    `| Gate | ${report.meetsTarget ? '✅ PASS' : '❌ FAIL'} |`,
    '',
    '## Failures by Category',
    '',
  ];

  for (const [category, count] of Object.entries(report.byCategory)) {
    if (count > 0) lines.push(`- **${category}**: ${count}`);
  }
  if (report.failures.length === 0) {
    lines.push('- *(none)*');
  }

  lines.push('', '## Failures by Field', '');
  const fieldEntries = Object.entries(report.byField).sort((a, b) => b[1] - a[1]);
  if (fieldEntries.length === 0) {
    lines.push('- *(none)*');
  } else {
    for (const [field, count] of fieldEntries) {
      lines.push(`- \`${field}\`: ${count}`);
    }
  }

  lines.push('', '## Failure Details', '');
  if (report.failures.length === 0) {
    lines.push('All checks passed.');
  } else {
    report.failures.forEach((row, index) => {
      lines.push(
        `### ${index + 1}. ${row.name} — ${row.field} (${row.category})`,
        '',
        '```',
        `expected: ${row.expected}`,
        `actual:   ${row.actual}`,
        '```',
        '',
        `> ${row.hint}`,
        '',
      );
    });
  }

  lines.push('## Recommended Actions', '');
  if (report.byCategory.STEP2 > 0 || report.byCategory.STEP3 > 0) {
    lines.push('- Review `src/shared/utils/digitSequence.ts` (extractLowPart / extractHighPart)');
    lines.push('- Confirm legacy input normalization matches `analysisEngine.extractDigits`');
  }
  if (report.byCategory.STATISTICS > 0) {
    lines.push('- Review `src/shared/utils/statisticsEngine.ts` → buildStatisticsSummaryText');
    lines.push('- Compare calcRate rounding vs legacy integer % display');
  }
  if (report.failures.length === 0) {
    lines.push('- No engine changes required for current catalog.');
  }

  return `${lines.join('\n')}\n`;
}

export function summarizeSuiteFailures(results: SuiteCaseResult[]) {
  const failed = results.filter((row) => !row.passed);
  const byField: Record<string, number> = {};
  for (const row of failed) {
    byField[row.field] = (byField[row.field] ?? 0) + 1;
  }
  return {
    totalFailures: failed.length,
    predictionFailures: failed.filter((row) => row.field === 'prediction').length,
    byField,
    samples: failed.slice(0, 8).map((row) => ({
      name: `${row.name} (${row.field})`,
      expected: row.expected,
      actual: row.actual,
    })),
  };
}

export function formatFailureDiagnostics(
  summary: ReturnType<typeof summarizeSuiteFailures>,
): string {
  if (summary.totalFailures === 0) return 'All checks passed.';

  const fieldLines = Object.entries(summary.byField)
    .sort((a, b) => b[1] - a[1])
    .map(([field, count]) => `${field}: ${count}`)
    .join(' | ');

  const sampleLines = summary.samples
    .map(
      (row) =>
        `- ${row.name}\n  expected: ${row.expected.slice(0, 120)}\n  actual:   ${row.actual.slice(0, 120)}`,
    )
    .join('\n');

  return `Failures by field — ${fieldLines}\n${sampleLines}`;
}

export function mergeSuiteSummaries(summaries: SuiteRunSummary[]): SuiteRunSummary {
  const results = summaries.flatMap((summary) => summary.results);
  const total = summaries.reduce((sum, summary) => sum + summary.total, 0);
  const passed = summaries.reduce((sum, summary) => sum + summary.passed, 0);
  return {
    total,
    passed,
    failed: total - passed,
    passRate: total > 0 ? Math.round((passed / total) * 1000) / 10 : 0,
    results,
  };
}
