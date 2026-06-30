import { useI18n } from '@/i18n/use-i18n';
import { useResearchStore } from '../stores/research-store';

export function ExportToolbar() {
  const { t } = useI18n();
  const exportAll = useResearchStore((s) => s.exportAll);

  return (
    <div className="flex gap-1">
      {(['json', 'csv', 'txt'] as const).map((fmt) => (
        <button
          key={fmt}
          type="button"
          className="win-button text-xs"
          onClick={() => void exportAll(fmt)}
        >
          {t('research.export.label', { format: fmt.toUpperCase() })}
        </button>
      ))}
    </div>
  );
}
