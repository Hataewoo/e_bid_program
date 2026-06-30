import { useForm, Controller } from 'react-hook-form';
import { useEffect } from 'react';
import { useMasterStore } from '../stores/master-store';
import { formatAppErrors } from '@/i18n/format-app-errors';
import { useI18n } from '@/i18n/use-i18n';
import { masterValidationTag } from '../utils/format-master-validation';
import { MASTER_NO_OPTIONS, type MasterFormValues } from '../types/master.types';
import { MASTER_VALUE_MAX_LENGTH } from '../services/validation-service';
import { normalizeMasterValue } from '../services/validation-service';

export function MasterEditor() {
  const { t } = useI18n();
  const formValues = useMasterStore((s) => s.formValues);
  const setFormValues = useMasterStore((s) => s.setFormValues);
  const selectMaster = useMasterStore((s) => s.selectMaster);
  const validationResult = useMasterStore((s) => s.validationResult);

  const { control, reset, watch } = useForm<MasterFormValues>({
    defaultValues: formValues,
  });

  useEffect(() => {
    reset(formValues);
  }, [formValues, reset]);

  const masterValue = watch('masterValue');
  const valueLength = normalizeMasterValue(masterValue ?? '').length;

  return (
    <div className="flex h-full flex-col">
      <div className="win-panel-header">{t('master.panel.select')}</div>

      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <label htmlFor="masterNo" className="win-label shrink-0">
          {t('master.label.masterNo')}
        </label>
        <Controller
          name="masterNo"
          control={control}
          render={({ field }) => (
            <select
              {...field}
              id="masterNo"
              className="win-combobox"
              onChange={(e) => {
                field.onChange(e);
                selectMaster(e.target.value);
              }}
            >
              {MASTER_NO_OPTIONS.map((no) => (
                <option key={no} value={no}>
                  {no}
                </option>
              ))}
            </select>
          )}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-3 py-2">
        <label htmlFor="masterValue" className="win-label mb-1">
          {t('master.label.value')}
        </label>
        <Controller
          name="masterValue"
          control={control}
          render={({ field }) => (
            <textarea
              {...field}
              id="masterValue"
              className="win-textarea-master flex-1"
              wrap="off"
              spellCheck={false}
              maxLength={MASTER_VALUE_MAX_LENGTH + 100}
              onChange={(e) => {
                field.onChange(e);
                setFormValues({ masterValue: e.target.value });
              }}
            />
          )}
        />
        <div className="mt-1 flex justify-between text-xs text-content-muted">
          <span>
            {t('master.digitCount', { current: valueLength, max: MASTER_VALUE_MAX_LENGTH })}
          </span>
          <span>{t('master.wrapOff')}</span>
        </div>
      </div>

      <div className="border-t border-border px-3 py-2">
        <label htmlFor="memo" className="win-label mb-1">
          {t('master.label.memo')}
        </label>
        <Controller
          name="memo"
          control={control}
          render={({ field }) => (
            <input
              {...field}
              id="memo"
              type="text"
              className="win-input w-full"
              onChange={(e) => {
                field.onChange(e);
                setFormValues({ memo: e.target.value });
              }}
            />
          )}
        />
      </div>

      {validationResult && (
        <div
          className={`mx-3 mb-2 rounded border px-3 py-2 text-xs ${
            validationResult.valid
              ? 'border-status-success text-status-success'
              : 'border-status-error text-status-error'
          }`}
        >
          <div className="font-medium">
            {validationResult.valid ? t('master.validation.pass') : t('master.validation.fail')}
          </div>
          <div className="mt-1">
            {masterValidationTag(validationResult.checks.notEmpty, 'master.check.tag.valueExists')}{' '}
            | {masterValidationTag(validationResult.checks.isNumeric, 'master.check.tag.numeric')} |{' '}
            {masterValidationTag(validationResult.checks.lengthValid, 'master.check.tag.lengthOk')}
          </div>
          {validationResult.errors.length > 0 && (
            <div className="mt-1">{formatAppErrors(validationResult.errors)}</div>
          )}
        </div>
      )}
    </div>
  );
}
