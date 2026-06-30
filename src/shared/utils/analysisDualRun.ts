import type { Code } from '@/types/electron';
import {
  runAnalysisEngineVerificationLegacyDirect,
  type EngineVerificationInput,
  type EngineVerificationOutput,
} from './engineVerification';
import { runAnalysisPipeline } from '@/shared/services/analysisRunService';
import { resolveEngineMasterNo } from './engineVerification';
import { BUILTIN_REGRESSION_CASES } from './regressionSuite';

const OUTPUT_KEYS: (keyof EngineVerificationOutput)[] = [
  'step2',
  'step3',
  'statistics',
  'prediction',
  'memo',
];

export interface DualRunFieldMismatch {
  caseName: string;
  field: string;
  legacy: string;
  pipeline: string;
}

export interface DualRunReport {
  ok: boolean;
  totalCases: number;
  mismatches: DualRunFieldMismatch[];
}

/** Direct analyzeMasterValue path (pre-pipeline / renderer-legacy). */
export function runLegacyDirectEngineOutput(
  input: EngineVerificationInput,
  codes: Code[],
): EngineVerificationOutput {
  return runAnalysisEngineVerificationLegacyDirect(input, codes);
}

/** Pipeline path (Main IPC / shared analysisRunService). */
export function runPipelineEngineOutput(
  input: EngineVerificationInput,
  codes: Code[],
): EngineVerificationOutput {
  const masterNo = resolveEngineMasterNo(input);
  const masterValue = (input.masterValue ?? '').trim();
  if (!masterValue) {
    throw new Error('masterValue가 필요합니다.');
  }
  const output = runAnalysisPipeline({
    masterNo,
    masterValue,
    master: null,
    codes,
  });
  return output.researchFields;
}

function compareOutputs(
  caseName: string,
  legacy: EngineVerificationOutput,
  pipeline: EngineVerificationOutput,
): DualRunFieldMismatch[] {
  const mismatches: DualRunFieldMismatch[] = [];
  for (const field of OUTPUT_KEYS) {
    const left = legacy[field] ?? '';
    const right = pipeline[field] ?? '';
    if (left !== right) {
      mismatches.push({ caseName, field, legacy: left, pipeline: right });
    }
  }
  return mismatches;
}

/** Ensures legacy direct engine === shared pipeline for built-in regression inputs. */
export function runRegressionDualRunCheck(codes: Code[]): DualRunReport {
  const mismatches: DualRunFieldMismatch[] = [];

  for (const testCase of BUILTIN_REGRESSION_CASES) {
    try {
      const legacy = runLegacyDirectEngineOutput(testCase.input, codes);
      const pipeline = runPipelineEngineOutput(testCase.input, codes);
      mismatches.push(...compareOutputs(testCase.name, legacy, pipeline));
    } catch (error) {
      mismatches.push({
        caseName: testCase.name,
        field: 'error',
        legacy: error instanceof Error ? error.message : 'error',
        pipeline: 'pipeline-not-run',
      });
    }
  }

  return {
    ok: mismatches.length === 0,
    totalCases: BUILTIN_REGRESSION_CASES.length,
    mismatches,
  };
}
