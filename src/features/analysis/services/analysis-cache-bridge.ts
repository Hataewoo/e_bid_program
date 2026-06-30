/**
 * Master CRUD 등 외부 feature에서 analysis 캐시 무효화 시 사용
 */
export {
  analyzeMasterValueCached,
  clearAnalysisCache,
  getCachedAnalysis,
  invalidateAnalysisCacheEntry,
  invalidateAnalysisCacheForMaster,
} from '@/shared/utils/analysisCache';
