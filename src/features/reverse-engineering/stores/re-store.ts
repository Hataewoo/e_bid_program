import { create } from 'zustand';
import { masterService } from '@/features/master/services/master-service';
import { translate } from '@/i18n/translate';
import { analysisService } from '../services/analysis-service';
import { exportService } from '../services/export-service';
import type { FullAnalysisResult, MasterListItem } from '../types/analysis.types';

interface ReverseEngineeringState {
  masterList: MasterListItem[];
  selectedMasterNo: string;
  masterValue: string;
  analysisResult: FullAnalysisResult | null;
  isLoading: boolean;
  statusMessage: string;

  loadMasters: () => Promise<void>;
  selectMaster: (masterNo: string) => void;
  copyJson: () => Promise<void>;
  exportJson: () => void;
  exportTxt: () => void;
  exportCsv: () => void;
}

function buildMasterList(
  masters: Awaited<ReturnType<typeof masterService.loadAll>>,
): MasterListItem[] {
  const rows = masterService.buildGridRows(masters);
  const valueMap = new Map(masters.map((m) => [m.masterNo, m.masterValue]));

  return rows.map((row) => ({
    index: row.index,
    masterNo: row.masterNo,
    hasData: row.hasData,
    valueLength: valueMap.get(row.masterNo)?.replace(/\s/g, '').length ?? 0,
  }));
}

function runAnalysis(masterNo: string, masterValue: string): FullAnalysisResult | null {
  return analysisService.analyze(masterNo, masterValue);
}

function analyzedStatus(masterNo: string, analysisResult: FullAnalysisResult | null): string {
  const length = analysisResult?.step1.length ?? 0;
  return translate('re.status.analyzed', { no: masterNo, length });
}

function noDataStatus(masterNo: string): string {
  return translate('re.status.noData', { no: masterNo });
}

export const useReverseEngineeringStore = create<ReverseEngineeringState>((set, get) => ({
  masterList: [],
  selectedMasterNo: '00',
  masterValue: '',
  analysisResult: null,
  isLoading: true,
  statusMessage: translate('common.ready'),

  loadMasters: async () => {
    set({ isLoading: true, statusMessage: translate('re.status.loadingMasters') });
    try {
      const masters = await masterService.loadAll();
      const masterList = buildMasterList(masters);
      const { selectedMasterNo } = get();
      const selected = masters.find((m) => m.masterNo === selectedMasterNo);
      const masterValue = selected?.masterValue ?? '';
      const analysisResult = runAnalysis(selectedMasterNo, masterValue);

      set({
        masterList,
        masterValue,
        analysisResult,
        isLoading: false,
        statusMessage: selected
          ? analyzedStatus(selectedMasterNo, analysisResult)
          : noDataStatus(selectedMasterNo),
      });
    } catch {
      set({ isLoading: false, statusMessage: translate('common.loadFailed') });
    }
  },

  selectMaster: (masterNo) => {
    masterService.loadAll().then((masters) => {
      const selected = masters.find((m) => m.masterNo === masterNo);
      const masterValue = selected?.masterValue ?? '';
      const analysisResult = runAnalysis(masterNo, masterValue);

      set({
        selectedMasterNo: masterNo,
        masterValue,
        analysisResult,
        statusMessage: selected ? analyzedStatus(masterNo, analysisResult) : noDataStatus(masterNo),
      });
    });
  },

  copyJson: async () => {
    const { analysisResult } = get();
    if (!analysisResult) {
      set({ statusMessage: translate('re.status.noCopyTarget') });
      return;
    }
    const ok = await exportService.copyToClipboard(analysisResult);
    set({
      statusMessage: ok ? translate('re.status.copyOk') : translate('re.status.copyFail'),
    });
  },

  exportJson: () => {
    const { analysisResult, selectedMasterNo } = get();
    if (!analysisResult) {
      set({ statusMessage: translate('re.status.noExportTarget') });
      return;
    }
    exportService.exportJson(analysisResult);
    set({ statusMessage: translate('re.status.exportJson', { no: selectedMasterNo }) });
  },

  exportTxt: () => {
    const { analysisResult, selectedMasterNo } = get();
    if (!analysisResult) {
      set({ statusMessage: translate('re.status.noExportTarget') });
      return;
    }
    exportService.exportTxt(analysisResult);
    set({ statusMessage: translate('re.status.exportTxt', { no: selectedMasterNo }) });
  },

  exportCsv: () => {
    const { analysisResult, selectedMasterNo } = get();
    if (!analysisResult) {
      set({ statusMessage: translate('re.status.noExportTarget') });
      return;
    }
    exportService.exportCsv(analysisResult);
    set({ statusMessage: translate('re.status.exportCsv', { no: selectedMasterNo }) });
  },
}));
