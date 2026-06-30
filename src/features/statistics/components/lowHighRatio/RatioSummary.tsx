import type { LowHighRatio, LowHighDominant } from '../../types/low-high-ratio.types';
import { useI18n } from '@/i18n/use-i18n';
import type { MessageKey } from '@/i18n/messages';

interface RatioSummaryProps {
  data: LowHighRatio;
}

function dominantLabel(
  dominant: LowHighDominant,
  t: (key: MessageKey, params?: Record<string, string | number>) => string,
): string {
  if (dominant === 'LOW') return t('statistics.lowHigh.dominantLow');
  if (dominant === 'HIGH') return t('statistics.lowHigh.dominantHigh');
  return t('statistics.lowHigh.dominantSame');
}

export function RatioSummary({ data }: RatioSummaryProps) {
  const { t } = useI18n();

  return (
    <div className="mt-4 border-t border-border pt-3">
      <div className="mb-2 text-xs font-semibold uppercase text-content-muted">
        {t('statistics.lowHigh.summary')}
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded border border-border bg-surface-muted px-3 py-2">
          <span className="text-content-muted">{t('statistics.lowHigh.difference')}</span>
          <div className="font-mono font-semibold">{data.difference} %</div>
        </div>
        <div className="rounded border border-border bg-surface-muted px-3 py-2">
          <span className="text-content-muted">{t('statistics.lowHigh.dominant')}</span>
          <div className="font-semibold">{dominantLabel(data.dominant, t)}</div>
        </div>
      </div>
    </div>
  );
}
