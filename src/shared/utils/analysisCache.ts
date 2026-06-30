/**
 * 분석 결과 인메모리 캐시 — Master Value 변경 시에만 무효화
 */
import { analyzeMasterValue, extractDigits, type AnalysisResult } from './analysisEngine';
import { shouldUseAnalysisWorker } from '@/shared/constants/analysis-worker';
import { runAnalysisInWorker } from '@/shared/services/analysisWorkerService';

const analysisCache = new Map<string, AnalysisResult>();

function buildCacheKey(masterNo: string, rawValue: string): string {
  const padded = masterNo.padStart(2, '0');
  const digits = extractDigits(rawValue);
  return `${padded}:${digits}`;
}

export function getCachedAnalysis(masterNo: string, rawValue: string): AnalysisResult | null {
  return analysisCache.get(buildCacheKey(masterNo, rawValue)) ?? null;
}

export function analyzeMasterValueCached(masterNo: string, rawValue: string): AnalysisResult {
  const key = buildCacheKey(masterNo, rawValue);
  const cached = analysisCache.get(key);
  if (cached) return cached;

  const result = analyzeMasterValue(masterNo, rawValue);
  analysisCache.set(key, result);
  return result;
}

export async function analyzeMasterValueCachedAsync(
  masterNo: string,
  rawValue: string,
  workerEnabled: boolean,
): Promise<AnalysisResult> {
  const key = buildCacheKey(masterNo, rawValue);
  const cached = analysisCache.get(key);
  if (cached) return cached;

  const result = shouldUseAnalysisWorker(workerEnabled, rawValue.length)
    ? await runAnalysisInWorker(masterNo, rawValue)
    : analyzeMasterValue(masterNo, rawValue);
  analysisCache.set(key, result);
  return result;
}

/** Seed renderer cache after Main IPC returns (avoids duplicate compute on revisit). */
export function rememberAnalysisResult(
  masterNo: string,
  rawValue: string,
  result: AnalysisResult,
): void {
  analysisCache.set(buildCacheKey(masterNo, rawValue), result);
}

export function invalidateAnalysisCacheForMaster(masterNo: string): void {
  const prefix = `${masterNo.padStart(2, '0')}:`;
  for (const key of analysisCache.keys()) {
    if (key.startsWith(prefix)) {
      analysisCache.delete(key);
    }
  }
}

export function invalidateAnalysisCacheEntry(masterNo: string, masterValue: string): void {
  analysisCache.delete(buildCacheKey(masterNo, masterValue));
}

export function clearAnalysisCache(): void {
  analysisCache.clear();
}

export function getAnalysisCacheSize(): number {
  return analysisCache.size;
}
