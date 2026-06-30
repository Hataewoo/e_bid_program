import { create } from 'zustand';
import { translate } from '@/i18n/translate';
import { masterRepository } from '@/features/master/repositories/master-repository';
import type { Master } from '@/types/electron';
import {
  EMPTY_MASTER_INFO,
  EMPTY_STATISTICS_DATA,
  type LogEntry,
  type LogLevel,
  type StatisticsData,
  type StatisticsMasterInfo,
} from '../types/statistics.types';
import type { FrequencyData } from '../types/frequency.types';
import type { LowHighRatio } from '../types/low-high-ratio.types';
import type { StatisticsHistory } from '../types/statistics-history.types';
import { buildRealStatistics, filterMasters } from '../services/real-statistics-service';
import { analyzeMasterValueCachedAsync } from '@/shared/utils/analysisCache';
import { useSettingsStore } from '@/stores/settings-store';
import { persistAnalysisRun, notifyPersistenceFailure } from '@/shared/utils/persistAnalysisToDb';
import { frequencyService } from '../services/frequency-service';
import { lowHighRatioService } from '../services/low-high-ratio-service';
import { statisticsHistoryService } from '../services/statistics-history-service';

let logCounter = 0;

function createLog(message: string, level: LogLevel = 'info'): LogEntry {
  logCounter += 1;
  return { id: `stat-log-${logCounter}`, timestamp: new Date(), level, message };
}

interface StatisticsState {
  masters: Master[];
  filteredMasters: Master[];
  searchQuery: string;
  selectedMaster: Master | null;
  statisticsData: StatisticsData;
  masterInfo: StatisticsMasterInfo;
  frequencyData: FrequencyData | null;
  frequencyLoading: boolean;
  frequencyError: string | null;
  selectedFrequencyDigit: number | null;
  lowHighRatio: LowHighRatio | null;
  lowHighRatioLoading: boolean;
  lowHighRatioError: string | null;
  history: StatisticsHistory[];
  selectedHistory: StatisticsHistory | null;
  historyLoading: boolean;
  historyError: string | null;
  logs: LogEntry[];
  loading: boolean;
  statusMessage: string;

  loadMasters: () => Promise<void>;
  loadFrequency: () => Promise<void>;
  refreshFrequency: () => Promise<void>;
  copyFrequencyJson: () => Promise<void>;
  selectFrequencyDigit: (digit: number) => void;
  loadLowHighRatio: () => Promise<void>;
  refreshLowHighRatio: () => Promise<void>;
  copyLowHighRatioJson: () => Promise<void>;
  loadHistory: () => Promise<void>;
  refreshHistory: () => Promise<void>;
  clearHistory: () => Promise<void>;
  exportHistory: () => Promise<void>;
  selectHistory: (item: StatisticsHistory) => void;
  setSearchQuery: (query: string) => void;
  selectMaster: (master: Master) => void;
  appendLog: (message: string, level?: LogLevel) => void;
  handleRefresh: () => void;
  handleExport: () => void;
  handleCopy: () => void;
  handleReset: () => void;
  handleSearch: (query: string) => void;
}

