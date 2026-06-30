import { create } from 'zustand';
import { translate } from '@/i18n/translate';

export type CodeValueStep = 1 | 2 | 3;

interface CodeValueCountState {
  activeStep: CodeValueStep;
  statusMessage: string;
  isPanelOpen: boolean;

  setActiveStep: (step: CodeValueStep) => void;
  openPanel: () => void;
  closePanel: () => void;
  setStatusMessage: (message: string) => void;
}

export const useCodeValueCountStore = create<CodeValueCountState>((set) => ({
  activeStep: 1,
  statusMessage: translate('common.ready'),
  isPanelOpen: true,

  setActiveStep: (step) => {
    set({
      activeStep: step,
      statusMessage: translate('codeValue.count.stepSelected', { step }),
    });
  },

  openPanel: () => {
    set({ isPanelOpen: true, statusMessage: translate('codeValue.count.panelTitle') });
  },

  closePanel: () => {
    set({ isPanelOpen: false, statusMessage: translate('codeValue.count.panelClosedStatus') });
  },

  setStatusMessage: (message) => set({ statusMessage: message }),
}));
