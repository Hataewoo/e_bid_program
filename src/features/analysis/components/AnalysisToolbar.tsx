import { useAnalysisStore } from '../stores/analysis-store';
import { useI18n } from '@/i18n/use-i18n';

interface AnalysisToolbarProps {
  onOpenBatch?: () => void;
}

export function AnalysisToolbar({ onOpenBatch }: AnalysisToolbarProps) {
  const { t } = useI18n();
  const loading = useAnalysisStore((s) => s.loading);
  const showRawData = useAnalysisStore((s) => s.showRawData);
  const showHistory = useAnalysisStore((s) => s.showHistory);
  const debugLoggingEnabled = useAnalysisStore((s) => s.debugLoggingEnabled);
  const handleLoad = useAnalysisStore((s) => s.handleLoad);
  const handleAnalyze = useAnalysisStore((s) => s.handleAnalyze);
  const handleReset = useAnalysisStore((s) => s.handleReset);
  const handleExport = useAnalysisStore((s) => s.handleExport);
  const handleCopy = useAnalysisStore((s) => s.handleCopy);
  const handleCopyVerify = useAnalysisStore((s) => s.handleCopyVerify);
  const handleLogNow = useAnalysisStore((s) => s.handleLogNow);
  const handleClear = useAnalysisStore((s) => s.handleClear);
  const toggleRawData = useAnalysisStore((s) => s.toggleRawData);
  const toggleHistory = useAnalysisStore((s) => s.toggleHistory);
  const setDebugLoggingEnabled = useAnalysisStore((s) => s.setDebugLoggingEnabled);

  return (
    <div className="win-toolbar flex flex-wrap items-center gap-1 px-3 py-2">
      <button type="button" className="win-button" onClick={handleLoad} disabled={loading}>
        {t('analysis.toolbar.load')}
      </button>
      <button type="button" className="win-button win-button-primary" onClick={handleAnalyze}>
        {t('analysis.toolbar.analyze')}
      </button>
      <button type="button" className="win-button" onClick={onOpenBatch}>
        {t('analysis.batch.run')}
      </button>
      <button type="button" className="win-button" onClick={handleReset}>
        {t('analysis.toolbar.reset')}
      </button>
      <button type="button" className="win-button" onClick={handleExport}>
        {t('analysis.toolbar.export')}
      </button>
      <button type="button" className="win-button" onClick={handleCopy}>
        {t('analysis.toolbar.copyJson')}
      </button>
      <button type="button" className="win-button" onClick={handleCopyVerify}>
        {t('analysis.toolbar.copyVerify')}
      </button>
      <button type="button" className="win-button" onClick={handleLogNow}>
        {t('analysis.toolbar.logNow')}
      </button>
      <button type="button" className="win-button" onClick={handleClear}>
        {t('analysis.toolbar.clear')}
      </button>

      <span className="mx-1 text-content-muted">|</span>

      <button
        type="button"
        className={`win-button ${showHistory ? 'win-button-primary' : ''}`}
        onClick={toggleHistory}
      >
        {t('analysis.toolbar.history')}
      </button>
      <button
        type="button"
        className={`win-button ${showRawData ? 'win-button-primary' : ''}`}
        onClick={toggleRawData}
      >
        {t('analysis.toolbar.rawData')}
      </button>
      <label className="flex items-center gap-1 text-xs text-content-muted">
        <input
          type="checkbox"
          checked={debugLoggingEnabled}
          onChange={(e) => setDebugLoggingEnabled(e.target.checked)}
        />
        console.table
      </label>
    </div>
  );
}