export const useStatisticsStore = create<StatisticsState>((set, get) => ({
  masters: [],
  filteredMasters: [],
  searchQuery: '',
  selectedMaster: null,
  statisticsData: { ...EMPTY_STATISTICS_DATA },
  masterInfo: { ...EMPTY_MASTER_INFO },
  frequencyData: null,
  frequencyLoading: false,
  frequencyError: null,
  selectedFrequencyDigit: null,
  lowHighRatio: null,
  lowHighRatioLoading: false,
  lowHighRatioError: null,
  history: [],
  selectedHistory: null,
  historyLoading: false,
  historyError: null,
  logs: [createLog(translate('statistics.status.ready'), 'ready')],
  loading: false,
  statusMessage: translate('statistics.status.ready'),

  loadMasters: async () => {
    set({ loading: true, statusMessage: translate('statistics.status.loadingMasters') });
    try {
      const masters = await masterRepository.findAll();
      const sorted = [...masters].sort((a, b) => a.masterNo.localeCompare(b.masterNo));
      const { searchQuery } = get();
      set({
        masters: sorted,
        filteredMasters: filterMasters(sorted, searchQuery),
        loading: false,
        statusMessage: translate('statistics.status.mastersLoaded', { count: sorted.length }),
      });
      get().appendLog(translate('statistics.log.loaded'));
    } catch {
      set({ loading: false, statusMessage: translate('common.loadFailed') });
      get().appendLog(translate('statistics.log.loadFailed'), 'info');
    }
  },

  loadFrequency: async () => {
    const { selectedMaster } = get();
    if (!selectedMaster) {
      set({ frequencyData: null, frequencyError: null, frequencyLoading: false });
      return;
    }

    set({ frequencyLoading: true, frequencyError: null });
    try {
      const data = await frequencyService.load(selectedMaster.masterNo);
      if (data.items.length === 0) {
        set({
          frequencyData: null,
          frequencyLoading: false,
          frequencyError: translate('statistics.panel.noData'),
        });
        return;
      }
      set({
        frequencyData: data,
        frequencyLoading: false,
        frequencyError: null,
        selectedFrequencyDigit: null,
      });
    } catch {
      set({
        frequencyData: null,
        frequencyLoading: false,
        frequencyError: translate('statistics.panel.noData'),
      });
    }
  },

  refreshFrequency: async () => {
    get().appendLog(translate('statistics.log.frequencyRefresh'));
    await get().loadFrequency();
  },

  copyFrequencyJson: async () => {
    const { frequencyData } = get();
    if (!frequencyData) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(frequencyData, null, 2));
      get().appendLog(translate('statistics.log.frequencyCopied'));
    } catch {
      get().appendLog(translate('statistics.log.frequencyCopyFailed'), 'info');
    }
  },

  selectFrequencyDigit: (digit) => {
    set({ selectedFrequencyDigit: digit });
  },

  loadLowHighRatio: async () => {
    const { selectedMaster } = get();
    if (!selectedMaster) {
      set({ lowHighRatio: null, lowHighRatioError: null, lowHighRatioLoading: false });
      return;
    }

    set({ lowHighRatioLoading: true, lowHighRatioError: null });
    try {
      const data = await lowHighRatioService.load(selectedMaster.masterNo);
      if (!data) {
        set({
          lowHighRatio: null,
          lowHighRatioLoading: false,
          lowHighRatioError: translate('statistics.error.noStatistics'),
        });
        return;
      }
      set({
        lowHighRatio: data,
        lowHighRatioLoading: false,
        lowHighRatioError: null,
      });
    } catch {
      set({
        lowHighRatio: null,
        lowHighRatioLoading: false,
        lowHighRatioError: translate('statistics.error.noStatistics'),
      });
    }
  },

  refreshLowHighRatio: async () => {
    get().appendLog(translate('statistics.log.lowHighRefresh'));
    await get().loadLowHighRatio();
  },

  copyLowHighRatioJson: async () => {
    const { lowHighRatio } = get();
    if (!lowHighRatio) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(lowHighRatio, null, 2));
      get().appendLog(translate('statistics.log.lowHighCopied'));
    } catch {
      get().appendLog(translate('statistics.log.lowHighCopyFailed'), 'info');
    }
  },

  loadHistory: async () => {
    set({ historyLoading: true, historyError: null });
    try {
      const items = await statisticsHistoryService.loadAll();
      set({
        history: items,
        historyLoading: false,
        selectedHistory: items[0] ?? null,
      });
    } catch {
      set({
        history: [],
        historyLoading: false,
        historyError: translate('common.loadFailed'),
        selectedHistory: null,
      });
    }
  },

  refreshHistory: async () => {
    set({ historyLoading: true, historyError: null });
    try {
      const items = await statisticsHistoryService.reload();
      set({
        history: items,
        historyLoading: false,
        selectedHistory: items[0] ?? null,
      });
      get().appendLog(translate('statistics.log.historyRefreshed'));
    } catch {
      set({ historyLoading: false, historyError: translate('common.loadFailed') });
    }
  },

  clearHistory: async () => {
    await statisticsHistoryService.clearAll();
    set({ history: [], selectedHistory: null });
    get().appendLog(translate('statistics.log.historyCleared'));
  },

  exportHistory: async () => {
    const { history } = get();
    if (history.length === 0) return;
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'statistics-history.json';
    a.click();
    URL.revokeObjectURL(url);
    get().appendLog(translate('statistics.log.historyExported'));
  },

  selectHistory: (item) => {
    set({ selectedHistory: item });
  },

  setSearchQuery: (query) => {
    set({
      searchQuery: query,
      filteredMasters: filterMasters(get().masters, query),
    });
  },

  selectMaster: (master) => {
    const { statisticsData, masterInfo } = buildRealStatistics(master);
    set({
      selectedMaster: master,
      statisticsData,
      masterInfo,
      statusMessage: translate('statistics.status.masterSelected', { no: master.masterNo }),
    });

    if (master.masterValue?.trim()) {
      const workerEnabled = useSettingsStore.getState().analysisWorkerEnabled;
      void analyzeMasterValueCachedAsync(master.masterNo, master.masterValue, workerEnabled).then(
        (result) => {
          void persistAnalysisRun(result, 'statistics', { skipHistory: true }).catch((error) => {
            notifyPersistenceFailure(error, master.masterNo, (message) => {
              get().appendLog(message);
              set({ statusMessage: message });
            });
          });
        },
      );
    }

    get().appendLog(translate('statistics.log.masterSelected', { no: master.masterNo }));
    void get().loadFrequency();
    void get().loadLowHighRatio();
    void get().loadHistory();
  },

  appendLog: (message, level = 'info') => {
    set((state) => ({ logs: [...state.logs, createLog(message, level)] }));
  },

  handleRefresh: () => {
    void get().loadMasters();
  },

  handleExport: () => {
    const { statisticsData, selectedMaster, frequencyData, lowHighRatio } = get();
    if (!selectedMaster) {
      get().appendLog(translate('statistics.log.exportSkipped'));
      return;
    }

    const payload = {
      masterNo: selectedMaster.masterNo,
      exportedAt: new Date().toISOString(),
      cards: statisticsData.cards,
      frequency: frequencyData,
      lowHighRatio,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statistics-${selectedMaster.masterNo}.json`;
    a.click();
    URL.revokeObjectURL(url);
    get().appendLog(translate('statistics.log.exported', { no: selectedMaster.masterNo }));
  },

  handleCopy: async () => {
    const { statisticsData, selectedMaster } = get();
    if (!selectedMaster) {
      get().appendLog(translate('statistics.log.copySkipped'));
      return;
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(statisticsData, null, 2));
      get().appendLog(translate('statistics.log.copied'));
    } catch {
      get().appendLog(translate('statistics.log.copyFailed'), 'info');
    }
  },

  handleReset: () => {
    set({
      selectedMaster: null,
      statisticsData: { ...EMPTY_STATISTICS_DATA },
      masterInfo: { ...EMPTY_MASTER_INFO },
      frequencyData: null,
      frequencyLoading: false,
      frequencyError: null,
      selectedFrequencyDigit: null,
      lowHighRatio: null,
      lowHighRatioLoading: false,
      lowHighRatioError: null,
      history: [],
      selectedHistory: null,
      historyLoading: false,
      historyError: null,
      statusMessage: translate('statistics.status.reset'),
    });
    get().appendLog(translate('statistics.log.reset'));
  },

  handleSearch: (query) => {
    get().setSearchQuery(query);
    get().appendLog(translate('statistics.log.search', { query }));
  },
}));
