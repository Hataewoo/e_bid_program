import {
  analyzeMasterValue,
  buildCodeValueStats,
  type CodeMatchInput,
  type CodeValueStatRow,
} from './analysisEngine';

export type CodeValueVerificationSource = 'SRC-BUILTIN' | 'SRC-LEGACY' | 'SRC-MANUAL';

export interface CodeValueCodeSpec {
  code: string;
  type: string;
  description: string;
}

export interface CodeValueExpectedRow {
  code: string;
  count: number;
  matchKind?: 'pattern' | 'sequence' | 'unmatched';
  percent?: number;
  isTop?: boolean;
}

export interface CodeValueVerificationCase {
  catalogId?: string;
  name: string;
  source?: CodeValueVerificationSource;
  masterNo: string;
  masterValue: string;
  codes: CodeValueCodeSpec[];
  expected: CodeValueExpectedRow[];
}

export interface CodeValueCaseResult {
  id: string;
  name: string;
  catalogId?: string;
  source: CodeValueVerificationSource;
  code: string;
  field: 'count' | 'matchKind' | 'percent' | 'isTop';
  expected: string;
  actual: string;
  passed: boolean;
}

export interface CodeValueSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  legacyCaseCount: number;
  legacyPassRate: number;
  verificationState: 'verified' | 'unverified' | 'partial';
  results: CodeValueCaseResult[];
}

function toCodeMatchInputs(codes: CodeValueCodeSpec[]): CodeMatchInput[] {
  return codes.map((row, index) => ({
    id: index + 1,
    code: row.code,
    type: row.type,
    description: row.description,
  }));
}

function findStatRow(stats: CodeValueStatRow[], code: string): CodeValueStatRow | undefined {
  return stats.find((row) => row.code === code);
}

export function evaluateCodeValueCase(testCase: CodeValueVerificationCase): CodeValueCaseResult[] {
  const result = analyzeMasterValue(testCase.masterNo, testCase.masterValue);
  const stats = buildCodeValueStats(result, toCodeMatchInputs(testCase.codes));
  const source = testCase.source ?? 'SRC-BUILTIN';
  const results: CodeValueCaseResult[] = [];

  for (const expectedRow of testCase.expected) {
    const actualRow = findStatRow(stats, expectedRow.code);
    const baseId = testCase.catalogId ?? testCase.name;

    results.push({
      id: `${baseId}-${expectedRow.code}-count`,
      name: testCase.name,
      catalogId: testCase.catalogId,
      source,
      code: expectedRow.code,
      field: 'count',
      expected: String(expectedRow.count),
      actual: String(actualRow?.count ?? 0),
      passed: (actualRow?.count ?? 0) === expectedRow.count,
    });

    if (expectedRow.matchKind !== undefined) {
      results.push({
        id: `${baseId}-${expectedRow.code}-matchKind`,
        name: testCase.name,
        catalogId: testCase.catalogId,
        source,
        code: expectedRow.code,
        field: 'matchKind',
        expected: expectedRow.matchKind,
        actual: actualRow?.matchKind ?? 'unmatched',
        passed: (actualRow?.matchKind ?? 'unmatched') === expectedRow.matchKind,
      });
    }

    if (expectedRow.percent !== undefined) {
      results.push({
        id: `${baseId}-${expectedRow.code}-percent`,
        name: testCase.name,
        catalogId: testCase.catalogId,
        source,
        code: expectedRow.code,
        field: 'percent',
        expected: String(expectedRow.percent),
        actual: String(actualRow?.percent ?? 0),
        passed: Math.abs((actualRow?.percent ?? 0) - expectedRow.percent) < 0.05,
      });
    }

    if (expectedRow.isTop !== undefined) {
      results.push({
        id: `${baseId}-${expectedRow.code}-isTop`,
        name: testCase.name,
        catalogId: testCase.catalogId,
        source,
        code: expectedRow.code,
        field: 'isTop',
        expected: String(expectedRow.isTop),
        actual: String(actualRow?.isTop ?? false),
        passed: Boolean(actualRow?.isTop) === expectedRow.isTop,
      });
    }
  }

  return results;
}

export function runCodeValueVerificationSuite(
  cases: CodeValueVerificationCase[],
): CodeValueSuiteSummary {
  const results = cases.flatMap((testCase) => evaluateCodeValueCase(testCase));
  const passed = results.filter((row) => row.passed).length;
  const total = results.length;

  const legacyCaseIds = new Set(
    cases.filter((c) => c.source === 'SRC-LEGACY').map((c) => c.catalogId ?? c.name),
  );
  const legacyResults = results.filter((row) => legacyCaseIds.has(row.catalogId ?? row.name));
  const legacyPassed = legacyResults.filter((row) => row.passed).length;
  const legacyPassRate =
    legacyResults.length > 0 ? Math.round((legacyPassed / legacyResults.length) * 1000) / 10 : 0;

  const verificationState = resolveCodeValueVerificationState(cases, legacyPassRate);

  return {
    total,
    passed,
    failed: total - passed,
    passRate: total > 0 ? Math.round((passed / total) * 1000) / 10 : 0,
    legacyCaseCount: legacyCaseIds.size,
    legacyPassRate,
    verificationState,
    results,
  };
}

/** ≥10 SRC-LEGACY cases @ ≥95% → verified; else unverified (builtin-only). */
export function resolveCodeValueVerificationState(
  cases: CodeValueVerificationCase[],
  legacyPassRate: number,
): 'verified' | 'unverified' | 'partial' {
  const legacyCount = cases.filter((c) => c.source === 'SRC-LEGACY').length;
  if (legacyCount < 10) return 'unverified';
  if (legacyPassRate >= 95) return 'verified';
  return 'partial';
}

export function parseCodeValueVerificationJson(raw: string): CodeValueVerificationCase[] {
  const parsed = JSON.parse(raw) as unknown;
  if (Array.isArray(parsed)) {
    return parsed as CodeValueVerificationCase[];
  }
  const bundle = parsed as { cases?: CodeValueVerificationCase[] };
  if (Array.isArray(bundle.cases)) {
    return bundle.cases;
  }
  throw new Error('CodeValue JSON 배열 또는 { cases: [...] } 형식이 필요합니다.');
}

export function formatCodeValueDiagnosisMarkdown(summary: CodeValueSuiteSummary): string {
  const lines = [
    '# CodeValue Verification Report',
    '',
    `| Item | Value |`,
    `|------|-------|`,
    `| Baseline checks | ${summary.passed}/${summary.total} (${summary.passRate}%) |`,
    `| Legacy cases | ${summary.legacyCaseCount} |`,
    `| Legacy pass rate | ${summary.legacyPassRate}% |`,
    `| Legacy status | **${summary.verificationState}** |`,
    '',
  ];

  const failures = summary.results.filter((row) => !row.passed);
  if (failures.length === 0) {
    lines.push('All baseline checks passed.', '');
    if (summary.verificationState === 'unverified') {
      lines.push(
        '> No ≥10 SRC-LEGACY CodeValue cases — **legacy parity not claimed**. UI shows unverified banner.',
      );
    }
    return `${lines.join('\n')}\n`;
  }

  lines.push('## Failures', '');
  for (const row of failures) {
    lines.push(
      `- ${row.name} / ${row.code} / ${row.field}: expected \`${row.expected}\`, actual \`${row.actual}\``,
    );
  }
  return `${lines.join('\n')}\n`;
}
