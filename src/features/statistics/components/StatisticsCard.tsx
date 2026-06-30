import { useI18n } from '@/i18n/use-i18n';

interface StatisticsCardProps {
  title: string;
  content: string;
}

export function StatisticsCard({ title, content }: StatisticsCardProps) {
  const { t } = useI18n();

  return (
    <div className="flex min-h-[140px] flex-col rounded border border-border bg-surface-elevated p-3 shadow-sm">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-content-muted">
        {title}
      </h3>
      <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-content">
        {content || t('statistics.card.noData')}
      </pre>
    </div>
  );
}
