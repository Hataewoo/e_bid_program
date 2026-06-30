import '@/lib/ag-grid';
import { useEffect } from 'react';
import { ResizableSplitter } from '@/components/layout/ResizableSplitter';
import { MasterListPanel } from './components/MasterListPanel';
import { MasterValuePanel } from './components/MasterValuePanel';
import { AnalysisPanel } from './components/AnalysisPanel';
import { ExportToolbar } from './components/ExportToolbar';
import { ReStatusBar } from './components/ReStatusBar';
import { useReverseEngineeringStore } from './stores/re-store';
import { useI18n } from '@/i18n/use-i18n';

export function ReverseEngineeringFeature() {
  const { t } = useI18n();
  const loadMasters = useReverseEngineeringStore((s) => s.loadMasters);
  const analysisResult = useReverseEngineeringStore((s) => s.analysisResult);

  useEffect(() => {
    loadMasters();
  }, [loadMasters]);

  return (
    <div className="win-window flex h-full flex-col">
      <div className="win-titlebar">{t('re.title')}</div>
      <ExportToolbar />
      <ResizableSplitter
        defaultLeftWidth={200}
        minLeftWidth={160}
        minRightWidth={600}
        left={<MasterListPanel />}
        right={
          <ResizableSplitter
            defaultLeftWidth={400}
            minLeftWidth={280}
            minRightWidth={320}
            left={<MasterValuePanel />}
            right={
              <div className="flex h-full flex-col">
                <div className="win-panel-header">{t('re.analysisPanel')}</div>
                <div className="min-h-0 flex-1 overflow-hidden">
                  <AnalysisPanel result={analysisResult} />
                </div>
              </div>
            }
          />
        }
      />
      <ReStatusBar />
    </div>
  );
}
