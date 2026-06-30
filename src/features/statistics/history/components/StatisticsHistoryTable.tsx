import type { StatisticsHistory } from '../../types/statistics-history.types';
import { useI18n } from '@/i18n/use-i18n';
import { StatisticsHistoryRow } from './StatisticsHistoryRow';

interface StatisticsHistoryTableProps {
  items: StatisticsHistory[];
  selectedId: string | null;
  onSelect: (item: StatisticsHistory) => void;
}

export function StatisticsHistoryTable({
  items,
  selectedId,
  onSelect,
}: StatisticsHistoryTableProps) {
  const { t } = useI18n();

  if (items.length === 0) {
    return (
      <div className="flex h-full min-h-[160px] items-center justify-center text-sm text-content-muted">
        {t('statistics.history.empty')}
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full border-collapse text-left">
        <thead className="sticky top-0 z-10 bg-surface-muted">
          <tr className="border-b border-border text-xs uppercase text-content-muted">
            <th className="px-2 py-2 font-semibold">{t('statistics.history.col.time')}</th>
            <th className="px-2 py-2 font-semibold">{t('statistics.history.col.master')}</th>
            <th className="px-2 py-2 font-semibold">{t('statistics.history.col.analysisType')}</th>
            <th className="px-2 py-2 font-semibold">{t('statistics.history.col.result')}</th>
            <th className="px-2 py-2 text-right font-semibold">
              {t('statistics.history.col.duration')}
            </th>
            <th className="px-2 py-2 font-semibold">{t('statistics.history.col.status')}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <StatisticsHistoryRow
              key={item.id}
              item={item}
              selected={selectedId === item.id}
              onSelect={onSelect}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
