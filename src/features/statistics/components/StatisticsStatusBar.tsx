import { useI18n } from '@/i18n/use-i18n';
import { useStatisticsStore } from '../stores/statistics-store';

export function StatisticsStatusBar() {
  const { t } = useI18n();
  const statusMessage = useStatisticsStore((s) => s.statusMessage);
  const selectedMaster = useStatisticsStore((s) => s.selectedMaster);
  const loading = useStatisticsStore((s) => s.loading);

  return (
    <div className="win-statusbar flex items-center justify-between px-3">
      <span>{statusMessage}</span>
      <div className="flex items-center gap-4 text-xs">
        {loading && <span className="text-content-muted">{t('statistics.panel.loading')}</span>}
        {selectedMaster && (
          <span>{t('statistics.status.masterLabel', { no: selectedMaster.masterNo })}</span>
        )}
        {!selectedMaster && !loading && (
          <span className="text-content-muted">{t('statistics.status.waiting')}</span>
        )}
      </div>
    </div>
  );
}
