import { create } from 'zustand';
import { codeValueService } from '../services/code-value-service';
import { formatAppErrors } from '@/i18n/format-app-errors';
import { translate } from '@/i18n/translate';
import type { CodeValue } from '@/types/electron';
import type { CodeValueFormValues, CodeValueSearchParams } from '../types/code-value.types';
import { EMPTY_SEARCH } from '../types/code-value.types';

interface CodeValueState {
  allItems: CodeValue[];
  filteredItems: CodeValue[];
  selectedId: number | null;
  formValues: CodeValueFormValues;
  searchParams: CodeValueSearchParams;
  isDirty: boolean;
  isLoading: boolean;
  isSaving: boolean;
  statusMessage: string;

  loadItems: () => Promise<void>;
  setSearchParams: (params: Partial<CodeValueSearchParams>) => void;
  selectItem: (id: number) => void;
  setFormValues: (values: Partial<CodeValueFormValues>) => void;
  handleNew: () => void;
  handleSave: () => Promise<boolean>;
  handleDelete: () => Promise<boolean>;
  handleRefresh: () => Promise<void>;
}

function applyFilter(allItems: CodeValue[], search: CodeValueSearchParams): CodeValue[] {
  return codeValueService.filterItems(allItems, search);
}

function recordCountMessage(filtered: number, total: number): string {
  return translate('codeValue.status.recordCountFiltered', { filtered, total });
}

export const useCodeValueStore = create<CodeValueState>((set, get) => ({
  allItems: [],
  filteredItems: [],
  selectedId: null,
  formValues: codeValueService.createEmptyForm(),
  searchParams: { ...EMPTY_SEARCH },
  isDirty: false,
  isLoading: true,
  isSaving: false,
  statusMessage: translate('common.ready'),

  loadItems: async () => {
    set({ isLoading: true, statusMessage: translate('common.loadingData') });
    try {
      const allItems = await codeValueService.loadAll();
      const { searchParams, selectedId } = get();
      const filteredItems = applyFilter(allItems, searchParams);

      let formValues = codeValueService.createEmptyForm();
      let newSelectedId = selectedId;

      if (selectedId !== null) {
        const selected = allItems.find((item) => item.id === selectedId) ?? null;
        if (selected) {
          formValues = codeValueService.toFormValues(selected);
        } else {
          newSelectedId = null;
        }
      } else if (filteredItems.length > 0) {
        newSelectedId = filteredItems[0].id;
        formValues = codeValueService.toFormValues(filteredItems[0]);
      }

      set({
        allItems,
        filteredItems,
        selectedId: newSelectedId,
        formValues,
        isLoading: false,
        isDirty: false,
        statusMessage: recordCountMessage(filteredItems.length, allItems.length),
      });
    } catch {
      set({ isLoading: false, statusMessage: translate('common.loadFailed') });
    }
  },

  setSearchParams: (params) => {
    const searchParams = { ...get().searchParams, ...params };
    const filteredItems = applyFilter(get().allItems, searchParams);
    set({
      searchParams,
      filteredItems,
      statusMessage: recordCountMessage(filteredItems.length, get().allItems.length),
    });
  },

  selectItem: (id) => {
    const selected = get().allItems.find((item) => item.id === id) ?? null;
    set({
      selectedId: id,
      formValues: codeValueService.toFormValues(selected),
      isDirty: false,
      statusMessage: selected
        ? translate('codeValue.status.selected', { id: selected.id })
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
      formValues: codeValueService.createEmptyForm(),
      isDirty: true,
      statusMessage: translate('codeValue.status.newInput'),
    });
  },

  handleSave: async () => {
    const { formValues } = get();
    set({ isSaving: true, statusMessage: translate('common.saving') });

    const result = await codeValueService.save(formValues);

    if (!result.success) {
      set({
        isSaving: false,
        statusMessage: formatAppErrors(result.errors, 'error.saveFailed'),
      });
      return false;
    }

    await get().loadItems();
    set({
      isSaving: false,
      isDirty: false,
      selectedId: result.data!.id,
      formValues: codeValueService.toFormValues(result.data!),
      statusMessage: translate('codeValue.status.saved', { id: result.data!.id }),
    });
    return true;
  },

  handleDelete: async () => {
    const { formValues } = get();
    if (!formValues.id) {
      set({ statusMessage: translate('master.status.noDeleteTarget') });
      return false;
    }

    set({ isSaving: true, statusMessage: translate('common.deleting') });
    const result = await codeValueService.delete(formValues.id);

    if (!result.success) {
      set({
        isSaving: false,
        statusMessage: formatAppErrors(result.errors, 'error.deleteFailed'),
      });
      return false;
    }

    set({ selectedId: null });
    await get().loadItems();
    set({
      isSaving: false,
      isDirty: false,
      formValues: codeValueService.createEmptyForm(),
      statusMessage: translate('codeValue.status.deleted'),
    });
    return true;
  },

  handleRefresh: async () => {
    await get().loadItems();
    set({ statusMessage: translate('codeValue.status.refreshDone') });
  },
}));
