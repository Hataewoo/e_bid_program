import { useI18n } from '@/i18n/use-i18n';
import { REGRESSION_GATE_MIN_PASS_RATE } from '@/shared/utils/regressionGate';
import type { SuiteRunHistoryEntry } from '../../types/suite-run-history';
import { formatTrendLabel } from '../../utils/dashboard-metrics';

interface PassRateTrendChartProps {
  entries: SuiteRunHistoryEntry[];
}

export function PassRateTrendChart({ entries }: PassRateTrendChartProps) {
  const { t } = useI18n();

  if (entries.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded border border-border bg-surface-elevated p-4 text-sm text-content-muted">
        {t('research.dashboard.trendEmpty')}
      </div>
    );
  }

  return (
    <div className="rounded border border-border bg-surface-elevated p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-content-muted">
        {t('research.dashboard.passRateTrend')}
      </div>
      <div className="relative flex h-40 items-end gap-1 border border-[#404040] bg-white p-2 pt-6">
        <div
          className="pointer-events-none absolute inset-x-2 border-t border-dashed border-orange-500"
          style={{ bottom: `${REGRESSION_GATE_MIN_PASS_RATE}%` }}
          title={t('research.dashboard.targetLine', { rate: REGRESSION_GATE_MIN_PASS_RATE })}
        />
        {entries.map((entry) => {
          const height = Math.max(6, Math.min(100, entry.passRate));
          const ok = entry.passRate >= REGRESSION_GATE_MIN_PASS_RATE;
          return (
            <div
              key={entry.id}
              className="flex min-w-0 flex-1 flex-col items-center gap-1"
              title={`${formatTrendLabel(entry.runAt)} — ${entry.passRate}% (${entry.kind})`}
            >
              <span className="font-mono text-[9px] text-content-muted">{entry.passRate}%</span>
              <div
                className={`w-full rounded-t ${ok ? 'bg-green-600' : 'bg-red-600'}`}
                style={{ height: `${height}%` }}
              />
              <span className="max-w-full truncate text-[8px] text-content-muted">
                {formatTrendLabel(entry.runAt)}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] text-content-muted">{t('research.dashboard.trendHint')}</p>
    </div>
  );
}
