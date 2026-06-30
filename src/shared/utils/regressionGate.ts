import type { Code } from '@/types/electron';
import { runBuiltInRegressionSuite } from './regressionSuite';
import type { SuiteRunSummary } from './verificationSuite';

/** Minimum built-in regression pass rate for CI / release gates. */
export const REGRESSION_GATE_MIN_PASS_RATE = 95;

/** Minimal Code rows — regression cases validate STEP2/3/statistics, not CodeValue matching. */
export const DEFAULT_REGRESSION_GATE_CODES: Code[] = [
  { id: 1, code: 'C01', type: 'T', description: '', createdAt: '', updatedAt: '' },
];

export interface RegressionGateResult {
  summary: SuiteRunSummary;
  minPassRate: number;
  ok: boolean;
}

export function evaluateRegressionGate(
  codes: Code[] = DEFAULT_REGRESSION_GATE_CODES,
  minPassRate: number = REGRESSION_GATE_MIN_PASS_RATE,
): RegressionGateResult {
  const summary = runBuiltInRegressionSuite(codes);
  return {
    summary,
    minPassRate,
    ok: summary.total > 0 && summary.passRate >= minPassRate,
  };
}

export function formatRegressionGateMessage(result: RegressionGateResult): string {
  const { summary, minPassRate, ok } = result;
  return `Built-in regression: ${summary.passed}/${summary.total} (${summary.passRate}%) — gate ≥ ${minPassRate}% — ${ok ? 'PASS' : 'FAIL'}`;
}
