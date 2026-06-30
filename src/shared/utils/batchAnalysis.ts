import type { Code, Master } from '@/types/electron';
import { type AnalysisResult, buildCodeValueStats, type CodeMatchInput } from './analysisEngine';
import { analyzeMasterValueCached, analyzeMasterValueCachedAsync } from './analysisCache';
import { buildPrediction } from './predictionEngine';
import { buildStatisticsSummaryText, buildDigitFrequency } from './statisticsEngine';
import { extractLowPart, extractHighPart } from './digitSequence';

export interface BatchAnalysisRow {
  masterNo: string;
  hasData: boolean;
  totalCount: number;
  lowCount: number;
  highCount: number;
  lowRate: number;
  highRate: number;
  topCode: string | null;
  prediction: string;
  confidence: number;
  status: 'ok' | 'empty' | 'error';
  error?: string;
}

export interface BatchAnalysisSummary {
  totalSlots: number;
  analyzed: number;
  empty: number;
  errors: number;
  rows: BatchAnalysisRow[];
}

function toCodeMatchInputs(codes: Code[]): CodeMatchInput[] {
  return codes.map((c) => ({
    id: c.id,
    code: c.code,
    type: c.type,
    description: c.description ?? '',
  }));
}

export function analyzeAllMasterSlots(
  masters: Master[],
  codes: Code[],
  onProgress?: (current: number, total: number, masterNo: string) => void,
): BatchAnalysisSummary {
  const masterMap = new Map(masters.map((m) => [m.masterNo, m]));
  const codeInputs = toCodeMatchInputs(codes);
  const rows: BatchAnalysisRow[] = [];
  let analyzed = 0;
  let empty = 0;
  let errors = 0;

  for (let i = 0; i < 100; i += 1) {
    const masterNo = String(i).padStart(2, '0');
    onProgress?.(i + 1, 100, masterNo);

    const master = masterMap.get(masterNo);
    if (!master?.masterValue?.trim()) {
      empty += 1;
      rows.push({
        masterNo,
        hasData: false,
        totalCount: 0,
        lowCount: 0,
        highCount: 0,
        lowRate: 0,
        highRate: 0,
        topCode: null,
        prediction: '',
        confidence: 0,
        status: 'empty',
      });
      continue;
    }

    try {
      const result: AnalysisResult = analyzeMasterValueCached(masterNo, master.masterValue);
      const stats = buildCodeValueStats(result, codeInputs);
      const prediction = buildPrediction(result, stats);
      const topCode = stats.find((row) => row.isTop)?.code ?? stats[0]?.code ?? null;

      analyzed += 1;
      rows.push({
        masterNo,
        hasData: true,
        totalCount: result.totalCount,
        lowCount: result.lowCount,
        highCount: result.highCount,
        lowRate: result.lowRate,
        highRate: result.highRate,
        topCode,
        prediction: prediction.value,
        confidence: prediction.confidence,
        status: 'ok',
      });
    } catch (error) {
      errors += 1;
      rows.push({
        masterNo,
        hasData: true,
        totalCount: 0,
        lowCount: 0,
        highCount: 0,
        lowRate: 0,
        highRate: 0,
        topCode: null,
        prediction: '',
        confidence: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'unknown error',
      });
    }
  }

  return {
    totalSlots: 100,
    analyzed,
    empty,
    errors,
    rows,
  };
}

export async function analyzeAllMasterSlotsAsync(
  masters: Master[],
  codes: Code[],
  workerEnabled: boolean,
  onProgress?: (current: number, total: number, masterNo: string) => void,
): Promise<BatchAnalysisSummary> {
  const masterMap = new Map(masters.map((m) => [m.masterNo, m]));
  const codeInputs = toCodeMatchInputs(codes);
  const rows: BatchAnalysisRow[] = [];
  let analyzed = 0;
  let empty = 0;
  let errors = 0;

  for (let i = 0; i < 100; i += 1) {
    const masterNo = String(i).padStart(2, '0');
    onProgress?.(i + 1, 100, masterNo);

    const master = masterMap.get(masterNo);
    if (!master?.masterValue?.trim()) {
      empty += 1;
      rows.push({
        masterNo,
        hasData: false,
        totalCount: 0,
        lowCount: 0,
        highCount: 0,
        lowRate: 0,
        highRate: 0,
        topCode: null,
        prediction: '',
        confidence: 0,
        status: 'empty',
      });
      continue;
    }

    try {
      const result: AnalysisResult = await analyzeMasterValueCachedAsync(
        masterNo,
        master.masterValue,
        workerEnabled,
      );
      const stats = buildCodeValueStats(result, codeInputs);
      const prediction = buildPrediction(result, stats);
      const topCode = stats.find((row) => row.isTop)?.code ?? stats[0]?.code ?? null;

      analyzed += 1;
      rows.push({
        masterNo,
        hasData: true,
        totalCount: result.totalCount,
        lowCount: result.lowCount,
        highCount: result.highCount,
        lowRate: result.lowRate,
        highRate: result.highRate,
        topCode,
        prediction: prediction.value,
        confidence: prediction.confidence,
        status: 'ok',
      });
    } catch (error) {
      errors += 1;
      rows.push({
        masterNo,
        hasData: true,
        totalCount: 0,
        lowCount: 0,
        highCount: 0,
        lowRate: 0,
        highRate: 0,
        topCode: null,
        prediction: '',
        confidence: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'unknown error',
      });
    }
  }

  return {
    totalSlots: 100,
    analyzed,
    empty,
    errors,
    rows,
  };
}

export function batchAnalysisToCsv(summary: BatchAnalysisSummary): string {
  const header =
    'masterNo,hasData,totalCount,lowCount,highCount,lowRate,highRate,topCode,prediction,confidence,status,error';
  const lines = summary.rows.map((row) =>
    [
      row.masterNo,
      row.hasData,
      row.totalCount,
      row.lowCount,
      row.highCount,
      row.lowRate,
      row.highRate,
      row.topCode ?? '',
      row.prediction,
      row.confidence,
      row.status,
      row.error ?? '',
    ]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(','),
  );
  return [header, ...lines].join('\n');
}

export function buildResearchOutputFields(
  result: AnalysisResult,
  codes: Code[],
): Record<string, string> {
  const stats = buildCodeValueStats(result, toCodeMatchInputs(codes));
  const prediction = buildPrediction(result, stats);
  const frequency = buildDigitFrequency(result.digits);

  const lowDigits = extractLowPart(result.digits);
  const highDigits = extractHighPart(result.digits);

  return {
    step2: lowDigits,
    step3: highDigits,
    statistics: buildStatisticsSummaryText(result, frequency),
    prediction: prediction.value,
    memo: `Master ${result.masterNo} | confidence ${prediction.confidence}%`,
  };
}
