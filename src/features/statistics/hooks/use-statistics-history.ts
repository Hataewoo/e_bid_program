import { useEffect } from 'react';
import { useStatisticsStore } from '../stores/statistics-store';

export function useStatisticsHistory() {
  const history = useStatisticsStore((s) => s.history);
  const selectedHistory = useStatisticsStore((s) => s.selectedHistory);
  const loading = useStatisticsStore((s) => s.historyLoading);
  const loadHistory = useStatisticsStore((s) => s.loadHistory);
  const refresh = useStatisticsStore((s) => s.refreshHistory);
  const clear = useStatisticsStore((s) => s.clearHistory);
  const exportJson = useStatisticsStore((s) => s.exportHistory);
  const selectHistory = useStatisticsStore((s) => s.selectHistory);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  return {
    history,
    selectedHistory,
    loading,
    refresh,
    clear,
    exportJson,
    selectHistory,
  };
}
