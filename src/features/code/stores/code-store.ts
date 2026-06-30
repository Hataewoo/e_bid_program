import { create } from 'zustand';
import { syncAnalysisAfterCodeChange } from '@/features/analysis/stores/analysis-store';
import { codeService } from '../services/code-service';
import { confirmDanger } from '@/lib/confirm-dialog';
import { translate } from '@/i18n/translate';
import { formatAppErrors } from '@/i18n/format-app-errors';
import type { CodeFormValues, CodeGridRow, CodeRecord } from '../types/code.types';
import { EMPTY_CODE_FORM } from '../types/code.types';

function toFormValues(record: CodeRecord | null): CodeFormValues {
  return codeService.toFormValues(
    record
      ? {
          id: record.id,
          code: record.code,
          type: record.type,
          description: record.description,
          createdAt: '',
          updatedAt: '',
        }
      : null,
  );
}

interface CodeState {
  codes: CodeRecord[];
  gridRows: CodeGridRow[];
  selectedId: number | null;
  formValues: CodeFormValues;
  isDirty: boolean;
  isLoading: boolean;
  isSaving: boolean;
  statusMessage: string;
  recordCount: number;
  isWindowOpen: boolean;

  loadCodes: () => Promise<void>;
  selectCode: (id: number) => void;
  setFormValues: (values: Partial<CodeFormValues>) => void;
  handleNew: () => void;
  handleConfirm: () => Promise<boolean>;
  handleDelete: () => Promise<boolean>;
  handleClose: () => void;
  openWindow: () => void;
  closeWindow: () => void;
}

export const useCodeStore = create<CodeState>((set, get) => ({
  codes: [],
  gridRows: [],
  selectedId: null,
  formValues: { ...EMPTY_CODE_FORM },
  isDirty: false,
  isLoading: true,
  isSaving: false,
  statusMessage: translate('common.ready'),
  recordCount: 0,
  isWindowOpen: true,

  loadCodes: async () => {
    set({ isLoading: true, statusMessage: translate('common.loadingData') });

    try {
      const allCodes = await codeService.loadAll();
      const codes = allCodes.map((c) => codeService.toCodeRecord(c));
      const gridRows = codeService.buildGridRows(allCodes);
      const first = codes[0] ?? null;

      set({
        codes,
        gridRows,
        recordCount: codes.length,
        selectedId: first?.id ?? null,
        formValues: toFormValues(first),
        isLoading: false,
        isDirty: false,
        statusMessage: translate('common.recordCount', { count: codes.length }),
      });
    } catch {
      set({ isLoading: false, statusMessage: translate('common.loadFailed') });
    }
  },

  selectCode: (id) => {
    const selected = get().codes.find((c) => c.id === id) ?? null;
    set({
      selectedId: id,
      formValues: toFormValues(selected),
      isDirty: false,
      statusMessage: selected
        ? translate('code.status.selected', { code: selected.code })
        : translate('code.status.selectedGeneric'),
    });
  },

  setFormValues: (values) => {
    set((state) => ({
      formValues: { ...state.formValues, ...values },
      isDirty: true,
    }));
  },

  handleNew: () => {
    set({
      selectedId: null,
      formValues: codeService.createEmptyForm(),
      isDirty: true,
      statusMessage: translate('code.status.newInput'),
    });
  },

  handleConfirm: async () => {
    const { formValues } = get();

    if (!formValues.code.trim()) {
      set({ statusMessage: translate('code.status.codeRequired') });
      return false;
    }
    if (!formValues.type.trim()) {
      set({ statusMessage: translate('code.status.typeRequired') });
      return false;
    }

    set({ isSaving: true, statusMessage: translate('common.saving') });

    const result = await codeService.save(formValues);

    if (!result.success) {
      set({
        isSaving: false,
        statusMessage: formatAppErrors(result.errors, 'error.saveFailed'),
      });
      return false;
    }

    await get().loadCodes();
    await syncAnalysisAfterCodeChange();

    const saved = codeService.toCodeRecord(result.data!);
    set({
      isSaving: false,
      isDirty: false,
      selectedId: saved.id,
      formValues: toFormValues(saved),
      statusMessage: translate('code.status.saved', { code: saved.code }),
    });

    return true;
  },

  handleDelete: async () => {
    const { selectedId, formValues } = get();
    const id = selectedId ?? formValues.id;

    if (!id) {
      set({ statusMessage: translate('code.status.noDeleteTarget') });
      return false;
    }

    const target = get().codes.find((c) => c.id === id);
    const label = target?.code ?? `#${id}`;

    const confirmed = await confirmDanger(translate('code.deleteConfirm', { label }));
    if (!confirmed) {
      return false;
    }

    set({ isSaving: true, statusMessage: translate('common.deleting') });

    const result = await codeService.delete(id);

    if (!result.success) {
      set({
        isSaving: false,
        statusMessage: formatAppErrors(result.errors, 'error.deleteFailed'),
      });
      return false;
    }

    await get().loadCodes();
    await syncAnalysisAfterCodeChange();

    set({
      isSaving: false,
      isDirty: false,
      statusMessage: translate('code.status.deleted', { code: label }),
    });

    return true;
  },

  handleClose: () => {
    const { selectedId, codes, isDirty } = get();

    if (isDirty && selectedId !== null) {
      const selected = codes.find((c) => c.id === selectedId) ?? null;
      set({
        formValues: toFormValues(selected),
        isDirty: false,
        statusMessage: translate('code.status.cancelInput'),
      });
      return;
    }

    if (isDirty) {
      set({
        formValues: codeService.createEmptyForm(),
        selectedId: null,
        isDirty: false,
        statusMessage: translate('code.status.cancelNewInput'),
      });
      return;
    }

    set({ isWindowOpen: false, statusMessage: translate('code.status.windowClosed') });
  },

  openWindow: () => {
    set({ isWindowOpen: true, statusMessage: translate('common.ready') });
  },

  closeWindow: () => {
    set({ isWindowOpen: false });
  },
}));
