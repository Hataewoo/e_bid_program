import { useI18n } from '@/i18n/use-i18n';
import { useStatisticsStore } from '../stores/statistics-store';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-surface-elevated p-3">
      <div className="text-xs text-content-muted">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

function formatDate(value: string) {
  if (!value || value === '-') return '-';
  return new Date(value).toLocaleString('ko-KR');
}

export function InformationPanel() {
  const { t } = useI18n();
  const masterInfo = useStatisticsStore((s) => s.masterInfo);
  const selectedMaster = useStatisticsStore((s) => s.selectedMaster);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="win-panel-header">{t('analysis.info.title')}</div>
      <div className="flex-1 space-y-2 overflow-auto p-3">
        {!selectedMaster ? (
          <p className="text-sm text-content-muted">{t('analysis.info.empty')}</p>
        ) : (
          <>
            <InfoRow label={t('statistics.info.masterNo')} value={masterInfo.masterNo} />
            <InfoRow label={t('statistics.info.description')} value={masterInfo.description} />
            <InfoRow
              label={t('statistics.info.createdAt')}
              value={formatDate(masterInfo.createdAt)}
            />
            <InfoRow
              label={t('statistics.info.updatedAt')}
              value={formatDate(masterInfo.updatedAt)}
            />
          </>
        )}
      </div>
    </div>
  );
}
