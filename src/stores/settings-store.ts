import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { clampFontScale, FONT_SCALE_DEFAULT } from '@/shared/constants/font-scale';

export type AppLanguage = 'ko' | 'en';

interface SettingsState {
  autoRefresh: boolean;
  refreshInterval: number;
  language: AppLanguage;
  analysisWorkerEnabled: boolean;
  /** UI 글자 크기 배율 (0.75 ~ 2.0, 기본 1.0 = 100%) */
  fontScale: number;
  setAutoRefresh: (value: boolean) => void;
  setRefreshInterval: (seconds: number) => void;
  setLanguage: (language: AppLanguage) => void;
  setAnalysisWorkerEnabled: (value: boolean) => void;
  setFontScale: (scale: number) => void;
  applySettings: (values: {
    autoRefresh: boolean;
    refreshInterval: number;
    language: AppLanguage;
    analysisWorkerEnabled: boolean;
    fontScale?: number;
  }) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      autoRefresh: true,
      refreshInterval: 30,
      language: 'ko',
      analysisWorkerEnabled: true,
      fontScale: FONT_SCALE_DEFAULT,

      setAutoRefresh: (autoRefresh) => set({ autoRefresh }),
      setRefreshInterval: (refreshInterval) =>
        set({ refreshInterval: Math.min(300, Math.max(5, refreshInterval)) }),
      setLanguage: (language) => set({ language }),
      setAnalysisWorkerEnabled: (analysisWorkerEnabled) => set({ analysisWorkerEnabled }),
      setFontScale: (fontScale) => set({ fontScale: clampFontScale(fontScale) }),
      applySettings: (values) =>
        set({
          autoRefresh: values.autoRefresh,
          refreshInterval: Math.min(300, Math.max(5, values.refreshInterval)),
          language: values.language,
          analysisWorkerEnabled: values.analysisWorkerEnabled,
          ...(values.fontScale !== undefined ? { fontScale: clampFontScale(values.fontScale) } : {}),
        }),
    }),
    { name: 'csebid-settings-v1' },
  ),
);
