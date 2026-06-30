import { useStatisticsStore } from '../stores/statistics-store';
import { useI18n } from '@/i18n/use-i18n';
import { StatisticsCard } from './StatisticsCard';
import { FrequencyPanel } from './frequency/FrequencyPanel';
import { LowHighRatioPanel } from './lowHighRatio/LowHighRatioPanel';
import { DistributionPanel } from './distribution/DistributionPanel';
import { StatisticsHistoryPanel } from '../history/components/StatisticsHistoryPanel';
import { translateStatisticsCardTitle } from '../utils/translate-card-title';

const PANEL_TITLES = new Set(['Frequency', 'Low / High Ratio', 'Distribution', 'Recent History']);

export function StatisticsWorkspace() {
  const { t } = useI18n();
  const statisticsData = useStatisticsStore((s) => s.statisticsData);
  const selectedMaster = useStatisticsStore((s) => s.selectedMaster);

  const otherCards = statisticsData.cards.filter((card) => !PANEL_TITLES.has(card.title));

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="win-panel-header">{t('statistics.workspace.title')}</div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        {!selectedMaster && (
          <p className="mb-3 text-sm text-content-muted">{t('statistics.selectMaster')}</p>
        )}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <FrequencyPanel />
          <LowHighRatioPanel />
          <DistributionPanel />
          {otherCards.map((card) => (
            <StatisticsCard
              key={card.id}
              title={translateStatisticsCardTitle(card.title)}
              content={card.content}
            />
          ))}
          <div className="md:col-span-2 xl:col-span-2 xl:col-start-2">
            <StatisticsHistoryPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
