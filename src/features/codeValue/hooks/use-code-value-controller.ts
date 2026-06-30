import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useCodeValueStore } from '../stores/code-value-store';
import type { CodeValueFormValues, CodeValueSearchParams } from '../types/code-value.types';

export function useCodeValueController() {
  const formValues = useCodeValueStore((s) => s.formValues);
  const searchParams = useCodeValueStore((s) => s.searchParams);
  const isDirty = useCodeValueStore((s) => s.isDirty);
  const isSaving = useCodeValueStore((s) => s.isSaving);
  const loadItems = useCodeValueStore((s) => s.loadItems);
  const setSearchParams = useCodeValueStore((s) => s.setSearchParams);
  const setFormValues = useCodeValueStore((s) => s.setFormValues);
  const handleNew = useCodeValueStore((s) => s.handleNew);
  const handleSave = useCodeValueStore((s) => s.handleSave);
  const handleDelete = useCodeValueStore((s) => s.handleDelete);
  const handleRefresh = useCodeValueStore((s) => s.handleRefresh);

  const form = useForm<CodeValueFormValues>({
    defaultValues: formValues,
  });

  const searchForm = useForm<CodeValueSearchParams>({
    defaultValues: searchParams,
  });

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    form.reset(formValues);
  }, [formValues, form]);

  const query = searchForm.watch('query');

  useEffect(() => {
    setSearchParams({ query: query ?? '' });
  }, [query, setSearchParams]);

  return {
    form,
    searchForm,
    formValues,
    isDirty,
    isSaving,
    updateForm: setFormValues,
    handleNew,
    handleSave,
    handleDelete,
    handleRefresh,
  };
}

export type CodeValueController = ReturnType<typeof useCodeValueController>;
