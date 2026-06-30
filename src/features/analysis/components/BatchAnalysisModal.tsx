import { useCallback, useState } from 'react';
import { useAnalysisStore } from '../stores/analysis-store';
import { batchAnalysisToCsv } from '@/shared/utils/batchAnalysis';
import { useI18n } from '@/i18n/use-i18n';

interface BatchAnalysisModalProps {
  open: boolean;
  onClose: () => void;
}

export function BatchAnalysisModal({ open, onClose }: BatchAnalysisModalProps) {
  const { t } = useI18n();
  const runBatchAnalysis = useAnalysisStore((s) => s.runBatchAnalysis);
  const batchAnalyzing = useAnalysisStore((s) => s.batchAnalyzing);
  const batchProgress = useAnalysisStore((s) => s.batchProgress);
  const batchSummary = useAnalysisStore((s) => s.batchSummary);

  const [error, setError] = useState<string | null>(null);

  const handleRun = useCallback(async () => {
    setError(null);
    try {
      await runBatchAnalysis();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('analysis.batch.failed'));
    }
  }, [runBatchAnalysis, t]);

  const handleExport = () => {
    if (!batchSummary) return;
    const blob = new Blob([batchAnalysisToCsv(batchSummary)], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `batch-analysis-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/40 p-4">
      <div className="win-dialog-window flex max-h-[85vh] w-full max-w-3xl flex-col">
        <div className="win-titlebar flex items-center justify-between">
          <span>{t('analysis.batch.title')}</span>
          <button
            type="button"
            className="win-button text-xs"
            onClick={onClose}
            disabled={batchAnalyzing}
          >
            {t('programInfo.close')}
          </button>
        </div>

        <div className="space-y-3 p-4 text-sm text-black">
          <p className="text-xs text-content-muted">{t('analysis.batch.description')}</p>

          {batchAnalyzing ? (
            <div className="rounded border border-[#404040] bg-[#fffff0] p-3 text-xs">
              <div>
                {t('analysis.batch.progress')}: {batchProgress.current}/{batchProgress.total} —
                Master {batchProgress.masterNo}
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded bg-[#c0c0c0]">
                <div
                  className="h-full bg-[#000080] transition-all"
                  style={{
                    width: `${Math.round((batchProgress.current / batchProgress.total) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ) : null}

          {batchSummary ? (
            <div className="rounded border border-[#404040] bg-white p-3 text-xs">
              <div>
                {t('analysis.batch.analyzed')}: {batchSummary.analyzed} / {batchSummary.totalSlots}
                {' · '}
                {t('analysis.batch.empty')}: {batchSummary.empty}
                {' · '}
                {t('analysis.batch.errors')}: {batchSummary.errors}
              </div>
              <div className="mt-2 max-h-48 overflow-auto border border-[#c0c0c0]">
                <table className="w-full border-collapse text-[10px]">
                  <thead className="sticky top-0 bg-[#ece9d8]">
                    <tr>
                      <th className="px-1 py-0.5">No</th>
                      <th className="px-1 py-0.5">Digits</th>
                      <th className="px-1 py-0.5">Low/High</th>
                      <th className="px-1 py-0.5">Prediction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchSummary.rows
                      .filter((row) => row.status === 'ok')
                      .slice(0, 30)
                      .map((row) => (
                        <tr key={row.masterNo} className="border-t border-[#e0e0e0]">
                          <td className="px-1 py-0.5">{row.masterNo}</td>
                          <td className="px-1 py-0.5">{row.totalCount}</td>
                          <td className="px-1 py-0.5">
                            {row.lowRate}% / {row.highRate}%
                          </td>
                          <td className="px-1 py-0.5 font-mono">{row.prediction}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {error ? <p className="text-xs text-status-error">{error}</p> : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="win-button win-button-primary"
              onClick={() => void handleRun()}
              disabled={batchAnalyzing}
            >
              {t('analysis.batch.run')}
            </button>
            <button
              type="button"
              className="win-button"
              onClick={handleExport}
              disabled={!batchSummary || batchAnalyzing}
            >
              {t('analysis.batch.exportCsv')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
