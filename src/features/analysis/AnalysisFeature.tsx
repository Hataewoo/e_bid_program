import '@/lib/ag-grid';
import { useState } from 'react';
import { AnalysisToolbar } from './components/AnalysisToolbar';
import { AnalysisMain } from './components/AnalysisMain';
import { AnalysisStatusBar } from './components/AnalysisStatusBar';
import { AnalysisHistoryPanel } from './components/AnalysisHistoryPanel';
import { BatchAnalysisModal } from './components/BatchAnalysisModal';
import { RawDataPanel } from './components/RawDataPanel';
import { useAnalysisStore } from './stores/analysis-store';
import { useI18n } from '@/i18n/use-i18n';

export function AnalysisFeature() {
  const { t } = useI18n();
  const currentAnalysisResult = useAnalysisStore((s) => s.currentAnalysisResult);
  const showRawData = useAnalysisStore((s) => s.showRawData);
  const showHistory = useAnalysisStore((s) => s.showHistory);
  const toggleRawData = useAnalysisStore((s) => s.toggleRawData);
  const toggleHistory = useAnalysisStore((s) => s.toggleHistory);
  const [batchOpen, setBatchOpen] = useState(false);

  return (
    <div className="win-window relative flex h-full flex-col">
      <div className="win-titlebar">{t('analysis.title')}</div>
      <AnalysisToolbar onOpenBatch={() => setBatchOpen(true)} />
      <div className="min-h-0 flex-1 overflow-hidden">
        <AnalysisMain />
      </div>
      <AnalysisHistoryPanel visible={showHistory} onClose={toggleHistory} />
      <AnalysisStatusBar />
      <RawDataPanel result={currentAnalysisResult} visible={showRawData} onClose={toggleRawData} />
      <BatchAnalysisModal open={batchOpen} onClose={() => setBatchOpen(false)} />
    </div>
  );
}
