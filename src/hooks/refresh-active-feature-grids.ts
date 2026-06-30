import { APP_ROUTES } from '@/lib/constants';
import { useAnalysisStore } from '@/features/analysis/stores/analysis-store';
import { useCodeStore } from '@/features/code/stores/code-store';
import { useCodeValueAnalysisStore } from '@/features/codeValue/stores/code-value-analysis-store';
import { useCodeValueStore } from '@/features/codeValue/stores/code-value-store';
import { useMasterStore } from '@/features/master/stores/master-store';
import { useResearchStore } from '@/features/research/stores/research-store';
import { useReverseEngineeringStore } from '@/features/reverse-engineering/stores/re-store';
import { useStatisticsStore } from '@/features/statistics/stores/statistics-store';

/** Refresh list/grid data for the route currently shown in the main outlet. */
export async function refreshActiveFeatureGrids(pathname: string): Promise<void> {
  switch (pathname) {
    case APP_ROUTES.master: {
      const state = useMasterStore.getState();
      if (state.isDirty || state.isSaving) return;
      await state.loadMasters();
      return;
    }
    case APP_ROUTES.code: {
      const state = useCodeStore.getState();
      if (state.isDirty || state.isSaving) return;
      await state.loadCodes();
      return;
    }
    case APP_ROUTES.codeValue: {
      const manage = useCodeValueStore.getState();
      if (!manage.isDirty && !manage.isSaving) {
        await manage.loadItems();
      }
      const count = useCodeValueAnalysisStore.getState();
      if (!count.loading) {
        await count.refreshFromDatabase();
      }
      return;
    }
    case APP_ROUTES.reverseEngineering: {
      const state = useReverseEngineeringStore.getState();
      if (state.isLoading) return;
      await state.loadMasters();
      return;
    }
    case APP_ROUTES.research: {
      await useResearchStore.getState().loadAll();
      return;
    }
    case APP_ROUTES.analysis: {
      const state = useAnalysisStore.getState();
      if (state.analyzing || state.batchAnalyzing) return;
      await Promise.all([state.loadMasters(), state.loadCodes()]);
      return;
    }
    case APP_ROUTES.statistics: {
      const state = useStatisticsStore.getState();
      if (state.loading) return;
      await state.loadMasters();
      await state.refreshHistory();
      return;
    }
    default:
      return;
  }
}
