import type { FrequencyItem } from '@/features/statistics/types/frequency.types';
import {
  barHeightPercent,
  findModeItem,
  isLowDigit,
  maxFrequencyCount,
} from '@/features/statistics/utils/chart-metrics';
import { useI18n } from '@/i18n/use-i18n';

interface DigitDistributionBarChartProps {
  items: FrequencyItem[];
  selectedDigit?: number | null;
  onSelectDigit?: (digit: number) => void;
}

export function DigitDistributionBarChart({
  items,
  selectedDigit = null,
  onSelectDigit,
}: DigitDistributionBarChartProps) {
  const { t } = useI18n();
  const maxCount = maxFrequencyCount(items);
  const mode = findModeItem(items);
  const hasData = items.some((item) => item.count > 0);

  if (!hasData) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-content-muted">
        {t('statistics.panel.noData')}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 text-[10px] text-content-muted">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded-sm bg-blue-600" />
          {t('statistics.chart.legendLow')}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded-sm bg-orange-500" />
          {t('statistics.chart.legendHigh')}
        </span>
        {mode ? (
          <span>
            {t('statistics.chart.mode', { digit: mode.digit, ratio: mode.ratio.toFixed(1) })}
          </span>
        ) : null}
      </div>

      <div className="flex h-40 items-end gap-1 rounded border border-border bg-surface p-2 pt-6">
        {items.map((item) => {
          const height = barHeightPercent(item.count, maxCount);
          const selected = selectedDigit === item.digit;
          const low = isLowDigit(item.digit);
          const barColor =
            item.count === 0
              ? 'bg-surface-muted'
              : low
                ? selected
                  ? 'bg-blue-700 ring-2 ring-blue-300'
                  : 'bg-blue-600'
                : selected
                  ? 'bg-orange-600 ring-2 ring-orange-300'
                  : 'bg-orange-500';

          return (
            <button
              key={item.digit}
              type="button"
              className="flex min-w-0 flex-1 flex-col items-center gap-0.5 disabled:cursor-default"
              disabled={!onSelectDigit}
              onClick={() => onSelectDigit?.(item.digit)}
              title={t('statistics.chart.barTitle', {
                digit: item.digit,
                count: item.count,
                ratio: item.ratio.toFixed(1),
              })}
            >
              {item.count > 0 ? (
                <span className="font-mono text-[9px] text-content-muted">{item.count}</span>
              ) : (
                <span className="text-[9px] text-transparent">0</span>
              )}
              <div
                className={`w-full rounded-t transition-[height] duration-300 ${barColor}`}
                style={{ height: height > 0 ? `${height}%` : '2px' }}
              />
              <span
                className={`font-mono text-[10px] ${selected ? 'font-bold text-content' : 'text-content-muted'}`}
              >
                {item.digit}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-content-muted">{t('statistics.chart.distributionHint')}</p>
    </div>
  );
}
