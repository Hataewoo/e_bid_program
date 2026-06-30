import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppLanguage = 'ko' | 'en';

interface SettingsState {
  autoRefresh: boolean;
  refreshInterval: number;
  language: AppLanguage;
  analysisWorkerEnabled: boolean;
  setAutoRefresh: (value: boolean) => void;
  setRefreshInterval: (seconds: number) => void;
  setLanguage: (language: AppLanguage) => void;
  setAnalysisWorkerEnabled: (value: boolean) => void;
  applySettings: (values: {
    autoRefresh: boolean;
    refreshInterval: number;
    language: AppLanguage;
    analysisWorkerEnabled: boolean;
  }) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      autoRefresh: true,
      refreshInterval: 30,
      language: 'ko',
      analysisWorkerEnabled: true,

      setAutoRefresh: (autoRefresh) => set({ autoRefresh }),
      setRefreshInterval: (refreshInterval) =>
        set({ refreshInterval: Math.min(300, Math.max(5, refreshInterval)) }),
      setLanguage: (language) => set({ language }),
      setAnalysisWorkerEnabled: (analysisWorkerEnabled) => set({ analysisWorkerEnabled }),
      applySettings: (values) =>
        set({
          autoRefresh: values.autoRefresh,
          refreshInterval: Math.min(300, Math.max(5, values.refreshInterval)),
          language: values.language,
          analysisWorkerEnabled: values.analysisWorkerEnabled,
        }),
    }),
    { name: 'csebid-settings-v1' },
  ),
);
