import type { StatisticsHistory } from '../../types/statistics-history.types';
import { formatHistoryTime, masterDisplayLabel } from '../../types/statistics-history.types';
import { useI18n } from '@/i18n/use-i18n';

interface StatisticsHistoryPreviewProps {
  item: StatisticsHistory | null;
}

function PreviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border py-2 last:border-b-0">
      <div className="text-xs text-content-muted">{label}</div>
      <div className="mt-0.5 text-sm font-medium">{value}</div>
    </div>
  );
}

export function StatisticsHistoryPreview({ item }: StatisticsHistoryPreviewProps) {
  const { t } = useI18n();

  return (
    <div className="bg-surface-muted/50 flex h-full w-56 shrink-0 flex-col border-l border-border">
      <div className="win-panel-header text-xs">{t('statistics.history.preview')}</div>
      <div className="flex-1 overflow-auto p-3">
        {!item ? (
          <p className="text-xs text-content-muted">{t('statistics.history.previewEmpty')}</p>
        ) : (
          <>
            <PreviewField
              label={t('statistics.history.preview.master')}
              value={masterDisplayLabel(item.masterNo)}
            />
            <PreviewField
              label={t('statistics.history.preview.analysisType')}
              value={item.analysisType}
            />
            <PreviewField label={t('statistics.history.preview.result')} value={item.result} />
            <PreviewField
              label={t('statistics.history.preview.duration')}
              value={`${item.duration}ms`}
            />
            <PreviewField
              label={t('statistics.history.preview.createdTime')}
              value={formatHistoryTime(item.createdAt)}
            />
            <PreviewField label={t('statistics.history.preview.memo')} value={item.memo ?? '-'} />
          </>
        )}
      </div>
    </div>
  );
}
