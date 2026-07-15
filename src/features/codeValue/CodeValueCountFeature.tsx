import { useEffect } from 'react';
import { useI18n } from '@/i18n/use-i18n';
import { ResizableSplitter } from '@/components/layout/ResizableSplitter';
import { WorkspaceLayoutToolbar } from '@/components/layout/WorkspaceLayoutToolbar';
import { useWorkspaceLayoutStore } from '@/stores/workspace-layout-store';
import { CodeValueMasterList } from './components/CodeValueMasterList';
import { CodeValueUnverifiedBanner } from './components/CodeValueUnverifiedBanner';
import { StepSectionTabs } from './components/StepSectionTabs';
import { StepSectionContent } from './components/StepSectionContent';
import { useCodeValueAnalysisStore } from './stores/code-value-analysis-store';
import { useCodeValueCountStore } from './stores/code-value-count-store';

const ACTIVE_STEP_LABELS = {
  '1': 'STEP1',
  '2': 'STEP2',
  '3': 'STEP3',
} as const;

export function CodeValueCountFeature() {
  const { t } = useI18n();
  const statusMessage = useCodeValueCountStore((s) => s.statusMessage);
  const isPanelOpen = useCodeValueCountStore((s) => s.isPanelOpen);
  const openPanel = useCodeValueCountStore((s) => s.openPanel);

  const activeStep = useWorkspaceLayoutStore((s) => s.codeValueActiveStep);
  const resetCodeValueLayout = useWorkspaceLayoutStore((s) => s.resetCodeValueLayout);
  const analysisStatus = useCodeValueAnalysisStore((s) => s.statusMessage);
  const initialize = useCodeValueAnalysisStore((s) => s.initialize);

  useEffect(() => {
    openPanel();
  }, [openPanel]);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  if (!isPanelOpen) {
    return (
      <div className="flex h-full items-center justify-center bg-[#808080] p-4">
        <div className="win-dialog-panel text-center">
          <p className="text-sm text-content">{t('codeValue.count.panelClosed')}</p>
          <button type="button" className="win-button mt-3" onClick={openPanel}>
            {t('codeValue.count.panelOpen')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="win-window flex h-full flex-col bg-[#808080]">
      <div className="win-titlebar">{t('analysis.title')}</div>

      <WorkspaceLayoutToolbar onReset={resetCodeValueLayout} />

      <ResizableSplitter
        storageKey="code-value-count-master-width"
        defaultLeftWidth={96}
        minLeftWidth={72}
        minRightWidth={320}
        left={<CodeValueMasterList />}
        right={
          <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            <div className="shrink-0 p-2">
              <CodeValueUnverifiedBanner />
            </div>
            <StepSectionTabs />
            <StepSectionContent />
          </div>
        }
      />

      <div className="win-statusbar flex items-center justify-between px-3">
        <span>{analysisStatus || statusMessage}</span>
        <span>{t('codeValue.count.activeStep', { step: ACTIVE_STEP_LABELS[activeStep] })}</span>
      </div>
    </div>
  );
}
