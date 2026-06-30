import { create } from 'zustand';
import { electronService } from '@/services';
import { useAppStore } from '@/app/stores';
import { formatAppErrors } from '@/i18n/format-app-errors';
import { translate } from '@/i18n/translate';
import { shouldUseAnalysisWorker } from '@/shared/constants/analysis-worker';
import { useSettingsStore } from '@/stores/settings-store';
import type { Code, Master } from '@/types/electron';
import {
  buildCodeValueStats,
  createEmptyAnalysisResult,
  logCodeValueMatchingDetails,
  logMatchingDetails,
  type AnalysisResult,
  type CodeMatchInput,
  type CodeValueStatRow,
} from '@/shared/utils/analysisEngine';
import { buildPrediction, type PredictionResult } from '@/shared/utils/predictionEngine';
import { getCachedAnalysis, rememberAnalysisResult } from '@/shared/utils/analysisCache';
import { persistAnalysisRun, notifyPersistenceFailure } from '@/shared/utils/persistAnalysisToDb';
import type { LogEntry, LogLevel } from '../types/analysis.types';
import { filterMasters } from '@/shared/utils/masterFilter';
import {
  analyzeAllMasterSlotsAsync,
  type BatchAnalysisSummary,
} from '@/shared/utils/batchAnalysis';
import {
  copyAnalysisResultToClipboard,
  copyVerificationSnapshotToClipboard,
  logAnalysisResultTable,
} from '../utils/analysis-debug';

const DEFAULT_MASTER_NO = '00';
const TOTAL_SLOTS = 100;

let logCounter = 0;

function createLog(message: string, level: LogLevel = 'info'): LogEntry {
  logCounter += 1;
  return {
    id: `log-${logCounter}`,
    timestamp: new Date(),
    level,
    message,
  };
}

function buildMasterSlotRows(masters: Master[]): { masterNo: string; hasData: boolean }[] {
  const saved = new Set(masters.map((m) => m.masterNo));
  return Array.from({ length: TOTAL_SLOTS }, (_, i) => {
    const masterNo = String(i).padStart(2, '0');
    return { masterNo, hasData: saved.has(masterNo) };
  });
}

function toCodeMatchInputs(codes: Code[]): CodeMatchInput[] {
  return codes.map((c) => ({
    id: c.id,
    code: c.code,
    type: c.type,
    description: c.description ?? '',
  }));
}

interface AnalysisState {
  masters: Master[];
  filteredMasters: Master[];
  masterSlotRows: { masterNo: string; hasData: boolean }[];
  codes: Code[];
  codeValueStats: CodeValueStatRow[];
  prediction: PredictionResult | null;
  codesLoading: boolean;
  searchQuery: string;
  selectedMaster: Master | null;
  selectedMasterNo: string;
  currentAnalysisResult: AnalysisResult | null;
  logs: LogEntry[];
  loading: boolean;
  analyzing: boolean;
  batchAnalyzing: boolean;
  batchProgress: { current: number; total: number; masterNo: string };
  batchSummary: BatchAnalysisSummary | null;
  statusMessage: string;
  showRawData: boolean;
  showHistory: boolean;
  debugLoggingEnabled: boolean;

