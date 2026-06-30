import { useCodeStore } from '../stores/code-store';
import { useI18n } from '@/i18n/use-i18n';

export function CodeStatusBar() {
  const { t } = useI18n();
  const statusMessage = useCodeStore((s) => s.statusMessage);
  const recordCount = useCodeStore((s) => s.recordCount);
  const isDirty = useCodeStore((s) => s.isDirty);
  const formValues = useCodeStore((s) => s.formValues);

  return (
    <div className="win-statusbar flex items-center justify-between px-3">
      <span>{statusMessage}</span>
      <div className="flex items-center gap-4">
        {formValues.code && <span>{t('code.codeLabel', { code: formValues.code })}</span>}
        <span>{t('common.recordCount', { count: recordCount })}</span>
        {isDirty && <span className="text-status-warning">{t('common.dirty')}</span>}
      </div>
    </div>
  );
}
