import { useCodeStore } from '../stores/code-store';
import { useI18n } from '@/i18n/use-i18n';

export function CodeRegistrationForm() {
  const { t } = useI18n();
  const formValues = useCodeStore((s) => s.formValues);
  const setFormValues = useCodeStore((s) => s.setFormValues);
  const isSaving = useCodeStore((s) => s.isSaving);
  const handleNew = useCodeStore((s) => s.handleNew);
  const handleConfirm = useCodeStore((s) => s.handleConfirm);
  const handleDelete = useCodeStore((s) => s.handleDelete);
  const handleClose = useCodeStore((s) => s.handleClose);
  const selectedId = useCodeStore((s) => s.selectedId);

  return (
    <div className="border-b border-border bg-[#ece9d8] px-2 py-2">
      <div className="flex gap-2">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <div className="flex items-center gap-1">
              <label htmlFor="codeName" className="win-label w-10 shrink-0">
                {t('code.label.name')}
              </label>
              <input
                id="codeName"
                type="text"
                className="win-input w-24 font-mono"
                value={formValues.code}
                onChange={(e) => setFormValues({ code: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-1">
              <label htmlFor="codeType" className="win-label w-10 shrink-0">
                {t('code.label.name')}
              </label>
              <input
                id="codeType"
                type="text"
                className="win-input w-24"
                value={formValues.type}
                onChange={(e) => setFormValues({ type: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-1">
            <label htmlFor="codeDescription" className="win-label w-10 shrink-0">
              {t('code.label.description')}
            </label>
            <input
              id="codeDescription"
              type="text"
              className="win-input min-w-0 flex-1"
              value={formValues.description}
              onChange={(e) => setFormValues({ description: e.target.value })}
            />
          </div>
        </div>

        <div className="flex shrink-0 flex-col justify-end gap-1">
          <button type="button" className="win-button" onClick={handleNew} disabled={isSaving}>
            {t('code.newInput')}
          </button>
          <button
            type="button"
            className="win-button win-button-primary"
            onClick={() => void handleConfirm()}
            disabled={isSaving}
          >
            {t('common.confirm')}
          </button>
          <button
            type="button"
            className="win-button win-button-danger"
            onClick={() => void handleDelete()}
            disabled={isSaving || !selectedId}
          >
            {t('master.delete')}
          </button>
          <button type="button" className="win-button" onClick={handleClose} disabled={isSaving}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
