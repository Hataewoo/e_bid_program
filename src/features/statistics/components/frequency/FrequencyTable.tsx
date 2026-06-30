import type { FrequencyItem } from '../../types/frequency.types';
import { maxFrequencyCount } from '../../utils/chart-metrics';
import { useI18n } from '@/i18n/use-i18n';
import { FrequencyRow } from './FrequencyRow';

interface FrequencyTableProps {
  items: FrequencyItem[];
  selectedDigit: number | null;
  onSelectDigit: (digit: number) => void;
}

export function FrequencyTable({ items, selectedDigit, onSelectDigit }: FrequencyTableProps) {
  const { t } = useI18n();
  const maxCount = maxFrequencyCount(items);

  if (items.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-content-muted">
        {t('statistics.panel.noData')}
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-muted text-left text-xs uppercase text-content-muted">
            <th className="px-3 py-2 font-semibold">{t('statistics.frequency.colDigit')}</th>
            <th className="px-3 py-2 text-right font-semibold">
              {t('statistics.frequency.colCount')}
            </th>
            <th className="px-3 py-2 text-right font-semibold">
              {t('statistics.frequency.colRatio')}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <FrequencyRow
              key={item.digit}
              item={item}
              selected={selectedDigit === item.digit}
              onSelect={onSelectDigit}
              maxCount={maxCount}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
