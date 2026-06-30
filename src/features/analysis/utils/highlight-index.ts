import type { AnalysisResult } from '@/shared/utils/analysisEngine';

export function buildHighlightIndexSet(
  result: AnalysisResult,
  highlight: { side: 'low' | 'high'; field: keyof AnalysisResult['lowPatterns'] } | null,
  resolve: (
    r: AnalysisResult,
    side: 'low' | 'high',
    field: keyof AnalysisResult['lowPatterns'],
  ) => number[],
): ReadonlySet<number> {
  if (!highlight) return new Set<number>();
  return new Set(resolve(result, highlight.side, highlight.field));
}
