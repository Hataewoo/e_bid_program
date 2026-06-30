import { useStatisticsStore } from '../../stores/statistics-store';
import { DistributionChart } from '../distribution/DistributionChart';
import { useI18n } from '@/i18n/use-i18n';

export function DistributionPanel() {
  const { t } = useI18n();
  const frequencyData = useStatisticsStore((s) => s.frequencyData);
  const frequencyLoading = useStatisticsStore((s) => s.frequencyLoading);
  const selectedMaster = useStatisticsStore((s) => s.selectedMaster);
  const selectedDigit = useStatisticsStore((s) => s.selectedFrequencyDigit);
  const refreshFrequency = useStatisticsStore((s) => s.refreshFrequency);
  const copyFrequencyJson = useStatisticsStore((s) => s.copyFrequencyJson);
  const selectFrequencyDigit = useStatisticsStore((s) => s.selectFrequencyDigit);

  const hasData = frequencyData !== null && frequencyData.items.length > 0;

  return (
    <div className="flex min-h-[280px] flex-col rounded border border-border bg-surface-elevated shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-content-muted">
          {t('statistics.distribution.title')}
        </h3>
        <div className="flex gap-1">
          <button
            type="button"
            className="win-button text-xs"
            onClick={() => void refreshFrequency()}
            disabled={frequencyLoading || !selectedMaster}
          >
            {t('statistics.panel.refresh')}
          </button>
          <button
            type="button"
            className="win-button text-xs"
            onClick={() => void copyFrequencyJson()}
            disabled={!hasData}
          >
            {t('statistics.panel.copy')}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-3">
        {!selectedMaster && (
          <p className="text-sm text-content-muted">{t('statistics.panel.selectMaster')}</p>
        )}

        {selectedMaster && frequencyLoading && (
          <p className="text-sm text-content-muted">{t('statistics.panel.loading')}</p>
        )}

        {selectedMaster && !frequencyLoading && hasData && frequencyData && (
          <DistributionChart
            items={frequencyData.items}
            selectedDigit={selectedDigit}
            onSelectDigit={selectFrequencyDigit}
          />
        )}

        {selectedMaster && !frequencyLoading && !hasData && (
          <div className="flex flex-1 items-center justify-center text-sm text-content-muted">
            {t('statistics.panel.noData')}
          </div>
        )}
      </div>
    </div>
  );
}
