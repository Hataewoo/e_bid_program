import type { FrequencySummary as FrequencySummaryData } from '../../types/frequency.types';
import { useI18n } from '@/i18n/use-i18n';

interface FrequencySummaryProps {
  summary: FrequencySummaryData;
}

export function FrequencySummary({ summary }: FrequencySummaryProps) {
  const { t } = useI18n();

  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="mb-2 text-xs font-semibold uppercase text-content-muted">
        {t('statistics.frequency.summaryTitle')}
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded border border-border bg-surface-muted px-3 py-2">
          <span className="text-content-muted">{t('statistics.frequency.totalDigits')}</span>
          <div className="font-mono font-semibold">{summary.totalDigits}</div>
        </div>
        <div className="rounded border border-border bg-surface-muted px-3 py-2">
          <span className="text-content-muted">{t('statistics.frequency.uniqueDigits')}</span>
          <div className="font-mono font-semibold">{summary.uniqueDigits}</div>
        </div>
      </div>
    </div>
  );
}
