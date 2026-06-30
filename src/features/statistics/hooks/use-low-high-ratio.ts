import { useStatisticsStore } from '../stores/statistics-store';

export function useLowHighRatio() {
  const selectedMaster = useStatisticsStore((s) => s.selectedMaster);
  const lowHighRatio = useStatisticsStore((s) => s.lowHighRatio);
  const loading = useStatisticsStore((s) => s.lowHighRatioLoading);
  const error = useStatisticsStore((s) => s.lowHighRatioError);
  const refresh = useStatisticsStore((s) => s.refreshLowHighRatio);
  const copyJson = useStatisticsStore((s) => s.copyLowHighRatioJson);

  const hasData = lowHighRatio !== null;
  const showNoData = !loading && (!hasData || error !== null);

  return {
    selectedMaster,
    lowHighRatio,
    loading,
    error,
    hasData,
    showNoData,
    refresh,
    copyJson,
  };
}
