import { useEffect, useMemo, useState } from 'react';
import { createEmptyAnalysisResult } from '@/shared/utils/analysisEngine';
import { ResizableSplitter } from '@/components/layout/ResizableSplitter';
import { WorkspaceLayoutToolbar } from '@/components/layout/WorkspaceLayoutToolbar';
import { useWorkspaceLayoutStore } from '@/stores/workspace-layout-store';
import { useAnalysisStore } from '../stores/analysis-store';
import { useI18n } from '@/i18n/use-i18n';
import { AnalysisPredictionPanel } from './AnalysisPredictionPanel';
import { AnalysisV2PredictionPanel } from './AnalysisV2PredictionPanel';
import { AnalysisDebugConsole } from './AnalysisDebugConsole';
import { AnalysisMasterList } from './AnalysisMasterList';
import { AnalysisMainPanel } from './AnalysisMainPanel';
import { CodeValueStatsGrid } from './CodeValueStatsGrid';
import { CodeValueUnverifiedBanner } from '@/features/codeValue/components/CodeValueUnverifiedBanner';
import { AnalysisLoadingOverlay } from './AnalysisLoadingOverlay';

const IS_DEV = import.meta.env.DEV;

export function AnalysisMain() {
  const { t } = useI18n();
  const initialize = useAnalysisStore((s) => s.initialize);
  const currentAnalysisResult = useAnalysisStore((s) => s.currentAnalysisResult);
  const selectedMasterNo = useAnalysisStore((s) => s.selectedMasterNo);
  const analyzing = useAnalysisStore((s) => s.analyzing);
  const codeValueStats = useAnalysisStore((s) => s.codeValueStats);
  const codesLoading = useAnalysisStore((s) => s.codesLoading);

  const showMasterList = useWorkspaceLayoutStore((s) => s.analysisShowMasterList);
  const showCodeValue = useWorkspaceLayoutStore((s) => s.analysisShowCodeValue);
  const toggleMasterList = useWorkspaceLayoutStore((s) => s.toggleMasterList);
  const toggleCodeValue = useWorkspaceLayoutStore((s) => s.toggleCodeValue);
  const resetAnalysisLayout = useWorkspaceLayoutStore((s) => s.resetAnalysisLayout);

  const [debugOpen, setDebugOpen] = useState(IS_DEV);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (!IS_DEV) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setDebugOpen((v) => !v);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const displayResult = useMemo(
    () => currentAnalysisResult ?? createEmptyAnalysisResult(selectedMasterNo || '00'),
    [currentAnalysisResult, selectedMasterNo],
  );

  const workspacePanel = (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
      <AnalysisLoadingOverlay visible={analyzing} />
      <div className="flex shrink-0 border-b border-[#404040]">
        <AnalysisPredictionPanel result={displayResult} codeValueStats={codeValueStats} />
        <AnalysisV2PredictionPanel result={displayResult} />
      </div>
      <AnalysisMainPanel result={displayResult} showMasterPicker={!showMasterList} />

      {showCodeValue ? (
        <section className="w-full shrink-0 bg-[#f0f0f0] p-2">
          <CodeValueUnverifiedBanner />
          <CodeValueStatsGrid
            rows={codeValueStats}
            loading={codesLoading || analyzing}
            layout="page"
          />
        </section>
      ) : null}

      {IS_DEV ? (
        <>
          {!debugOpen ? (
            <button
              type="button"
              className="win-debug-fab"
              title="Debug Console (Shift+D)"
              onClick={() => setDebugOpen(true)}
            >
              DBG
            </button>
          ) : null}
          <AnalysisDebugConsole
            result={displayResult}
            visible={debugOpen}
            onClose={() => setDebugOpen(false)}
          />
        </>
      ) : null}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-[#808080]">
      <WorkspaceLayoutToolbar
        onReset={resetAnalysisLayout}
        toggles={[
          {
            label: showMasterList
              ? t('analysis.layout.hideMasterList')
              : t('analysis.layout.showMasterList'),
            active: showMasterList,
            onClick: toggleMasterList,
          },
          {
            label: showCodeValue
              ? t('analysis.layout.hideCodeValue')
              : t('analysis.layout.showCodeValue'),
            active: showCodeValue,
            onClick: toggleCodeValue,
          },
        ]}
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {showMasterList ? (
          <ResizableSplitter
            storageKey="analysis-layout-master-width"
            defaultLeftWidth={96}
            minLeftWidth={72}
            minRightWidth={320}
            left={<AnalysisMasterList />}
            right={workspacePanel}
          />
        ) : (
          workspacePanel
        )}
      </div>
    </div>
  );
}
