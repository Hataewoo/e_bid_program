import { useEffect } from 'react';
import { useStatisticsStore } from '../stores/statistics-store';

export function useStatisticsWorkspace() {
  const loadMasters = useStatisticsStore((s) => s.loadMasters);
  const selectedMaster = useStatisticsStore((s) => s.selectedMaster);
  const statisticsData = useStatisticsStore((s) => s.statisticsData);
  const loading = useStatisticsStore((s) => s.loading);

  useEffect(() => {
    void loadMasters();
  }, [loadMasters]);

  return { selectedMaster, statisticsData, loading };
}
