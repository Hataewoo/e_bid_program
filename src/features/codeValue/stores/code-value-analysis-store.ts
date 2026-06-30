import { create } from 'zustand';
import { electronService } from '@/services';
import { translate } from '@/i18n/translate';
import type { Code, Master } from '@/types/electron';
import {
  buildCodeValueStats,
  createEmptyAnalysisResult,
  type AnalysisResult,
  type CodeMatchInput,
  type CodeValueStatRow,
} from '@/shared/utils/analysisEngine';
import { analyzeMasterValueCached } from '@/shared/utils/analysisCache';
import { persistAnalysisRun, notifyPersistenceFailure } from '@/shared/utils/persistAnalysisToDb';

interface CodeValueAnalysisState {
  masters: Master[];
  masterSlotRows: { masterNo: string; hasData: boolean }[];
  selectedMasterNo: string;
  codes: Code[];
  result: AnalysisResult | null;
  codeValueStats: CodeValueStatRow[];
  loading: boolean;
  codesLoading: boolean;
  statusMessage: string;

  initialize: () => Promise<void>;
  refreshFromDatabase: () => Promise<void>;
  selectMaster: (masterNo: string) => Promise<void>;
}

const TOTAL_SLOTS = 100;

function buildMasterSlotRows(masters: Master[]) {
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

export const useCodeValueAnalysisStore = create<CodeValueAnalysisState>((set, get) => ({
  masters: [],
  masterSlotRows: [],
  selectedMasterNo: '00',
  codes: [],
  result: null,
  codeValueStats: [],
  loading: false,
  codesLoading: false,
  statusMessage: translate('common.ready'),

  initialize: async () => {
    set({ loading: true, codesLoading: true, statusMessage: translate('common.loadingData') });
    try {
      const [masters, codes] = await Promise.all([
        electronService.getAllMasters(),
        electronService.getAllCodes(),
      ]);

      const sortedMasters = [...masters].sort((a, b) => a.masterNo.localeCompare(b.masterNo));
      const masterSlotRows = buildMasterSlotRows(sortedMasters);
      const selectedMasterNo = sortedMasters[0]?.masterNo ?? '00';

      set({
        masters: sortedMasters,
        masterSlotRows,
        codes,
        codesLoading: false,
        selectedMasterNo,
      });

      await get().selectMaster(selectedMasterNo);
    } catch {
      set({
        loading: false,
        codesLoading: false,
        statusMessage: translate('common.loadFailed'),
        result: createEmptyAnalysisResult('00'),
        codeValueStats: [],
      });
    }
  },

  refreshFromDatabase: async () => {
    if (get().loading) return;

    try {
      const [masters, codes] = await Promise.all([
        electronService.getAllMasters(),
        electronService.getAllCodes(),
      ]);

      const sortedMasters = [...masters].sort((a, b) => a.masterNo.localeCompare(b.masterNo));

      set({
        masters: sortedMasters,
        masterSlotRows: buildMasterSlotRows(sortedMasters),
        codes,
      });

      await get().selectMaster(get().selectedMasterNo);
    } catch {
      set({ statusMessage: translate('common.loadFailed') });
    }
  },

  selectMaster: async (masterNo) => {
    set({
      loading: true,
      selectedMasterNo: masterNo,
      statusMessage: translate('codeValue.analysis.analyzing', { no: masterNo }),
    });

    try {
      const master = await electronService.getMasterByNo(masterNo);
      const { codes } = get();

      if (!master?.masterValue?.trim()) {
        set({
          loading: false,
          result: createEmptyAnalysisResult(masterNo),
          codeValueStats: [],
          statusMessage: translate('codeValue.analysis.noMasterData', { no: masterNo }),
        });
        return;
      }

      const result = analyzeMasterValueCached(masterNo, master.masterValue);
      const codeValueStats = buildCodeValueStats(result, toCodeMatchInputs(codes));

      set({
        loading: false,
        result,
        codeValueStats,
        statusMessage: translate('codeValue.analysis.resultSummary', {
          no: masterNo,
          digits: result.totalCount,
          matches: codeValueStats.length,
        }),
      });

      void persistAnalysisRun(result, 'code-value', { skipStatistics: true }).catch((error) => {
        notifyPersistenceFailure(error, masterNo, (message) => {
          set({ statusMessage: message });
        });
      });
    } catch {
      set({
        loading: false,
        result: createEmptyAnalysisResult(masterNo),
        codeValueStats: [],
        statusMessage: translate('codeValue.analysis.failed', { no: masterNo }),
      });
    }
  },
}));
