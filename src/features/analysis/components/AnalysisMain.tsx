import { useCallback, useEffect, useMemo, useState } from 'react';
import { createEmptyAnalysisResult } from '@/shared/utils/analysisEngine';
import { ResizableSplitter } from '@/components/layout/ResizableSplitter';
import { ResizableVerticalSplitter } from '@/components/layout/ResizableVerticalSplitter';
import { SortableTabBar } from '@/components/layout/SortableTabBar';
import { WorkspaceLayoutToolbar } from '@/components/layout/WorkspaceLayoutToolbar';
import {
  ANALYSIS_STEP_DEFS,
  type AnalysisStepId,
  useWorkspaceLayoutStore,
} from '@/stores/workspace-layout-store';
import { useAnalysisStore } from '../stores/analysis-store';
import type { PatternHighlightState, PatternModalState } from '../types/pattern-rows';
import { useI18n } from '@/i18n/use-i18n';
import type { MessageKey } from '@/i18n/messages';
import { AnalysisPredictionPanel } from './AnalysisPredictionPanel';
import { AnalysisDebugConsole } from './AnalysisDebugConsole';
import { AnalysisMasterList } from './AnalysisMasterList';
import { AnalysisMainPanel } from './AnalysisMainPanel';
import { CodeValueStatsGrid } from './CodeValueStatsGrid';
import { CodeValueUnverifiedBanner } from '@/features/codeValue/components/CodeValueUnverifiedBanner';
import { AnalysisLoadingOverlay } from './AnalysisLoadingOverlay';
import { PatternDetailModal } from './PatternDetailModal';

const IS_DEV = import.meta.env.DEV;

export function AnalysisMain() {
  const { t } = useI18n();
  const initialize = useAnalysisStore((s) => s.initialize);
  const currentAnalysisResult = useAnalysisStore((s) => s.currentAnalysisResult);
  const selectedMasterNo = useAnalysisStore((s) => s.selectedMasterNo);
  const analyzing = useAnalysisStore((s) => s.analyzing);
  const codeValueStats = useAnalysisStore((s) => s.codeValueStats);
  const prediction = useAnalysisStore((s) => s.prediction);
  const codesLoading = useAnalysisStore((s) => s.codesLoading);

  const stepOrder = useWorkspaceLayoutStore((s) => s.analysisStepOrder);
  const activeStep = useWorkspaceLayoutStore((s) => s.analysisActiveStep);
  const showMasterList = useWorkspaceLayoutStore((s) => s.analysisShowMasterList);
  const showCodeValue = useWorkspaceLayoutStore((s) => s.analysisShowCodeValue);
  const setStepOrder = useWorkspaceLayoutStore((s) => s.setAnalysisStepOrder);
  const setActiveStep = useWorkspaceLayoutStore((s) => s.setAnalysisActiveStep);
  const toggleMasterList = useWorkspaceLayoutStore((s) => s.toggleMasterList);
  const toggleCodeValue = useWorkspaceLayoutStore((s) => s.toggleCodeValue);
  const resetAnalysisLayout = useWorkspaceLayoutStore((s) => s.resetAnalysisLayout);

  const [patternModal, setPatternModal] = useState<PatternModalState | null>(null);
  const [popupText, setPopupText] = useState<string | null>(null);
  const [hoverHighlight, setHoverHighlight] = useState<PatternHighlightState | null>(null);
  const [pinnedHighlight, setPinnedHighlight] = useState<PatternHighlightState | null>(null);
  const [debugOpen, setDebugOpen] = useState(IS_DEV);

  const activeHighlight = pinnedHighlight ?? hoverHighlight;

  const tabItems = useMemo(
    () =>
      stepOrder.map((id) => ({
        id,
        label: t(ANALYSIS_STEP_DEFS[id].labelKey as MessageKey),
      })),
    [stepOrder, t],
  );

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    setPinnedHighlight(null);
    setHoverHighlight(null);
  }, [selectedMasterNo, currentAnalysisResult]);

  useEffect(() => {
    if (!IS_DEV) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setDebugOpen((v) => !v);
      }
      if (e.key === 'Escape') {
        setPinnedHighlight(null);
        setHoverHighlight(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleOpenModal = useCallback((modal: PatternModalState) => {
    setPatternModal(modal);
  }, []);

  const displayResult = useMemo(
    () => currentAnalysisResult ?? createEmptyAnalysisResult(selectedMasterNo || '00'),
    [currentAnalysisResult, selectedMasterNo],
  );

  const handlePopup = useCallback(
    (side: 'low' | 'high') => {
      const patterns = side === 'low' ? displayResult.lowPatterns : displayResult.highPatterns;
      setPopupText(JSON.stringify(patterns, null, 2));
    },
    [displayResult.lowPatterns, displayResult.highPatterns],
  );

  const handlePatternPin = useCallback((highlight: PatternHighlightState | null) => {
    setPinnedHighlight((prev) => {
      if (!highlight) return null;
      if (
        prev?.side === highlight.side &&
        prev.field === highlight.field &&
        prev.code === highlight.code
      ) {
        return null;
      }
      return highlight;
    });
  }, []);

  const handleTabReorder = useCallback(
    (ids: string[]) => {
      setStepOrder(ids as AnalysisStepId[]);
    },
    [setStepOrder],
  );

  const handleTabSelect = useCallback(
    (id: string) => {
      setActiveStep(id as AnalysisStepId);
    },
    [setActiveStep],
  );

  const workspacePanel = (
    <div className="relative h-full min-h-0 min-w-0">
      <AnalysisLoadingOverlay visible={analyzing} />
      <AnalysisMainPanel
        result={displayResult}
        activeHighlight={activeHighlight}
        onOpenModal={handleOpenModal}
        onPopup={handlePopup}
        onPatternHighlight={setHoverHighlight}
        onPatternPin={handlePatternPin}
      />

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

  const mainContent = showMasterList ? (
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
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#808080]">
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

      <SortableTabBar
        items={tabItems}
        activeId={activeStep}
        onReorder={handleTabReorder}
        onSelect={handleTabSelect}
      />

      <AnalysisPredictionPanel prediction={prediction} />

      {showCodeValue ? (
        <ResizableVerticalSplitter
          storageKey="analysis-layout-vertical"
          defaultTopPercent={72}
          minTopPercent={40}
          minBottomPercent={12}
          top={mainContent}
          bottom={
            <div className="flex h-full min-h-0 flex-col gap-1 p-1">
              <CodeValueUnverifiedBanner />
              <CodeValueStatsGrid rows={codeValueStats} loading={codesLoading || analyzing} />
            </div>
          }
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">{mainContent}</div>
      )}

      <PatternDetailModal
        modal={patternModal}
        masterNo={selectedMasterNo}
        onClose={() => setPatternModal(null)}
      />

      {popupText ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="win-dialog-window flex max-h-[80vh] w-full max-w-lg flex-col">
            <div className="win-titlebar flex justify-between">
              <span>{t('analysis.popup.title')}</span>
              <button
                type="button"
                className="win-button text-xs"
                onClick={() => setPopupText(null)}
              >
                {t('common.close')}
              </button>
            </div>
            <pre className="overflow-auto p-3 font-mono text-xs text-black">{popupText}</pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}
