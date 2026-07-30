import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NAV_ITEMS } from '@/lib/constants';

export type NavItemId = (typeof NAV_ITEMS)[number]['id'];
export const DEFAULT_NAV_ORDER: NavItemId[] = NAV_ITEMS.map((item) => item.id);

export type AnalysisPanelId = 'masterValue' | 'ibInfo';

export const DEFAULT_ANALYSIS_PANEL_ORDER: AnalysisPanelId[] = ['masterValue', 'ibInfo'];

export type CodeValueStepId = '1' | '2' | '3';

export const CODE_VALUE_STEP_DEFS: Record<CodeValueStepId, string> = {
  '1': 'STEP1. (Master Value)',
  '2': 'STEP2. (Low Point Values. (0~4))',
  '3': 'STEP3. (High Point Values. (5~9))',
};

export const DEFAULT_CODE_VALUE_STEP_ORDER: CodeValueStepId[] = ['1', '2', '3'];

interface WorkspaceLayoutState {
  analysisPanelOrder: AnalysisPanelId[];
  analysisShowMasterList: boolean;
  analysisShowCodeValue: boolean;

  codeValueStepOrder: CodeValueStepId[];
  codeValueActiveStep: CodeValueStepId;

  navOrder: NavItemId[];
  sidebarCollapsed: boolean;

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
  analysisPanelOrder: [...DEFAULT_ANALYSIS_PANEL_ORDER],
  analysisShowMasterList: true,
  analysisShowCodeValue: true,
  codeValueStepOrder: [...DEFAULT_CODE_VALUE_STEP_ORDER],
  codeValueActiveStep: '1' as CodeValueStepId,
  navOrder: [...DEFAULT_NAV_ORDER],
  sidebarCollapsed: false,
};

function sanitizeAnalysisPanelOrder(order: unknown): AnalysisPanelId[] {
  const allowed = new Set<AnalysisPanelId>(['masterValue', 'ibInfo']);
  if (!Array.isArray(order)) return [...DEFAULT_ANALYSIS_PANEL_ORDER];
  const filtered = order.filter((id): id is AnalysisPanelId => allowed.has(id as AnalysisPanelId));
  return filtered.length > 0 ? filtered : [...DEFAULT_ANALYSIS_PANEL_ORDER];
}

export const useWorkspaceLayoutStore = create<WorkspaceLayoutState>()(
  persist(
    (set) => ({
      ...DEFAULTS,

      setAnalysisPanelOrder: (order) =>
        set({ analysisPanelOrder: sanitizeAnalysisPanelOrder(order) }),
      toggleMasterList: () => set((s) => ({ analysisShowMasterList: !s.analysisShowMasterList })),
      toggleCodeValue: () => set((s) => ({ analysisShowCodeValue: !s.analysisShowCodeValue })),
      resetAnalysisLayout: () =>
        set({
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
    {
      name: 'csebid-workspace-layout-v2',
      merge: (persisted, current) => {
        const p = persisted as Partial<WorkspaceLayoutState> | undefined;
        return {
          ...current,
          ...p,
          analysisPanelOrder: sanitizeAnalysisPanelOrder(p?.analysisPanelOrder),
        };
      },
    },
  ),
);
