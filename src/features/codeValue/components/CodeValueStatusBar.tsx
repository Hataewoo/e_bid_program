import { useI18n } from '@/i18n/use-i18n';
import { useCodeValueStore } from '../stores/code-value-store';

export function CodeValueStatusBar() {
  const { t } = useI18n();
  const statusMessage = useCodeValueStore((s) => s.statusMessage);
  const filteredItems = useCodeValueStore((s) => s.filteredItems);
  const allItems = useCodeValueStore((s) => s.allItems);
  const isDirty = useCodeValueStore((s) => s.isDirty);
  const formValues = useCodeValueStore((s) => s.formValues);

  return (
    <div className="win-statusbar flex items-center justify-between px-3">
      <span>{statusMessage}</span>
      <div className="flex items-center gap-4">
        {formValues.id && <span>{t('codeValue.status.editing', { id: formValues.id })}</span>}
        <span>
          {t('codeValue.status.displayCount', {
            filtered: filteredItems.length,
            total: allItems.length,
          })}
        </span>
        {isDirty && <span className="text-status-warning">{t('common.dirty')}</span>}
      </div>
    </div>
  );
}
