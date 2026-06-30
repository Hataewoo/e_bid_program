import { Controller } from 'react-hook-form';
import { useI18n } from '@/i18n/use-i18n';
import type { CodeValueController } from '../hooks/use-code-value-controller';

interface CodeValueToolbarProps {
  controller: CodeValueController;
}

export function CodeValueToolbar({ controller }: CodeValueToolbarProps) {
  const { t } = useI18n();
  const {
    searchForm,
    handleNew,
    handleSave,
    handleDelete,
    handleRefresh,
    isSaving,
    isDirty,
    formValues,
  } = controller;

  return (
    <div className="win-toolbar flex flex-col gap-2 px-3 py-2">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="searchQuery" className="win-label shrink-0">
            {t('codeValue.mgmt.search')}
          </label>
          <Controller
            name="query"
            control={searchForm.control}
            render={({ field }) => (
              <input
                {...field}
                id="searchQuery"
                type="text"
                placeholder={t('codeValue.mgmt.searchPlaceholder')}
                className="win-input w-64"
              />
            )}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button type="button" className="win-button" onClick={handleNew} disabled={isSaving}>
            {t('master.new')}
          </button>
          <button
            type="button"
            className="win-button win-button-primary"
            onClick={handleSave}
            disabled={isSaving || !isDirty}
          >
            {t('master.save')}
          </button>
          <button
            type="button"
            className="win-button win-button-danger"
            onClick={handleDelete}
            disabled={isSaving || !formValues.id}
          >
            {t('master.delete')}
          </button>
          <button type="button" className="win-button" onClick={handleRefresh} disabled={isSaving}>
            {t('codeValue.mgmt.refresh')}
          </button>
        </div>
      </div>
    </div>
  );
}
