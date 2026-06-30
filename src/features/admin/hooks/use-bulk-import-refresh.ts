import { useCallback } from 'react';
import { clearAnalysisCache } from '@/features/analysis/services/analysis-cache-bridge';
import { useAnalysisStore } from '@/features/analysis/stores/analysis-store';
import { useMasterStore } from '@/features/master/stores/master-store';

export function useBulkImportRefresh() {
  const loadMasterStore = useMasterStore((s) => s.loadMasters);
  const loadAnalysisMasters = useAnalysisStore((s) => s.loadMasters);
  const analyzeMaster = useAnalysisStore((s) => s.analyzeMaster);
  const selectedMasterNo = useAnalysisStore((s) => s.selectedMasterNo);

  return useCallback(async () => {
    clearAnalysisCache();
    await Promise.all([loadMasterStore(), loadAnalysisMasters()]);
    await analyzeMaster(selectedMasterNo);
  }, [loadMasterStore, loadAnalysisMasters, analyzeMaster, selectedMasterNo]);
}
