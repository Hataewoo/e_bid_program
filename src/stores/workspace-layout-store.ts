import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NAV_ITEMS } from '@/lib/constants';

export type NavItemId = (typeof NAV_ITEMS)[number]['id'];
export const DEFAULT_NAV_ORDER: NavItemId[] = NAV_ITEMS.map((item) => item.id);

export type AnalysisStepId = 'step1' | 'step2' | 'step3';
export type AnalysisPanelId = 'masterValue' | 'lowPoint' | 'ibInfo' | 'highPoint';

export const ANALYSIS_STEP_DEFS: Record<
  AnalysisStepId,
  { label: string; labelKey: string; panelId: AnalysisPanelId }
> = {
  step1: {
    label: 'STEP1. (Master Value)',
    labelKey: 'analysis.step.step1',
    panelId: 'masterValue',
  },
  step2: {
    label: 'STEP2. (Low Point Values. (0~4))',
    labelKey: 'analysis.step.step2',
    panelId: 'lowPoint',
  },
  step3: {
    label: 'STEP3. (High Point Values. (5~9))',
    labelKey: 'analysis.step.step3',
    panelId: 'highPoint',
  },
};

export const DEFAULT_ANALYSIS_STEP_ORDER: AnalysisStepId[] = ['step1', 'step2', 'step3'];
export const DEFAULT_ANALYSIS_PANEL_ORDER: AnalysisPanelId[] = [
  'masterValue',
  'lowPoint',
  'ibInfo',
  'highPoint',
];

export type CodeValueStepId = '1' | '2' | '3';

export const CODE_VALUE_STEP_DEFS: Record<CodeValueStepId, string> = {
  '1': 'STEP1. (Master Value)',
  '2': 'STEP2. (Low Point Values. (0~4))',
  '3': 'STEP3. (High Point Values. (5~9))',
};

export const DEFAULT_CODE_VALUE_STEP_ORDER: CodeValueStepId[] = ['1', '2', '3'];

interface WorkspaceLayoutState {
  analysisStepOrder: AnalysisStepId[];
  analysisActiveStep: AnalysisStepId;
  analysisPanelOrder: AnalysisPanelId[];
  analysisShowMasterList: boolean;
  analysisShowCodeValue: boolean;

  codeValueStepOrder: CodeValueStepId[];
  codeValueActiveStep: CodeValueStepId;

  navOrder: NavItemId[];
  sidebarCollapsed: boolean;

  setAnalysisStepOrder: (order: AnalysisStepId[]) => void;
  setAnalysisActiveStep: (step: AnalysisStepId) => void;
  setAnalysisPanelOrder: (order: AnalysisPanelId[]) => void;
  toggleMasterList: () => void;
  toggleCodeValue: () => void;
  resetAnalysisLayout: () => void;

  setCodeValueStepOrder: (order: CodeValueStepId[]) => void;
  setCodeValueActiveStep: (step: CodeValueStepId) => void;
  resetCodeValueLayout: () => void;

  setNavOrder: (order: NavItemId[]) => void;
  toggleSidebarCollapsed: () => void;
  resetNavLayout: () => void;
  resetAllLayouts: () => void;
}

const DEFAULTS = {
  analysisStepOrder: [...DEFAULT_ANALYSIS_STEP_ORDER],
  analysisActiveStep: 'step1' as AnalysisStepId,
  analysisPanelOrder: [...DEFAULT_ANALYSIS_PANEL_ORDER],
  analysisShowMasterList: true,
  analysisShowCodeValue: true,
  codeValueStepOrder: [...DEFAULT_CODE_VALUE_STEP_ORDER],
  codeValueActiveStep: '1' as CodeValueStepId,
  navOrder: [...DEFAULT_NAV_ORDER],
  sidebarCollapsed: false,
};

export const useWorkspaceLayoutStore = create<WorkspaceLayoutState>()(
  persist(
    (set) => ({
      ...DEFAULTS,

      setAnalysisStepOrder: (order) => set({ analysisStepOrder: order }),
      setAnalysisActiveStep: (step) => set({ analysisActiveStep: step }),
      setAnalysisPanelOrder: (order) => set({ analysisPanelOrder: order }),
      toggleMasterList: () => set((s) => ({ analysisShowMasterList: !s.analysisShowMasterList })),
      toggleCodeValue: () => set((s) => ({ analysisShowCodeValue: !s.analysisShowCodeValue })),
      resetAnalysisLayout: () =>
        set({
          analysisStepOrder: [...DEFAULT_ANALYSIS_STEP_ORDER],
          analysisActiveStep: 'step1',
          analysisPanelOrder: [...DEFAULT_ANALYSIS_PANEL_ORDER],
          analysisShowMasterList: true,
          analysisShowCodeValue: true,
        }),

      setCodeValueStepOrder: (order) => set({ codeValueStepOrder: order }),
      setCodeValueActiveStep: (step) => set({ codeValueActiveStep: step }),
      resetCodeValueLayout: () =>
        set({
          codeValueStepOrder: [...DEFAULT_CODE_VALUE_STEP_ORDER],
          codeValueActiveStep: '1',
        }),

      setNavOrder: (order) => set({ navOrder: order }),
      toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      resetNavLayout: () =>
        set({
          navOrder: [...DEFAULT_NAV_ORDER],
          sidebarCollapsed: false,
        }),

      resetAllLayouts: () => set({ ...DEFAULTS }),
    }),
    { name: 'csebid-workspace-layout-v1' },
  ),
);
