export { AnalysisFeature } from './AnalysisFeature';
export { AnalysisMain } from './components/AnalysisMain';
export { useAnalysisStore, syncAnalysisAfterCodeChange } from './stores/analysis-store';
export {
  analyzeMasterValue,
  type AnalysisResult,
  type SidePatterns,
  type CodeValueStatRow,
  MATCH_RULES,
  buildCodeValueStats,
  logMatchingDetails,
  logCodeValueMatchingDetails,
  collectPatternMatchStartIndices,
  resolvePatternHighlightIndices,
} from '@/shared/utils/analysisEngine';
export {
  analyzeMasterValueCached,
  clearAnalysisCache,
  getCachedAnalysis,
  invalidateAnalysisCacheForMaster,
} from '@/shared/utils/analysisCache';
export {
  copyAnalysisResultToClipboard,
  copyVerificationSnapshotToClipboard,
  compareVerificationSnapshots,
  logAnalysisResultTable,
  serializeAnalysisResult,
  toVerificationSnapshot,
  type VerificationSnapshot,
  type VerificationDiff,
} from './utils/analysis-debug';
