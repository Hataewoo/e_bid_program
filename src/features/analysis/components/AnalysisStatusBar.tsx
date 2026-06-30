import { useMemo } from 'react';
import { useAppStore } from '@/app/stores';
import { useI18n } from '@/i18n/use-i18n';
import { useAnalysisStore } from '../stores/analysis-store';

export function AnalysisStatusBar() {
  const { t } = useI18n();
  const statusMessage = useAnalysisStore((s) => s.statusMessage);
  const selectedMasterNo = useAnalysisStore((s) => s.selectedMasterNo);
  const currentAnalysisResult = useAnalysisStore((s) => s.currentAnalysisResult);
  const analyzing = useAnalysisStore((s) => s.analyzing);
  const masters = useAnalysisStore((s) => s.masters);
  const loading = useAnalysisStore((s) => s.loading);

  const dbStatus = useAppStore((s) => s.dbStatus);

  const dbSummary = useMemo(() => {
    if (!dbStatus) return t('analysis.statusBar.dbChecking');
    if (!dbStatus.connected) return t('analysis.statusBar.dbFailed');
    const masterTableCount = dbStatus.tableCounts.Master;
    const masterLabel =
      typeof masterTableCount === 'number'
        ? t('analysis.statusBar.dbMasters', { count: masterTableCount })
        : t('analysis.statusBar.loadedMasters', { count: masters.length });
    return t('analysis.statusBar.dbConnected', { masters: masterLabel });
  }, [dbStatus, masters.length, t]);

  const dbPath = dbStatus?.path ?? '';

  return (
    <div className="win-statusbar flex items-center justify-between gap-2 px-2">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="shrink-0">{dbSummary}</span>
        {dbPath ? (
          <span className="win-analysis-status-db text-content-muted" title={dbPath}>
            {dbPath}
          </span>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {loading ? (
          <span className="text-status-warning">{t('analysis.statusBar.listLoading')}</span>
        ) : null}
        {analyzing ? (
          <span className="text-status-warning">{t('analysis.statusBar.analyzing')}</span>
        ) : null}
        <span>{statusMessage}</span>
        <span>{t('common.selected', { value: selectedMasterNo })}</span>
        {currentAnalysisResult ? (
          <span>{t('analysis.statusBar.digits', { count: currentAnalysisResult.totalCount })}</span>
        ) : null}
      </div>
    </div>
  );
}
