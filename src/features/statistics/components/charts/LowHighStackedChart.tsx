import type { LowHighRatio } from '@/features/statistics/types/low-high-ratio.types';
import { useI18n } from '@/i18n/use-i18n';

interface LowHighStackedChartProps {
  data: LowHighRatio;
}

export function LowHighStackedChart({ data }: LowHighStackedChartProps) {
  const { t } = useI18n();
  const total = data.low + data.high;
  const lowWidth = total > 0 ? (data.low / total) * 100 : 50;
  const highWidth = total > 0 ? (data.high / total) * 100 : 50;

  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-content-muted">
        {t('statistics.chart.lowHighStacked')}
      </div>
      <div className="flex h-8 overflow-hidden rounded-full border border-border bg-surface-muted">
        <div
          className="flex items-center justify-center bg-blue-600 text-[10px] font-semibold text-white transition-[width] duration-700 ease-out"
          style={{ width: `${lowWidth}%` }}
          title={t('statistics.lowHigh.lowTooltip', { value: data.low })}
        >
          {lowWidth >= 18 ? `${data.low}%` : null}
        </div>
        <div
          className="flex items-center justify-center bg-orange-500 text-[10px] font-semibold text-white transition-[width] duration-700 ease-out"
          style={{ width: `${highWidth}%` }}
          title={t('statistics.lowHigh.highTooltip', { value: data.high })}
        >
          {highWidth >= 18 ? `${data.high}%` : null}
        </div>
      </div>
      <div className="flex justify-between text-[10px] text-content-muted">
        <span>{t('statistics.chart.lowLabel', { value: data.low })}</span>
        <span>{t('statistics.chart.highLabel', { value: data.high })}</span>
      </div>
    </div>
  );
}
