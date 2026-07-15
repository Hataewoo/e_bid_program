import { memo, useCallback, useMemo } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { AnalysisResult } from '@/shared/utils/analysisEngine';
import { resolvePatternHighlightIndices } from '@/shared/utils/analysisEngine';
import {
  ANALYSIS_STEP_DEFS,
  type AnalysisPanelId,
  useWorkspaceLayoutStore,
} from '@/stores/workspace-layout-store';
import { useI18n } from '@/i18n/use-i18n';
import type { MessageKey } from '@/i18n/messages';
import type { PatternHighlightState, PatternModalState } from '../types/pattern-rows';
import { SortableDockPanel } from '@/components/layout/SortableDockPanel';
import { buildHighlightIndexSet } from '../utils/highlight-index';
import { MasterValuePanel } from './HighlightedMasterValue';
import { PointValuesPanel } from './PointValuesPanel';

interface AnalysisMainPanelProps {
  result: AnalysisResult;
  activeHighlight: PatternHighlightState | null;
  onOpenModal: (modal: PatternModalState) => void;
  onPopup: (side: 'low' | 'high') => void;
  onPatternHighlight: (highlight: PatternHighlightState | null) => void;
  onPatternPin: (highlight: PatternHighlightState | null) => void;
}

const IbInformationBox = memo(function IbInformationBox({ result }: { result: AnalysisResult }) {
  const { t } = useI18n();

  return (
    <div className="flex gap-2 border border-[#404040] bg-[#ffffe0] p-2 text-sm text-black">
      <div className="flex-1 space-y-0.5">
        <div>
          <span className="font-semibold">{t('analysis.ib.masterNo')} </span>
          {result.masterNo}
        </div>
        <div>
          <span className="font-semibold">{t('analysis.ib.totalDigits')} </span>
          {t('analysis.ib.countUnit', { count: result.totalCount })}
        </div>
        <div>
          <span className="font-semibold">{t('analysis.ib.lowCount')} </span>
          {t('analysis.ib.caseUnit', { count: result.lowCount, rate: result.lowRate })}
        </div>
        <div>
          <span className="font-semibold">{t('analysis.ib.highCount')} </span>
          {t('analysis.ib.caseUnit', { count: result.highCount, rate: result.highRate })}
        </div>
      </div>
      <div className="flex w-16 shrink-0 items-center justify-center border border-dashed border-[#808080] text-[10px] text-[#404040]">
        LOGO
      </div>
    </div>
  );
});

const PANEL_HEIGHT: Record<AnalysisPanelId, string> = {
  masterValue: 'h-[480px]',
  lowPoint: 'h-[560px]',
  ibInfo: 'h-[160px]',
  highPoint: 'h-[560px]',
};

const PANEL_TITLE_KEYS: Record<AnalysisPanelId, MessageKey> = {
  masterValue: 'analysis.panel.masterValue',
  lowPoint: 'analysis.panel.lowPoint',
  ibInfo: 'analysis.panel.ibInfo',
  highPoint: 'analysis.panel.highPoint',
};

export const AnalysisMainPanel = memo(function AnalysisMainPanel({
  result,
  activeHighlight,
  onOpenModal,
  onPopup,
  onPatternHighlight,
  onPatternPin,
}: AnalysisMainPanelProps) {
  const { t } = useI18n();
  const panelOrder = useWorkspaceLayoutStore((s) => s.analysisPanelOrder);
  const activeStep = useWorkspaceLayoutStore((s) => s.analysisActiveStep);
  const setPanelOrder = useWorkspaceLayoutStore((s) => s.setAnalysisPanelOrder);

  const focusedPanelId = ANALYSIS_STEP_DEFS[activeStep].panelId;

  const highlightIndices = useMemo(
    () => buildHighlightIndexSet(result, activeHighlight, resolvePatternHighlightIndices),
    [result, activeHighlight],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = panelOrder.indexOf(active.id as AnalysisPanelId);
      const newIndex = panelOrder.indexOf(over.id as AnalysisPanelId);
      if (oldIndex < 0 || newIndex < 0) return;

      setPanelOrder(arrayMove(panelOrder, oldIndex, newIndex));
    },
    [panelOrder, setPanelOrder],
  );

  const renderPanelContent = (panelId: AnalysisPanelId) => {
    switch (panelId) {
      case 'masterValue':
        return <MasterValuePanel digits={result.digits} highlightIndices={highlightIndices} />;
      case 'lowPoint':
        return (
          <PointValuesPanel
            side="low"
            result={result}
            activeHighlight={activeHighlight}
            onOpenModal={onOpenModal}
            onPopup={() => onPopup('low')}
            onPatternHighlight={onPatternHighlight}
            onPatternPin={onPatternPin}
          />
        );
      case 'ibInfo':
        return (
          <div className="min-h-0 flex-1 overflow-auto p-1">
            <IbInformationBox result={result} />
          </div>
        );
      case 'highPoint':
        return (
          <PointValuesPanel
            side="high"
            result={result}
            activeHighlight={activeHighlight}
            onOpenModal={onOpenModal}
            onPopup={() => onPopup('high')}
            onPatternHighlight={onPatternHighlight}
            onPatternPin={onPatternPin}
          />
        );
      default:
        return null;
    }
  };

  const renderPanelTitle = (panelId: AnalysisPanelId) => {
    if (panelId === 'masterValue') {
      return (
        <>
          {t(PANEL_TITLE_KEYS.masterValue)}
          {activeHighlight ? (
            <span className="ml-1 text-[10px] font-normal text-[#000080]">
              {t('analysis.panel.highlightRef', {
                side: activeHighlight.side === 'low' ? 'Low' : 'High',
                code: activeHighlight.code,
              })}
            </span>
          ) : null}
        </>
      );
    }
    return t(PANEL_TITLE_KEYS[panelId]);
  };

  return (
    <div className="flex w-full flex-col">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={panelOrder} strategy={verticalListSortingStrategy}>
          <div className="flex w-full flex-col gap-px bg-[#404040] p-px">
            {panelOrder.map((panelId) => (
              <SortableDockPanel
                key={panelId}
                id={panelId}
                title={renderPanelTitle(panelId)}
                isFocused={focusedPanelId === panelId}
                className={`shrink-0 ${PANEL_HEIGHT[panelId]} ${
                  panelId === 'lowPoint' || panelId === 'highPoint' ? 'p-0' : ''
                }`}
              >
                {renderPanelContent(panelId)}
              </SortableDockPanel>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
});
