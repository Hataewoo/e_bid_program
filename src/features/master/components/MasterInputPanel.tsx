import { useEffect } from 'react';
import { MasterValueTextarea } from '@/components/ui/MasterValueTextarea';
import { useMasterStore } from '../stores/master-store';
import { formatAppErrors } from '@/i18n/format-app-errors';
import { useI18n } from '@/i18n/use-i18n';
import { masterValidationTag } from '../utils/format-master-validation';
import { MASTER_VALUE_MAX_LENGTH, normalizeMasterValue } from '../services/validation-service';

function isEnterKey(event: KeyboardEvent): boolean {
  return event.key === 'Enter' || event.code === 'Enter' || event.code === 'NumpadEnter';
}

export function MasterInputPanel() {
  const { t } = useI18n();
  const formValues = useMasterStore((s) => s.formValues);
  const selectedMasterNo = useMasterStore((s) => s.selectedMasterNo);
  const setFormValues = useMasterStore((s) => s.setFormValues);
  const validationResult = useMasterStore((s) => s.validationResult);
  const isDirty = useMasterStore((s) => s.isDirty);
  const isSaving = useMasterStore((s) => s.isSaving);
  const handleValidate = useMasterStore((s) => s.handleValidate);
  const trySave = useMasterStore((s) => s.trySave);
  const handleClose = useMasterStore((s) => s.handleClose);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isEnterKey(event)) return;
      if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.isComposing) return;

      const target = event.target;
      if (!(target instanceof HTMLTextAreaElement) && !(target instanceof HTMLInputElement)) {
        return;
      }

      if (target.id === 'masterValue' && target instanceof HTMLTextAreaElement) {
        event.preventDefault();
        event.stopPropagation();
        const normalized = normalizeMasterValue(target.value);
        void useMasterStore.getState().saveCurrent({ masterValue: normalized });
        return;
      }

      if (target.id === 'memo' && target instanceof HTMLInputElement) {
        event.preventDefault();
        event.stopPropagation();
        void useMasterStore.getState().saveCurrent({ memo: target.value });
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  const valueLength = normalizeMasterValue(formValues.masterValue).length;

  return (
    <div className="flex h-full flex-col bg-surface-elevated">
      <div className="border-b border-border bg-surface-muted px-3 py-1.5">
        <div className="text-xs font-semibold text-content">{t('master.panel.inputTitle')}</div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-3 pt-2">
        <label htmlFor="masterValue" className="win-label mb-1">
          {t('master.label.valueDot')}
        </label>
        <MasterValueTextarea
          id="masterValue"
          value={formValues.masterValue}
          focusKey={selectedMasterNo}
          onChange={(normalized) => setFormValues({ masterValue: normalized })}
        />
        <div className="mt-0.5 text-right text-sm text-content-muted">
          {t('master.digitCount', { current: valueLength, max: MASTER_VALUE_MAX_LENGTH })}
        </div>
      </div>

      <div className="border-t border-border px-3 py-2">
        <label htmlFor="memo" className="win-label mb-1">
          {t('master.label.memoDot')}
        </label>
        <input
          id="memo"
          type="text"
          className="win-input w-full"
          value={formValues.memo}
          onChange={(e) => setFormValues({ memo: e.target.value })}
        />
      </div>

      {validationResult && (
        <div
          className={`mx-3 mb-1 border px-2 py-1.5 text-xs ${
            validationResult.valid
              ? 'bg-status-success/5 border-status-success text-status-success'
              : 'bg-status-error/5 border-status-error text-status-error'
          }`}
        >
          <span className="font-medium">
            {validationResult.valid ? t('master.validation.pass') : t('master.validation.fail')}
          </span>
          <span className="ml-2">
            {masterValidationTag(validationResult.checks.notEmpty, 'master.check.tag.valueExists')}{' '}
            | {masterValidationTag(validationResult.checks.isNumeric, 'master.check.tag.numeric')} |{' '}
            {masterValidationTag(validationResult.checks.lengthValid, 'master.check.tag.lengthOk')}
          </span>
          {validationResult.errors.length > 0 && (
            <div className="mt-0.5">{formatAppErrors(validationResult.errors)}</div>
          )}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between border-t border-border bg-surface-muted px-3 py-2">
        <button type="button" className="win-button" onClick={handleValidate} disabled={isSaving}>
          {t('master.validate')}
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            className="win-button win-button-primary"
            onClick={() => void trySave()}
            disabled={isSaving || !isDirty}
          >
            {t('master.save')}
          </button>
          <button type="button" className="win-button" onClick={handleClose} disabled={isSaving}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
