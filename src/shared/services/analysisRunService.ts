import type { Code, Master } from '@/types/electron';
import type { AnalysisRunInput, AnalysisRunOutput } from '@/types/analysis';
import {
  analyzeMasterValueCached,
  analyzeMasterValueCachedAsync,
  getCachedAnalysis,
} from '@/shared/utils/analysisCache';
import { buildCodeValueStats, type CodeMatchInput } from '@/shared/utils/analysisEngine';
import { buildPrediction } from '@/shared/utils/predictionEngine';
import { buildResearchOutputFields } from '@/shared/utils/batchAnalysis';
import { shouldUseAnalysisWorker } from '@/shared/constants/analysis-worker';

function toCodeMatchInputs(codes: Code[]): CodeMatchInput[] {
  return codes.map((c) => ({
    id: c.id,
    code: c.code,
    type: c.type,
    description: c.description ?? '',
  }));
}

export interface RunAnalysisContext {
  masterNo: string;
  masterValue: string;
  master: Master | null;
  codes: Code[];
}

export function resolveAnalysisContext(
  input: AnalysisRunInput,
  master: Master | null,
  codes: Code[],
): RunAnalysisContext {
  const masterNo = input.masterNo.padStart(2, '0');
  const masterValue = (input.masterValue ?? master?.masterValue ?? '').trim();
  return { masterNo, masterValue, master, codes };
}

/** Shared analysis pipeline — used by Main IPC and renderer fallback. */
export function runAnalysisPipeline(context: RunAnalysisContext): AnalysisRunOutput {
  const { masterNo, masterValue, master, codes } = context;
  const cached = getCachedAnalysis(masterNo, masterValue);
  const result = cached ?? analyzeMasterValueCached(masterNo, masterValue);

  const codeValueStats = buildCodeValueStats(result, toCodeMatchInputs(codes));
  const prediction = buildPrediction(result, codeValueStats);
  const researchFields = buildResearchOutputFields(result, codes);

  return {
    result,
    codeValueStats,
    prediction,
    researchFields: {
      step2: researchFields.step2,
      step3: researchFields.step3,
      statistics: researchFields.statistics,
      prediction: researchFields.prediction,
      memo: researchFields.memo,
    },
    fromCache: cached !== null,
    master,
  };
}

export interface RunAnalysisPipelineOptions {
  workerEnabled?: boolean;
}

/** Async pipeline — uses Web Worker for large masterValue when enabled. */
export async function runAnalysisPipelineAsync(
  context: RunAnalysisContext,
  options: RunAnalysisPipelineOptions = {},
): Promise<AnalysisRunOutput> {
  const { masterNo, masterValue, master, codes } = context;
  const workerEnabled = options.workerEnabled ?? false;
  const cached = getCachedAnalysis(masterNo, masterValue);
  const result =
    cached ??
    (shouldUseAnalysisWorker(workerEnabled, masterValue.length)
      ? await analyzeMasterValueCachedAsync(masterNo, masterValue, workerEnabled)
      : analyzeMasterValueCached(masterNo, masterValue));

  const codeValueStats = buildCodeValueStats(result, toCodeMatchInputs(codes));
  const prediction = buildPrediction(result, codeValueStats);
  const researchFields = buildResearchOutputFields(result, codes);

  return {
    result,
    codeValueStats,
    prediction,
    researchFields: {
      step2: researchFields.step2,
      step3: researchFields.step3,
      statistics: researchFields.statistics,
      prediction: researchFields.prediction,
      memo: researchFields.memo,
    },
    fromCache: cached !== null,
    master,
    usedWorker: !cached && shouldUseAnalysisWorker(workerEnabled, masterValue.length),
  };
}
