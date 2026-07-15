import { MasterValueTextarea } from '@/components/ui/MasterValueTextarea';
import { useMasterStore } from '../stores/master-store';
import { formatAppErrors } from '@/i18n/format-app-errors';
import { useI18n } from '@/i18n/use-i18n';
import { masterValidationTag } from '../utils/format-master-validation';
import { MASTER_VALUE_MAX_LENGTH } from '../services/validation-service';
import { normalizeMasterValue } from '../services/validation-service';

export function MasterInputPanel() {
  const { t } = useI18n();
  const formValues = useMasterStore((s) => s.formValues);
  const setFormValues = useMasterStore((s) => s.setFormValues);
  const validationResult = useMasterStore((s) => s.validationResult);
  const isSaving = useMasterStore((s) => s.isSaving);
  const handleValidate = useMasterStore((s) => s.handleValidate);
  const handleConfirm = useMasterStore((s) => s.handleConfirm);
  const handleClose = useMasterStore((s) => s.handleClose);

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
            onClick={handleConfirm}
            disabled={isSaving}
          >
            {t('common.confirm')}
          </button>
          <button type="button" className="win-button" onClick={handleClose} disabled={isSaving}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
