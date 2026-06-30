import type { Code } from '@/types/electron';
import { runAnalysisPipeline } from '@/shared/services/analysisRunService';
import { buildResearchOutputFields } from './batchAnalysis';
import { analyzeMasterValue } from './analysisEngine';

export interface EngineVerificationInput {
  masterNo?: string;
  masterValue?: string;
  master?: string;
}

export interface EngineVerificationOutput {
  step2: string;
  step3: string;
  statistics: string;
  prediction: string;
  memo: string;
}

export function resolveEngineMasterNo(input: EngineVerificationInput): string {
  const raw = input.masterNo ?? input.master ?? '00';
  const num = parseInt(String(raw).trim(), 10);
  if (Number.isNaN(num) || num < 0 || num > 99) return '00';
  return String(num).padStart(2, '0');
}

function resolveMasterNo(input: EngineVerificationInput): string {
  return resolveEngineMasterNo(input);
}

export function parseEngineVerificationInput(raw: string): EngineVerificationInput {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed) as EngineVerificationInput;
  } catch {
    return { masterValue: trimmed };
  }
}

export function runAnalysisEngineVerification(
  input: EngineVerificationInput,
  codes: Code[],
): EngineVerificationOutput {
  const masterNo = resolveMasterNo(input);
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

/** @deprecated Use runAnalysisPipeline — kept for tests comparing legacy direct path. */
export function runAnalysisEngineVerificationLegacyDirect(
  input: EngineVerificationInput,
  codes: Code[],
): EngineVerificationOutput {
  const masterNo = resolveMasterNo(input);
  const masterValue = (input.masterValue ?? '').trim();
  if (!masterValue) {
    throw new Error('masterValue가 필요합니다.');
  }

  const result = analyzeMasterValue(masterNo, masterValue);
  const fields = buildResearchOutputFields(result, codes);
  return {
    step2: fields.step2,
    step3: fields.step3,
    statistics: fields.statistics,
    prediction: fields.prediction,
    memo: fields.memo,
  };
}

export function formatEngineVerificationResult(output: EngineVerificationOutput): string {
  return JSON.stringify(output, null, 2);
}

/** 단일 필드 또는 JSON 객체 expected 비교 */
export function evaluateVerificationMatch(expected: string, actual: string): boolean {
  const exp = expected.trim();
  const act = actual.trim();
  if (exp === act) return true;

  try {
    const expObj = JSON.parse(exp) as Record<string, unknown>;
    const actObj = JSON.parse(act) as Record<string, unknown>;
    const keys = Object.keys(expObj);
    if (keys.length === 0) return false;
    return keys.every(
      (key) => String(expObj[key] ?? '').trim() === String(actObj[key] ?? '').trim(),
    );
  } catch {
    return false;
  }
}
