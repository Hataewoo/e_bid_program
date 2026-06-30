import type { Code } from '@/types/electron';
import regressionCases from '@/shared/fixtures/engine-regression-cases.json';
import {
  evaluateVerificationMatch,
  runAnalysisEngineVerification,
  type EngineVerificationInput,
} from './engineVerification';
import type { SuiteCaseResult, SuiteRunSummary } from './verificationSuite';

export interface RegressionCaseDefinition {
  name: string;
  input: EngineVerificationInput;
  expected: Record<string, string>;
}

export const BUILTIN_REGRESSION_CASES = regressionCases as unknown as RegressionCaseDefinition[];

export function runBuiltInRegressionSuite(codes: Code[]): SuiteRunSummary {
  const results: SuiteCaseResult[] = BUILTIN_REGRESSION_CASES.flatMap((testCase) => {
    try {
      const actualOutput = runAnalysisEngineVerification(testCase.input, codes);
      return Object.entries(testCase.expected).map(([field, expected]) => ({
        id: `regression-${testCase.name}-${field}`,
        name: testCase.name,
        field,
        expected,
        actual: actualOutput[field as keyof typeof actualOutput] ?? '',
        passed: expected.trim() === (actualOutput[field as keyof typeof actualOutput] ?? '').trim(),
        source: 'verification' as const,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Engine error';
      return [
        {
          id: `regression-${testCase.name}-error`,
          name: testCase.name,
          field: 'error',
          expected: JSON.stringify(testCase.expected),
          actual: message,
          passed: false,
          source: 'verification' as const,
        },
      ];
    }
  });

  const passed = results.filter((row) => row.passed).length;
  const total = results.length;

  return {
    total,
    passed,
    failed: total - passed,
    passRate: total > 0 ? Math.round((passed / total) * 1000) / 10 : 0,
    results,
  };
}

export function runRegressionCaseJsonMatch(
  input: EngineVerificationInput,
  expectedJson: Record<string, string>,
  codes: Code[],
): boolean {
  const actual = runAnalysisEngineVerification(input, codes);
  return evaluateVerificationMatch(JSON.stringify(expectedJson), JSON.stringify(actual));
}
