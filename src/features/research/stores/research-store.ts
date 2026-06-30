import { create } from 'zustand';
import { formatAppErrors } from '@/i18n/format-app-errors';
import { translate } from '@/i18n/translate';
import type {
  Experiment,
  ExperimentInputRow,
  ExperimentOutputRow,
  Hypothesis,
  Verification,
  Screenshot,
  Comparison,
} from '@/types/electron';
import type { ResearchTab } from '../types';
import type { SuiteRunHistoryEntry, SuiteRunKind } from '../types/suite-run-history';
import type { SuiteRunSummary } from '@/shared/utils/verificationSuite';
import { appendSuiteRunHistory, loadSuiteRunHistory } from '../utils/suite-run-history-storage';
import { researchRepository } from '../repositories/research-repository';

export interface ResearchLinkContext {
  experimentId?: number | null;
  hypothesisId?: number | null;
}

interface ResearchState {
  activeTab: ResearchTab;
  statusMessage: string;
  experiments: Experiment[];
  selectedExperimentId: number | null;
  selectedExperiment: Experiment | null;
  hypotheses: Hypothesis[];
  verifications: Verification[];
  screenshots: Screenshot[];
  comparisons: Comparison[];
  suiteRunHistory: SuiteRunHistoryEntry[];
  lastSuiteSummary: SuiteRunSummary | null;
  linkContext: ResearchLinkContext | null;
  loadAll: () => Promise<void>;
  loadSuiteHistory: () => void;
  recordSuiteRun: (summary: SuiteRunSummary, kind: SuiteRunKind) => void;
  setLastSuiteSummary: (summary: SuiteRunSummary | null) => void;
  setActiveTab: (tab: ResearchTab) => void;
  clearLinkContext: () => void;
  navigateToExperiment: (experimentId: number) => Promise<void>;
  navigateToHypotheses: (experimentId?: number | null) => void;
  navigateToVerification: (context?: ResearchLinkContext) => void;
  selectExperiment: (id: number | null) => Promise<void>;
  saveExperiment: (input: {
    id?: number | null;
    name: string;
    date?: string;
    version?: string;
    description?: string;
    status?: string;
  }) => Promise<void>;
  deleteExperiment: (id: number) => Promise<void>;
  saveInputs: (rows: ExperimentInputRow[]) => Promise<void>;
  saveOutputs: (rows: ExperimentOutputRow[]) => Promise<void>;
  runComparison: () => Promise<void>;
  saveHypothesis: (input: {
    id?: number | null;
    experimentId?: number | null;
    sourceField?: string | null;
    title: string;
    description: string;
    confidence?: number;
    verified?: boolean;
  }) => Promise<void>;
  deleteHypothesis: (id: number) => Promise<void>;
  saveVerification: (
    input: {
      id?: number | null;
      experimentId?: number | null;
      hypothesisId?: number | null;
      name: string;
      inputData?: string;
      expectedResult: string;
      actualResult?: string | null;
    },
    options?: { skipReload?: boolean },
  ) => Promise<void>;
  deleteVerification: (id: number) => Promise<void>;
  loadScreenshots: () => Promise<void>;
  uploadScreenshot: (file: File, caption?: string) => Promise<void>;
  deleteScreenshot: (id: number) => Promise<void>;
  exportAll: (format: 'json' | 'csv' | 'txt') => Promise<void>;
}

