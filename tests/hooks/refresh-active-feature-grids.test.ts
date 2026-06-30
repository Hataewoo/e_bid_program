import { beforeEach, describe, expect, it, vi } from 'vitest';
import { APP_ROUTES } from '@/lib/constants';
import { refreshActiveFeatureGrids } from '@/hooks/refresh-active-feature-grids';

const loadMasters = vi.fn();
const loadCodes = vi.fn();
const loadItems = vi.fn();
const refreshFromDatabase = vi.fn();
const loadReMasters = vi.fn();
const loadAll = vi.fn();
const loadAnalysisMasters = vi.fn();
const loadAnalysisCodes = vi.fn();
const loadStatisticsMasters = vi.fn();
const refreshHistory = vi.fn();

vi.mock('@/features/master/stores/master-store', () => ({
  useMasterStore: {
    getState: () => ({
      isDirty: false,
      isSaving: false,
      loadMasters,
    }),
  },
}));

vi.mock('@/features/code/stores/code-store', () => ({
  useCodeStore: {
    getState: () => ({
      isDirty: false,
      isSaving: false,
      loadCodes,
    }),
  },
}));

vi.mock('@/features/codeValue/stores/code-value-store', () => ({
  useCodeValueStore: {
    getState: () => ({
      isDirty: false,
      isSaving: false,
      loadItems,
    }),
  },
}));

vi.mock('@/features/codeValue/stores/code-value-analysis-store', () => ({
  useCodeValueAnalysisStore: {
    getState: () => ({
      loading: false,
      refreshFromDatabase,
    }),
  },
}));

vi.mock('@/features/reverse-engineering/stores/re-store', () => ({
  useReverseEngineeringStore: {
    getState: () => ({
      isLoading: false,
      loadMasters: loadReMasters,
    }),
  },
}));

vi.mock('@/features/research/stores/research-store', () => ({
  useResearchStore: {
    getState: () => ({
      loadAll,
    }),
  },
}));

vi.mock('@/features/analysis/stores/analysis-store', () => ({
  useAnalysisStore: {
    getState: () => ({
      analyzing: false,
      batchAnalyzing: false,
      loadMasters: loadAnalysisMasters,
      loadCodes: loadAnalysisCodes,
    }),
  },
}));

vi.mock('@/features/statistics/stores/statistics-store', () => ({
  useStatisticsStore: {
    getState: () => ({
      loading: false,
      loadMasters: loadStatisticsMasters,
      refreshHistory,
    }),
  },
}));

describe('refreshActiveFeatureGrids', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refreshes master grid on master route', async () => {
    await refreshActiveFeatureGrids(APP_ROUTES.master);
    expect(loadMasters).toHaveBeenCalledOnce();
  });

  it('refreshes code grid on code route', async () => {
    await refreshActiveFeatureGrids(APP_ROUTES.code);
    expect(loadCodes).toHaveBeenCalledOnce();
  });

  it('refreshes both code-value stores on code-value route', async () => {
    await refreshActiveFeatureGrids(APP_ROUTES.codeValue);
    expect(loadItems).toHaveBeenCalledOnce();
    expect(refreshFromDatabase).toHaveBeenCalledOnce();
  });

  it('refreshes research data on research route', async () => {
    await refreshActiveFeatureGrids(APP_ROUTES.research);
    expect(loadAll).toHaveBeenCalledOnce();
  });

  it('refreshes analysis masters and codes on analysis route', async () => {
    await refreshActiveFeatureGrids(APP_ROUTES.analysis);
    expect(loadAnalysisMasters).toHaveBeenCalledOnce();
    expect(loadAnalysisCodes).toHaveBeenCalledOnce();
  });

  it('refreshes statistics masters and history on statistics route', async () => {
    await refreshActiveFeatureGrids(APP_ROUTES.statistics);
    expect(loadStatisticsMasters).toHaveBeenCalledOnce();
    expect(refreshHistory).toHaveBeenCalledOnce();
  });

  it('does nothing on settings route', async () => {
    await refreshActiveFeatureGrids(APP_ROUTES.settings);
    expect(loadMasters).not.toHaveBeenCalled();
    expect(loadAll).not.toHaveBeenCalled();
  });
});