  initialize: () => Promise<void>;
  loadMasters: () => Promise<void>;
  loadCodes: () => Promise<void>;
  recalculateCodeValueStats: (result?: AnalysisResult | null) => void;
  syncAfterCodeRegistryChange: () => Promise<void>;
  analyzeMaster: (masterNo: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  selectMaster: (master: Master) => void;
  appendLog: (message: string, level?: LogLevel) => void;
  toggleRawData: () => void;
  toggleHistory: () => void;
  setDebugLoggingEnabled: (enabled: boolean) => void;
  handleLoad: () => void;
  handleAnalyze: () => void;
  handleReset: () => void;
  handleExport: () => void;
  handleCopy: () => void;
  handleCopyVerify: () => void;
  handleLogNow: () => void;
  handleClear: () => void;
  runBatchAnalysis: () => Promise<BatchAnalysisSummary>;
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  masters: [],
  filteredMasters: [],
  masterSlotRows: buildMasterSlotRows([]),
  codes: [],
  codeValueStats: [],
  prediction: null,
  codesLoading: false,
  searchQuery: '',
  selectedMaster: null,
  selectedMasterNo: DEFAULT_MASTER_NO,
  currentAnalysisResult: null,
  logs: [createLog(translate('common.ready'), 'ready')],
  loading: false,
  analyzing: false,
  batchAnalyzing: false,
  batchProgress: { current: 0, total: 100, masterNo: '00' },
  batchSummary: null,
  statusMessage: translate('common.ready'),
  showRawData: false,
  showHistory: false,
  debugLoggingEnabled: import.meta.env.DEV,

  initialize: async () => {
    await Promise.all([get().loadMasters(), get().loadCodes()]);
    await get().analyzeMaster(DEFAULT_MASTER_NO);
  },

  loadCodes: async () => {
    set({ codesLoading: true });
    try {
      const codes = await electronService.getAllCodes();
      const sorted = [...codes].sort((a, b) => a.code.localeCompare(b.code));
      set({ codes: sorted, codesLoading: false });
      get().recalculateCodeValueStats(get().currentAnalysisResult);
    } catch {
      set({ codes: [], codeValueStats: [], codesLoading: false });
      get().appendLog('Error: Code load failed', 'error');
    }
  },

  recalculateCodeValueStats: (result) => {
    const analysis = result ?? get().currentAnalysisResult;
    const { codes } = get();
    if (!analysis) {
      set({ codeValueStats: [], prediction: null });
      return;
    }
    const stats = buildCodeValueStats(analysis, toCodeMatchInputs(codes));
    const prediction = buildPrediction(analysis, stats);
    set({ codeValueStats: stats, prediction });
  },

  syncAfterCodeRegistryChange: async () => {
    await get().loadCodes();
    const { currentAnalysisResult, selectedMasterNo } = get();
    if (currentAnalysisResult) {
      get().recalculateCodeValueStats(currentAnalysisResult);
      if (get().debugLoggingEnabled) {
        logCodeValueMatchingDetails(currentAnalysisResult, get().codeValueStats);
      }
      return;
    }
    if (selectedMasterNo) {
      await get().analyzeMaster(selectedMasterNo);
    }
  },

  loadMasters: async () => {
    set({ loading: true, statusMessage: translate('analysis.status.loadingMasters') });
    try {
      const masters = await electronService.getAllMasters();
      const sorted = [...masters].sort((a, b) => a.masterNo.localeCompare(b.masterNo));
      const { searchQuery } = get();
      set({
        masters: sorted,
        filteredMasters: filterMasters(sorted, searchQuery),
        masterSlotRows: buildMasterSlotRows(sorted),
        loading: false,
        statusMessage: translate('analysis.status.mastersLoaded', { count: sorted.length }),
      });
      get().appendLog('Master Loaded');

      const dbStatus = await electronService.getDbStatus();
      useAppStore.getState().setDbStatus(dbStatus);
    } catch {
      set({ loading: false, statusMessage: translate('analysis.status.mastersLoadFailed') });
      get().appendLog('Error: Master load failed', 'error');
    }
  },

  analyzeMaster: async (masterNo) => {
    const padded = masterNo.padStart(2, '0');
    const beginBusy = useAppStore.getState().beginBusy;
    const endBusy = useAppStore.getState().endBusy;

    set({
      analyzing: true,
      statusMessage: translate('analysis.status.analyzing', { no: padded }),
      selectedMasterNo: padded,
    });
    beginBusy('analysis.status.analyzingBusy');

    try {
      let master = await electronService.getMasterByNo(padded);
      const rawValue = master?.masterValue ?? '';
      const workerEnabled = useSettingsStore.getState().analysisWorkerEnabled;
      const preferWorker = shouldUseAnalysisWorker(workerEnabled, rawValue.length);

      const localCached = getCachedAnalysis(padded, rawValue);
      let result: AnalysisResult;
      let codeValueStats: CodeValueStatRow[];
      let prediction: PredictionResult | null;
      let fromCache = false;
      let usedWorker = false;

      if (localCached) {
        result = localCached;
        fromCache = true;
        codeValueStats = buildCodeValueStats(result, toCodeMatchInputs(get().codes));
        prediction = buildPrediction(result, codeValueStats);
        set({ codeValueStats, prediction });
      } else if (preferWorker) {
        const local = await electronService.runAnalysisLocalAsync(
          { masterNo: padded },
          master,
          get().codes,
          { workerEnabled },
        );
        result = local.result;
        codeValueStats = local.codeValueStats;
        prediction = local.prediction;
        fromCache = local.fromCache;
        usedWorker = local.usedWorker ?? true;
        master = local.master ?? master;
        rememberAnalysisResult(padded, rawValue, result);
        set({ codeValueStats, prediction });
      } else if (electronService.isAvailable()) {
        const op = await electronService.runAnalysis({ masterNo: padded });
        if (!op.success || !op.data) {
          throw new Error(formatAppErrors(op.errors, 'IPC_ANALYSIS_FAILED'));
        }
        result = op.data.result;
        codeValueStats = op.data.codeValueStats;
        prediction = op.data.prediction;
        fromCache = op.data.fromCache;
        master = op.data.master ?? master;
        rememberAnalysisResult(padded, rawValue, result);
        set({ codeValueStats, prediction });
      } else {
        const local = await electronService.runAnalysisLocalAsync(
          { masterNo: padded },
          master,
          get().codes,
          { workerEnabled },
        );
        result = local.result;
        codeValueStats = local.codeValueStats;
        prediction = local.prediction;
        fromCache = local.fromCache;
        usedWorker = local.usedWorker ?? false;
        rememberAnalysisResult(padded, rawValue, result);
        set({ codeValueStats, prediction });
      }

      if (get().debugLoggingEnabled) {
        if (!fromCache) {
          logAnalysisResultTable(result);
        }
        logMatchingDetails(result);
        logCodeValueMatchingDetails(result, codeValueStats);
      }

      set({
        selectedMaster: master,
        currentAnalysisResult: result,
        analyzing: false,
        statusMessage: master
          ? translate('analysis.status.analyzeComplete', {
              no: padded,
              digits: result.totalCount,
              via: translate(
                fromCache
                  ? 'analysis.status.viaCache'
                  : usedWorker
                    ? 'analysis.status.viaWorker'
                    : 'analysis.status.viaIpc',
              ),
            })
          : translate('analysis.status.analyzeEmpty', { no: padded }),
      });
      get().appendLog(
        fromCache
          ? `Cache hit — Master ${padded}`
          : usedWorker
            ? `Analyzed Master ${padded}: ${result.totalCount} digits (Web Worker)`
            : `Analyzed Master ${padded}: ${result.totalCount} digits (Main IPC)`,
      );

      if (!fromCache && master) {
        void persistAnalysisRun(result, 'analysis', {
          predictionValue: prediction?.value ?? null,
        }).catch((error) => {
          notifyPersistenceFailure(error, padded, (message) => {
            get().appendLog(message, 'error');
            set((state) => ({
              statusMessage: `${state.statusMessage} — ${message}`,
            }));
          });
        });
      }
    } catch {
      const empty = createEmptyAnalysisResult(padded);
      set({
        selectedMaster: null,
        currentAnalysisResult: empty,
        analyzing: false,
        statusMessage: translate('analysis.status.analyzeFailed', { no: padded }),
      });
      get().recalculateCodeValueStats(empty);
      get().appendLog(`Error: analyze ${padded} failed`, 'error');
    } finally {
      endBusy();
    }
  },

  setSearchQuery: (query) => {
    const filteredMasters = filterMasters(get().masters, query);
    set({ searchQuery: query, filteredMasters });
  },

  selectMaster: (master) => {
    void get().analyzeMaster(master.masterNo);
  },

  appendLog: (message, level = 'info') => {
    set((state) => ({
      logs: [...state.logs, createLog(message, level)],
    }));
  },

  toggleRawData: () => {
    set((state) => ({ showRawData: !state.showRawData }));
  },

  toggleHistory: () => {
    set((state) => ({ showHistory: !state.showHistory }));
  },

  setDebugLoggingEnabled: (enabled) => {
    set({ debugLoggingEnabled: enabled });
  },

  handleLoad: () => {
    void get().loadMasters();
    void get().loadCodes();
  },

  handleAnalyze: () => {
    const { selectedMasterNo } = get();
    void get().analyzeMaster(selectedMasterNo);
  },

  handleReset: () => {
    set({
      selectedMaster: null,
      selectedMasterNo: DEFAULT_MASTER_NO,
      currentAnalysisResult: null,
      codeValueStats: [],
      prediction: null,
      showRawData: false,
      showHistory: false,
      statusMessage: translate('analysis.status.reset'),
    });
    get().appendLog('Reset');
    void get().analyzeMaster(DEFAULT_MASTER_NO);
  },

  handleExport: () => {
    const { currentAnalysisResult } = get();
    if (!currentAnalysisResult) {
      get().appendLog('Export skipped — no result', 'error');
      return;
    }
    const blob = new Blob([JSON.stringify(currentAnalysisResult, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `analysis-${currentAnalysisResult.masterNo}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    get().appendLog('Export JSON downloaded');
  },

  handleCopy: () => {
    const { currentAnalysisResult } = get();
    if (!currentAnalysisResult) {
      get().appendLog('Copy skipped — no result', 'error');
      return;
    }
    void copyAnalysisResultToClipboard(currentAnalysisResult, {
      includeDigits: currentAnalysisResult.digits.length <= 100_000,
      includeRuns: false,
    }).then((ok) => {
      get().appendLog(
        ok ? 'AnalysisResult copied to clipboard' : 'Copy failed',
        ok ? 'info' : 'error',
      );
    });
  },

  handleCopyVerify: () => {
    const { currentAnalysisResult } = get();
    if (!currentAnalysisResult) {
      get().appendLog('Copy verify skipped — no result', 'error');
      return;
    }
    void copyVerificationSnapshotToClipboard(currentAnalysisResult).then((ok) => {
      get().appendLog(ok ? 'Verification snapshot copied' : 'Copy failed', ok ? 'info' : 'error');
    });
  },

  handleLogNow: () => {
    const { currentAnalysisResult } = get();
    if (!currentAnalysisResult) {
      get().appendLog('Log skipped — no result', 'error');
      return;
    }
    logAnalysisResultTable(currentAnalysisResult);
    logMatchingDetails(currentAnalysisResult);
    logCodeValueMatchingDetails(currentAnalysisResult, get().codeValueStats);
    get().appendLog(`console logged — Master ${currentAnalysisResult.masterNo}`);
  },

  handleClear: () => {
    set({
      logs: [createLog(translate('common.ready'), 'ready')],
      statusMessage: translate('analysis.status.logCleared'),
    });
  },

  runBatchAnalysis: async () => {
    const beginBusy = useAppStore.getState().beginBusy;
    const endBusy = useAppStore.getState().endBusy;

    set({
      batchAnalyzing: true,
      batchProgress: { current: 0, total: 100, masterNo: '00' },
      batchSummary: null,
      statusMessage: translate('analysis.status.batchRunning'),
    });
    beginBusy('analysis.status.batchBusy');

    try {
      let masters = get().masters;
      let codes = get().codes;

      if (masters.length === 0) {
        await get().loadMasters();
        masters = get().masters;
      }
      if (codes.length === 0) {
        await get().loadCodes();
        codes = get().codes;
      }

      const summary = await analyzeAllMasterSlotsAsync(
        masters,
        codes,
        useSettingsStore.getState().analysisWorkerEnabled,
        (current, total, masterNo) => {
          set({ batchProgress: { current, total, masterNo } });
        },
      );

      set({
        batchAnalyzing: false,
        batchSummary: summary,
        statusMessage: translate('analysis.status.batchComplete', {
          analyzed: summary.analyzed,
          empty: summary.empty,
        }),
      });
      get().appendLog(
        `Batch analysis done: ${summary.analyzed} analyzed, ${summary.empty} empty, ${summary.errors} errors`,
      );

      return summary;
    } catch (error) {
      set({
        batchAnalyzing: false,
        statusMessage: translate('analysis.status.batchFailed'),
      });
      get().appendLog('Batch analysis failed', 'error');
      throw error;
    } finally {
      endBusy();
    }
  },
}));

/** 코드등록 창 저장/삭제 후 분석 화면 CodeValue 통계 재연동 */
export async function syncAnalysisAfterCodeChange(): Promise<void> {
  await useAnalysisStore.getState().syncAfterCodeRegistryChange();
}