export const useResearchStore = create<ResearchState>((set, get) => ({
  activeTab: 'dashboard',
  statusMessage: translate('research.status.ready'),
  experiments: [],
  selectedExperimentId: null,
  selectedExperiment: null,
  hypotheses: [],
  verifications: [],
  screenshots: [],
  comparisons: [],
  suiteRunHistory: loadSuiteRunHistory(),
  lastSuiteSummary: null,
  linkContext: null,

  setActiveTab: (tab) => set({ activeTab: tab }),

  clearLinkContext: () => set({ linkContext: null }),

  navigateToExperiment: async (experimentId) => {
    await get().selectExperiment(experimentId);
    set({ activeTab: 'experiments', linkContext: null });
  },

  navigateToHypotheses: (experimentId) => {
    set({
      activeTab: 'hypotheses',
      linkContext: experimentId != null ? { experimentId } : null,
    });
  },

  navigateToVerification: (context) => {
    set({ activeTab: 'verification', linkContext: context ?? null });
  },

  loadSuiteHistory: () => {
    set({ suiteRunHistory: loadSuiteRunHistory() });
  },

  recordSuiteRun: (summary, kind) => {
    const suiteRunHistory = appendSuiteRunHistory(summary, kind);
    set({ suiteRunHistory, lastSuiteSummary: summary });
  },

  setLastSuiteSummary: (summary) => set({ lastSuiteSummary: summary }),

  loadAll: async () => {
    const [experiments, hypotheses, verifications] = await Promise.all([
      researchRepository.findAllExperiments(),
      researchRepository.findAllHypotheses(),
      researchRepository.findAllVerifications(),
    ]);
    set({
      experiments,
      hypotheses,
      verifications,
      suiteRunHistory: loadSuiteRunHistory(),
      statusMessage: translate('research.status.loadedExperiments', { count: experiments.length }),
    });
    const { selectedExperimentId } = get();
    if (selectedExperimentId) {
      await get().selectExperiment(selectedExperimentId);
    }
  },

  selectExperiment: async (id) => {
    if (!id) {
      set({
        selectedExperimentId: null,
        selectedExperiment: null,
        screenshots: [],
        comparisons: [],
      });
      return;
    }
    const detail = await researchRepository.findExperimentById(id);
    set({
      selectedExperimentId: id,
      selectedExperiment: detail,
      screenshots: detail?.screenshots ?? [],
      comparisons: detail?.comparisons ?? [],
      statusMessage: detail
        ? translate('research.status.selectedExperiment', { name: detail.name })
        : translate('research.status.experimentNotFound'),
    });
  },

  saveExperiment: async (input) => {
    const result = await researchRepository.saveExperiment(input);
    if (!result.success || !result.data) {
      set({ statusMessage: formatAppErrors(result.errors, 'error.saveFailed') });
      return;
    }
    await get().loadAll();
    await get().selectExperiment(result.data.id);
    set({
      statusMessage: translate('research.status.experimentSaved', { name: result.data.name }),
    });
  },

  deleteExperiment: async (id) => {
    await researchRepository.deleteExperiment(id);
    if (get().selectedExperimentId === id) {
      set({ selectedExperimentId: null, selectedExperiment: null });
    }
    await get().loadAll();
    set({ statusMessage: translate('research.status.experimentDeleted') });
  },

  saveInputs: async (rows) => {
    const id = get().selectedExperimentId;
    if (!id) return;
    const result = await researchRepository.saveExperimentInputs(id, rows);
    if (result.success) {
      await get().selectExperiment(id);
      set({ statusMessage: translate('research.status.inputsSaved', { count: rows.length }) });
    }
  },

  saveOutputs: async (rows) => {
    const id = get().selectedExperimentId;
    if (!id) return;
    const result = await researchRepository.saveExperimentOutputs(id, rows);
    if (result.success) {
      await get().selectExperiment(id);
      set({ statusMessage: translate('research.status.outputsSaved', { count: rows.length }) });
    }
  },

  runComparison: async () => {
    const id = get().selectedExperimentId;
    if (!id) return;
    const result = await researchRepository.compareExperiment(id);
    if (result.success && result.data) {
      set({ comparisons: result.data.comparisons });
      await get().selectExperiment(id);
      await get().loadAll();
      set({
        statusMessage: result.data.allMatch
          ? translate('research.status.comparisonMatch')
          : translate('research.status.comparisonDiff'),
      });
    }
  },

  saveHypothesis: async (input) => {
    await researchRepository.saveHypothesis(input);
    await get().loadAll();
    set({ statusMessage: translate('research.status.hypothesisSaved') });
  },

  deleteHypothesis: async (id) => {
    await researchRepository.deleteHypothesis(id);
    await get().loadAll();
    set({ statusMessage: translate('research.status.hypothesisDeleted') });
  },

  saveVerification: async (input, options) => {
    const result = await researchRepository.saveVerification(input);
    if (!result.success) {
      throw new Error(formatAppErrors(result.errors, 'error.saveFailed'));
    }
    if (!options?.skipReload) {
      await get().loadAll();
      const passLabel =
        result.passed === true
          ? translate('research.suite.resultPass')
          : result.passed === false
            ? translate('research.suite.resultFail')
            : translate('research.verification.pending');
      set({
        statusMessage: translate('research.status.verificationSaved', { label: passLabel }),
      });
    }
  },

  deleteVerification: async (id) => {
    await researchRepository.deleteVerification(id);
    await get().loadAll();
    set({ statusMessage: translate('research.status.verificationDeleted') });
  },

  loadScreenshots: async () => {
    const id = get().selectedExperimentId;
    if (!id) return;
    const screenshots = await researchRepository.findScreenshots(id);
    set({ screenshots });
  },

  uploadScreenshot: async (file, caption) => {
    const id = get().selectedExperimentId;
    if (!id) return;
    const buffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    await researchRepository.saveScreenshot(id, file.name, base64, caption);
    await get().loadScreenshots();
    set({
      statusMessage: translate('research.status.screenshotUploaded', { name: file.name }),
    });
  },

  deleteScreenshot: async (screenshotId) => {
    await researchRepository.deleteScreenshot(screenshotId);
    await get().loadScreenshots();
    set({ statusMessage: translate('research.status.screenshotDeleted') });
  },

  exportAll: async (format) => {
    const result = await researchRepository.exportAll(format);
    if (!result) {
      set({ statusMessage: translate('research.status.exportFailed') });
      return;
    }
    const blob = new Blob([result.content], {
      type: format === 'json' ? 'application/json' : 'text/plain',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `research-export.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    set({
      statusMessage: translate('research.status.exported', { format: format.toUpperCase() }),
    });
  },
}));
