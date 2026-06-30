import type { AnalysisResult } from './analysisEngine';
import { analyzeMasterValueCached } from './analysisCache';
import { buildDigitFrequency } from './statisticsEngine';

export type AnalysisPersistenceSource = 'analysis' | 'statistics' | 'code-value';

export interface AnalysisHistorySummary {
  masterNo: string;
  totalCount: number;
  lowCount: number;
  lowRate: number;
  highCount: number;
  highRate: number;
  runCount: number;
  maxRun: number;
  topDigit: number | null;
  prediction: string | null;
  source: AnalysisPersistenceSource;
  analyzedAt: string;
}

export function buildAnalysisSummary(
  result: AnalysisResult,
  predictionValue?: string | null,
): AnalysisHistorySummary {
  const frequency = buildDigitFrequency(result.digits);
  const top = [...frequency.items].sort((a, b) => b.count - a.count)[0];
  const maxRun = result.runs.length > 0 ? Math.max(...result.runs.map((run) => run.length)) : 0;

  return {
    masterNo: result.masterNo,
    totalCount: result.totalCount,
    lowCount: result.lowCount,
    lowRate: result.lowRate,
    highCount: result.highCount,
    highRate: result.highRate,
    runCount: result.runs.length,
    maxRun,
    topDigit: top && top.count > 0 ? top.digit : null,
    prediction: predictionValue ?? null,
    source: 'analysis',
    analyzedAt: new Date().toISOString(),
  };
}

export function buildAnalysisHistoryCreatePayload(
  result: AnalysisResult,
  source: AnalysisPersistenceSource,
  predictionValue?: string | null,
) {
  const summary = { ...buildAnalysisSummary(result, predictionValue), source };
  const status = result.totalCount > 0 ? 'completed' : result.masterNo ? 'empty' : 'failed';

  return {
    title: `Master ${result.masterNo} — ${source}`,
    bidNumber: result.masterNo,
    status,
    result: JSON.stringify(summary),
  };
}

export function buildMasterStatisticsRecord(
  result: AnalysisResult,
  source: AnalysisPersistenceSource,
) {
  const summary = buildAnalysisSummary(result);
  return {
    masterNo: result.masterNo,
    totalCount: summary.totalCount,
    lowRate: summary.lowRate,
    highRate: summary.highRate,
    runCount: summary.runCount,
    maxRun: summary.maxRun,
    topDigit: summary.topDigit,
    source,
  };
}

export function summarizeMasterValue(
  masterNo: string,
  masterValue: string,
  source: AnalysisPersistenceSource,
) {
  const result = analyzeMasterValueCached(masterNo, masterValue);
  return buildMasterStatisticsRecord(result, source);
}
