import { useI18n } from '@/i18n/use-i18n';
import { RatioProgressBar } from './RatioProgressBar';

interface RatioCardProps {
  title: string;
  range: string;
  value: number;
  tooltip: string;
  variant: 'low' | 'high';
}

export function RatioCard({ title, range, value, tooltip, variant }: RatioCardProps) {
  const { t } = useI18n();

  return (
    <div className="rounded border border-border bg-surface-muted p-4">
      <div className="text-xs font-semibold uppercase text-content-muted">{title}</div>
      <div className="mt-1 text-xs text-content-muted">
        {t('statistics.lowHigh.range', { range })}
      </div>
      <div className="mt-3 font-mono text-3xl font-bold text-content">{value} %</div>
      <RatioProgressBar value={value} tooltip={tooltip} variant={variant} />
    </div>
  );
}
