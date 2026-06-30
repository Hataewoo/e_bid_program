import type {
  Code,
  Experiment,
  ExperimentInputRow,
  ExperimentOutputRow,
  Verification,
} from '@/types/electron';
import {
  evaluateVerificationMatch,
  formatEngineVerificationResult,
  parseEngineVerificationInput,
  runAnalysisEngineVerification,
  type EngineVerificationInput,
} from './engineVerification';

export interface SuiteCaseResult {
  id: string;
  name: string;
  field: string;
  expected: string;
  actual: string;
  passed: boolean;
  source: 'verification' | 'experiment';
}

export interface SuiteRunSummary {
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  results: SuiteCaseResult[];
}

const OUTPUT_FIELDS = ['step2', 'step3', 'statistics', 'prediction'] as const;

function resolveInputField(inputs: ExperimentInputRow[], keys: string[]): string | undefined {
  for (const key of keys) {
    const value = inputs.find(
      (row) => row.fieldKey.toLowerCase() === key.toLowerCase(),
    )?.fieldValue;
    if (value?.trim()) return value.trim();
  }
  return undefined;
}

export function buildInputFromExperimentInputs(
  inputs: ExperimentInputRow[],
): EngineVerificationInput {
  const masterNo = resolveInputField(inputs, ['masterNo', 'master', 'master_no']);
  const masterValue = resolveInputField(inputs, ['masterValue', 'master_value', 'value']);
  return {
    masterNo: masterNo ?? '00',
    masterValue: masterValue ?? '',
  };
}

function legacyOutputValue(outputs: ExperimentOutputRow[] | undefined, fieldKey: string): string {
  return (
    outputs
      ?.find(
        (row) => row.source === 'legacy' && row.fieldKey.toLowerCase() === fieldKey.toLowerCase(),
      )
      ?.fieldValue.trim() ?? ''
  );
}

export function runVerificationRecord(
  verification: Verification,
  codes: Code[],
): SuiteCaseResult[] {
  try {
    const input = parseEngineVerificationInput(verification.inputData);
    const actualOutput = runAnalysisEngineVerification(input, codes);

    let expectedFields: Record<string, string> | null = null;
    try {
      const parsed = JSON.parse(verification.expectedResult.trim()) as Record<string, unknown>;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        expectedFields = Object.fromEntries(
          Object.entries(parsed).map(([key, value]) => [key, String(value ?? '')]),
        );
      }
    } catch {
      expectedFields = null;
    }

    if (!expectedFields || Object.keys(expectedFields).length === 0) {
      const actual = formatEngineVerificationResult(actualOutput);
      const passed = evaluateVerificationMatch(verification.expectedResult, actual);
      return [
        {
          id: `verification-${verification.id}`,
          name: verification.name,
          field: 'all',
          expected: verification.expectedResult,
          actual,
          passed,
          source: 'verification',
        },
      ];
    }

    return Object.entries(expectedFields).map(([field, expected]) => {
      const actual =
        actualOutput[field as keyof typeof actualOutput] ??
        (field === 'all' ? formatEngineVerificationResult(actualOutput) : '');
      const passed =
        field === 'all'
          ? evaluateVerificationMatch(expected, formatEngineVerificationResult(actualOutput))
          : expected.trim() === String(actual).trim();

      return {
        id: `verification-${verification.id}-${field}`,
        name: verification.name,
        field,
        expected,
        actual: String(actual),
        passed,
        source: 'verification' as const,
      };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Engine error';
    return [
      {
        id: `verification-${verification.id}-error`,
        name: verification.name,
        field: 'error',
        expected: verification.expectedResult,
        actual: message,
        passed: false,
        source: 'verification',
      },
    ];
  }
}

export function runExperimentLegacySuite(experiment: Experiment, codes: Code[]): SuiteCaseResult[] {
  const inputs = experiment.inputs ?? [];
  const input = buildInputFromExperimentInputs(inputs);
  if (!input.masterValue?.trim()) return [];

  let engineOutput;
  try {
    engineOutput = runAnalysisEngineVerification(input, codes);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Engine error';
    return OUTPUT_FIELDS.flatMap((field) => {
      const expected = legacyOutputValue(experiment.outputs, field);
      if (!expected) return [];
      return [
        {
          id: `experiment-${experiment.id}-${field}`,
          name: experiment.name,
          field,
          expected,
          actual: message,
          passed: false,
          source: 'experiment' as const,
        },
      ];
    });
  }

  const results: SuiteCaseResult[] = [];
  for (const field of OUTPUT_FIELDS) {
    const expected = legacyOutputValue(experiment.outputs, field);
    if (!expected) continue;

    const actual = engineOutput[field];
    results.push({
      id: `experiment-${experiment.id}-${field}`,
      name: experiment.name,
      field,
      expected,
      actual,
      passed: expected.trim() === actual.trim(),
      source: 'experiment',
    });
  }

  return results;
}

export function runFullVerificationSuite(
  verifications: Verification[],
  experiments: Experiment[],
  codes: Code[],
): SuiteRunSummary {
  const results: SuiteCaseResult[] = [
    ...verifications.flatMap((verification) => runVerificationRecord(verification, codes)),
    ...experiments.flatMap((experiment) => runExperimentLegacySuite(experiment, codes)),
  ];

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

export { parseVerificationImportJson as importVerificationCasesFromJson } from './verificationImport';
