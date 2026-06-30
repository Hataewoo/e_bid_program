import { analyzeMasterValue, buildCodeValueStats, type CodeMatchInput } from './analysisEngine';
import { buildPrediction, type PredictionResult } from './predictionEngine';
import type { CodeValueCodeSpec } from './codeValueVerification';

export type PredictionVerificationSource = 'SRC-BUILTIN' | 'SRC-LEGACY' | 'SRC-MANUAL';

export interface PredictionExpected {
  value?: string;
  topCode?: string | null;
  confidence?: number;
  dominantSide?: 'low' | 'high' | 'balanced';
  modeDigit?: number | null;
  step2Count?: number;
  step3Count?: number;
}

export interface PredictionVerificationCase {
  catalogId?: string;
  name: string;
  source?: PredictionVerificationSource;
  masterNo: string;
  masterValue: string;
  codes: CodeValueCodeSpec[];
  expected: PredictionExpected;
}

export interface PredictionCaseResult {
  id: string;
  name: string;
  catalogId?: string;
  source: PredictionVerificationSource;
  field: keyof PredictionExpected | 'error';
  expected: string;
  actual: string;
  passed: boolean;
}

export interface PredictionSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  legacyCaseCount: number;
  legacyPassRate: number;
  verificationState: 'verified' | 'unverified' | 'partial';
  heuristic: boolean;
  results: PredictionCaseResult[];
}

function toCodeMatchInputs(codes: CodeValueCodeSpec[]): CodeMatchInput[] {
  return codes.map((row, index) => ({
    id: index + 1,
    code: row.code,
    type: row.type,
    description: row.description,
  }));
}

export function runPredictionForCase(testCase: PredictionVerificationCase): PredictionResult {
  const result = analyzeMasterValue(testCase.masterNo, testCase.masterValue);
  const stats = buildCodeValueStats(result, toCodeMatchInputs(testCase.codes));
  return buildPrediction(result, stats);
}

export function evaluatePredictionCase(
  testCase: PredictionVerificationCase,
): PredictionCaseResult[] {
  const source = testCase.source ?? 'SRC-BUILTIN';
  const baseId = testCase.catalogId ?? testCase.name;
  const prediction = runPredictionForCase(testCase);
  const results: PredictionCaseResult[] = [];

  const fields = Object.keys(testCase.expected) as Array<keyof PredictionExpected>;
  for (const field of fields) {
    const expected = testCase.expected[field];
    const actual = prediction[field as keyof PredictionResult];
    const expectedStr = expected === null || expected === undefined ? '' : String(expected);
    const actualStr = actual === null || actual === undefined ? '' : String(actual);
    let passed = expectedStr === actualStr;
    if (field === 'confidence' && typeof expected === 'number') {
      passed = Math.abs(Number(actual) - expected) < 0.05;
    }

    results.push({
      id: `${baseId}-${field}`,
      name: testCase.name,
      catalogId: testCase.catalogId,
      source,
      field,
      expected: expectedStr,
      actual: actualStr,
      passed,
    });
  }

  return results;
}

export function resolvePredictionVerificationState(
  cases: PredictionVerificationCase[],
  legacyPassRate: number,
): 'verified' | 'unverified' | 'partial' {
  const legacyCount = cases.filter((c) => c.source === 'SRC-LEGACY').length;
  if (legacyCount < 10) return 'unverified';
  if (legacyPassRate >= 95) return 'verified';
  return 'partial';
}

export function runPredictionVerificationSuite(
  cases: PredictionVerificationCase[],
): PredictionSuiteSummary {
  const results = cases.flatMap((testCase) => evaluatePredictionCase(testCase));
  const passed = results.filter((row) => row.passed).length;
  const total = results.length;

  const legacyCaseIds = new Set(
    cases.filter((c) => c.source === 'SRC-LEGACY').map((c) => c.catalogId ?? c.name),
  );
  const legacyResults = results.filter((row) => legacyCaseIds.has(row.catalogId ?? row.name));
  const legacyPassed = legacyResults.filter((row) => row.passed).length;
  const legacyPassRate =
    legacyResults.length > 0 ? Math.round((legacyPassed / legacyResults.length) * 1000) / 10 : 0;

  const verificationState = resolvePredictionVerificationState(cases, legacyPassRate);

  return {
    total,
    passed,
    failed: total - passed,
    passRate: total > 0 ? Math.round((passed / total) * 1000) / 10 : 0,
    legacyCaseCount: legacyCaseIds.size,
    legacyPassRate,
    verificationState,
    heuristic: verificationState !== 'verified',
    results,
  };
}

export function formatPredictionDiagnosisMarkdown(summary: PredictionSuiteSummary): string {
  const lines = [
    '# Prediction Verification Report',
    '',
    `| Item | Value |`,
    `|------|-------|`,
    `| Baseline checks | ${summary.passed}/${summary.total} (${summary.passRate}%) |`,
    `| Legacy cases | ${summary.legacyCaseCount} |`,
    `| Legacy pass rate | ${summary.legacyPassRate}% |`,
    `| Legacy status | **${summary.verificationState}** |`,
    `| Engine mode | **${summary.heuristic ? 'heuristic (rule-based)' : 'legacy-verified'}** |`,
    '',
  ];

  const failures = summary.results.filter((row) => !row.passed);
  if (failures.length === 0) {
    lines.push('All baseline checks passed.', '');
    if (summary.verificationState === 'unverified') {
      lines.push(
        '> Prediction remains **heuristic**. No ≥10 SRC-LEGACY cases — UI shows unverified banner; do not claim legacy parity.',
      );
    }
    return `${lines.join('\n')}\n`;
  }

  lines.push('## Failures', '');
  for (const row of failures) {
    lines.push(
      `- ${row.name} / ${row.field}: expected \`${row.expected}\`, actual \`${row.actual}\``,
    );
  }
  return `${lines.join('\n')}\n`;
}
