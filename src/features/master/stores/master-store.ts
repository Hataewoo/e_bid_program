import { create } from 'zustand';
import { masterService } from '../services/master-service';
import { invalidateAnalysisCacheForMaster } from '@/features/analysis/services/analysis-cache-bridge';
import { confirmDanger } from '@/lib/confirm-dialog';
import { translate } from '@/i18n/translate';
import { formatAppErrors } from '@/i18n/format-app-errors';
import { formatMasterValidationSummary } from '../utils/format-master-validation';
import type { DataValidationResult } from '@/types/electron';
import type { MasterGridRow, MasterFormValues } from '../types/master.types';
import { EMPTY_FORM } from '../types/master.types';

interface MasterState {
  gridRows: MasterGridRow[];
  selectedMasterNo: string;
  searchMasterNo: string;
  formValues: MasterFormValues;
  isDirty: boolean;
  isLoading: boolean;
  isSaving: boolean;
  statusMessage: string;
  validationResult: DataValidationResult | null;
  savedCount: number;
  recordCount: number;

  loadMasters: () => Promise<void>;
  selectMaster: (masterNo: string) => Promise<void>;
  setSearchMasterNo: (masterNo: string) => void;
  setFormValues: (values: Partial<MasterFormValues>) => void;
  resetForm: () => void;
  handleNew: () => void;
  handleSave: () => Promise<boolean>;
  trySave: () => Promise<boolean>;
  saveCurrent: (patch: Partial<MasterFormValues>) => Promise<boolean>;
  handleConfirm: () => Promise<boolean>;
  handleClose: () => Promise<void>;
  handleDelete: () => Promise<boolean>;
  handleValidate: () => Promise<void>;
  setStatusMessage: (message: string) => void;
}

const TOTAL_MASTER_SLOTS = 100;

export const useMasterStore = create<MasterState>((set, get) => ({
  gridRows: [],
  selectedMasterNo: '00',
  searchMasterNo: '',
  formValues: { ...EMPTY_FORM },
  isDirty: false,
  isLoading: true,
  isSaving: false,
  statusMessage: translate('common.ready'),
  validationResult: null,
  savedCount: 0,
  recordCount: TOTAL_MASTER_SLOTS,

  loadMasters: async () => {
    set({ isLoading: true, statusMessage: translate('common.loadingData') });
    try {
      const masters = await masterService.loadAll();
      const gridRows = masterService.buildGridRows(masters);
      const savedCount = masters.length;
      const { selectedMasterNo } = get();
      const selected = masters.find((m) => m.masterNo === selectedMasterNo) ?? null;
      const formValues = masterService.toFormValues(selected, selectedMasterNo);

      set({
        gridRows,
        formValues,
        savedCount,
        recordCount: TOTAL_MASTER_SLOTS,
        isLoading: false,
        isDirty: false,
        statusMessage: translate('common.recordCount', { count: TOTAL_MASTER_SLOTS }),
      });
    } catch {
      set({ isLoading: false, statusMessage: translate('common.loadFailed') });
    }
  },

  selectMaster: async (masterNo) => {
    const masters = await masterService.loadAll();
    const selected = masters.find((m) => m.masterNo === masterNo) ?? null;
    const formValues = masterService.toFormValues(selected, masterNo);

    set({
      selectedMasterNo: masterNo,
      formValues,
      isDirty: false,
      validationResult: null,
      statusMessage: selected
        ? translate('master.status.selected', { no: masterNo })
        : translate('master.status.unregistered', { no: masterNo }),
    });
  },

  setSearchMasterNo: (masterNo) => {
    set({ searchMasterNo: masterNo });
  },

  setFormValues: (values) => {
    set((state) => ({
      formValues: { ...state.formValues, ...values },
      isDirty: true,
      validationResult: null,
    }));
  },

  resetForm: () => {
    const { selectedMasterNo } = get();
    set({
      formValues: { ...EMPTY_FORM, masterNo: selectedMasterNo },
      isDirty: false,
      validationResult: null,
    });
  },

  handleNew: () => {
    const { selectedMasterNo } = get();
    set({
      formValues: { id: null, masterNo: selectedMasterNo, masterValue: '', memo: '' },
      isDirty: true,
      validationResult: null,
      statusMessage: translate('master.status.newInput', { no: selectedMasterNo }),
    });
  },

  handleSave: async () => {
    const { formValues } = get();
    set({ isSaving: true, statusMessage: translate('common.saving') });

    const result = await masterService.save(formValues);

    if (!result.success) {
      set({
        isSaving: false,
        statusMessage: formatAppErrors(result.errors, 'error.saveFailed'),
      });
      return false;
    }

    await get().loadMasters();
    invalidateAnalysisCacheForMaster(result.data!.masterNo);
    set({
      isSaving: false,
      isDirty: false,
      selectedMasterNo: result.data!.masterNo,
      formValues: masterService.toFormValues(result.data!, result.data!.masterNo),
      statusMessage: translate('master.status.saved', { no: result.data!.masterNo }),
    });
    return true;
  },

  trySave: async () => {
    const { isSaving, isDirty } = get();
    if (isSaving || !isDirty) return false;
    return get().handleSave();
  },

  saveCurrent: async (patch) => {
    if (get().isSaving) return false;
    set((state) => ({
      formValues: { ...state.formValues, ...patch },
    }));
    return get().handleSave();
  },

  handleConfirm: async () => {
    return get().trySave();
  },

  handleClose: async () => {
    const { selectedMasterNo, isDirty } = get();

    if (isDirty) {
      await get().selectMaster(selectedMasterNo);
      set({
        validationResult: null,
        statusMessage: translate('master.status.cancelInput', { no: selectedMasterNo }),
      });
      return;
    }

    set({
      validationResult: null,
      statusMessage: translate('common.ready'),
    });
  },

  handleDelete: async () => {
    const { formValues } = get();
    if (!formValues.id) {
      set({ statusMessage: translate('master.status.noDeleteTarget') });
      return false;
    }

    const confirmed = await confirmDanger(
      translate('master.deleteConfirm', { no: formValues.masterNo }),
    );
    if (!confirmed) return false;

    set({ isSaving: true, statusMessage: translate('common.deleting') });
    const result = await masterService.delete(formValues.masterNo);

    if (!result.success) {
      set({
        isSaving: false,
        statusMessage: formatAppErrors(result.errors, 'error.deleteFailed'),
      });
      return false;
    }

    await get().loadMasters();
    invalidateAnalysisCacheForMaster(formValues.masterNo);
    set({
      isSaving: false,
      isDirty: false,
      formValues: { id: null, masterNo: formValues.masterNo, masterValue: '', memo: '' },
      statusMessage: translate('master.status.deleted', { no: formValues.masterNo }),
    });
    return true;
  },

  handleValidate: async () => {
    const { formValues } = get();
    set({ statusMessage: translate('master.status.validating') });

    const result = await masterService.validateData(formValues);
    const parsedLength = formValues.masterValue
      .replace(/[\s,\r\n\t;|]+/g, '')
      .replace(/\D/g, '').length;

    const checkSummary = formatMasterValidationSummary(result, parsedLength);

    set({
      validationResult: result,
      statusMessage: result.valid
        ? translate('master.validation.passDetail', { summary: checkSummary })
        : translate('master.validation.failDetail', {
            errors: formatAppErrors(result.errors),
          }),
    });
  },

  setStatusMessage: (message) => set({ statusMessage: message }),
}));
