import { useMemo } from 'react';
import { useI18n } from '@/i18n/use-i18n';
import { useAnalysisStore } from '../stores/analysis-store';
import { EMPTY_ANALYSIS_INFO } from '../types/analysis.types';

interface InfoCardProps {
  label: string;
  value: string | number;
}

function InfoCard({ label, value }: InfoCardProps) {
  return (
    <div className="rounded border border-border bg-surface-elevated p-3">
      <div className="text-xs text-content-muted">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function formatDate(value: string) {
  if (!value || value === '-') return '-';
  return new Date(value).toLocaleString();
}

export function InformationPanel() {
  const { t } = useI18n();
  const currentAnalysisResult = useAnalysisStore((s) => s.currentAnalysisResult);
  const selectedMaster = useAnalysisStore((s) => s.selectedMaster);

  const info = useMemo(() => {
    if (!currentAnalysisResult) return EMPTY_ANALYSIS_INFO;
    return {
      totalLength: currentAnalysisResult.totalCount,
      digitCount: currentAnalysisResult.totalCount,
      lowCount: currentAnalysisResult.lowCount,
      highCount: currentAnalysisResult.highCount,
      createdAt: selectedMaster?.createdAt ?? '-',
      updatedAt: selectedMaster?.updatedAt ?? '-',
    };
  }, [currentAnalysisResult, selectedMaster]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="win-panel-header">{t('analysis.info.title')}</div>
      <div className="flex-1 overflow-auto p-3">
        {!selectedMaster ? (
          <p className="text-sm text-content-muted">{t('analysis.info.empty')}</p>
        ) : (
          <div className="grid gap-2">
            <InfoCard label={t('analysis.info.totalLength')} value={info.totalLength} />
            <InfoCard label={t('analysis.info.digitCount')} value={info.digitCount} />
            <InfoCard label={t('analysis.info.lowCount')} value={info.lowCount} />
            <InfoCard label={t('analysis.info.highCount')} value={info.highCount} />
            <InfoCard label={t('analysis.info.createdAt')} value={formatDate(info.createdAt)} />
            <InfoCard label={t('analysis.info.updatedAt')} value={formatDate(info.updatedAt)} />
          </div>
        )}
      </div>
    </div>
  );
}
