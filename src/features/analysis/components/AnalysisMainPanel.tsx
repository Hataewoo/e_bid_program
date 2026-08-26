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
import { type AnalysisPanelId, useWorkspaceLayoutStore } from '@/stores/workspace-layout-store';
import { useAnalysisStore } from '../stores/analysis-store';
import { useI18n } from '@/i18n/use-i18n';
import type { MessageKey } from '@/i18n/messages';
import { SortableDockPanel } from '@/components/layout/SortableDockPanel';
import { MasterValuePanel } from './HighlightedMasterValue';

interface AnalysisMainPanelProps {
  result: AnalysisResult;
  /** 목록 숨김 시 마스터 번호 콤보박스 표시 */
  showMasterPicker?: boolean;
}

const PANEL_HEIGHT: Record<AnalysisPanelId, string> = {
  masterValue: 'h-[480px] shrink-0',
  ibInfo: 'h-[160px] shrink-0',
};

const PANEL_TITLE_KEYS: Record<AnalysisPanelId, MessageKey> = {
  masterValue: 'analysis.panel.masterValue',
  ibInfo: 'analysis.panel.ibInfo',
};

const IbInformationBox = memo(function IbInformationBox({ result }: { result: AnalysisResult }) {
  const { t } = useI18n();

  return (
    <div className="border border-[#404040] bg-[#ffffe0] p-2 text-sm text-black">
      <div className="space-y-0.5">
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
    </div>
  );
});

export const AnalysisMainPanel = memo(function AnalysisMainPanel({
  result,
  showMasterPicker = false,
}: AnalysisMainPanelProps) {
  const { t } = useI18n();
  const panelOrder = useWorkspaceLayoutStore((s) => s.analysisPanelOrder);
  const setPanelOrder = useWorkspaceLayoutStore((s) => s.setAnalysisPanelOrder);
  const selectedMasterNo = useAnalysisStore((s) => s.selectedMasterNo);
  const analyzeMaster = useAnalysisStore((s) => s.analyzeMaster);

  const masterOptions = useMemo(
    () => Array.from({ length: 100 }, (_, i) => String(i).padStart(2, '0')),
    [],
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
        return showMasterPicker ? (
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="flex shrink-0 items-center gap-2 border-b border-[#c0c0c0] bg-[#ece9d8] px-2 py-1">
              <label className="text-xs font-semibold text-[#000080]" htmlFor="analysis-master-picker-inline">
                {t('analysis.masterList.title')}
              </label>
              <select
                id="analysis-master-picker-inline"
                className="win-combobox min-w-[4rem] text-xs"
                value={selectedMasterNo}
                onChange={(e) => void analyzeMaster(e.target.value)}
              >
                {masterOptions.map((no) => (
                  <option key={no} value={no}>
                    {no}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <MasterValuePanel digits={result.digits} highlightIndices={new Set()} />
            </div>
          </div>
        ) : (
          <MasterValuePanel digits={result.digits} highlightIndices={new Set()} />
        );
      case 'ibInfo':
        return (
          <div className="min-h-0 flex-1 overflow-auto p-1">
            <IbInformationBox result={result} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex w-full shrink-0 flex-col">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={panelOrder} strategy={verticalListSortingStrategy}>
          <div className="flex w-full shrink-0 flex-col gap-px bg-[#404040] p-px">
            {panelOrder.map((panelId) => (
              <SortableDockPanel
                key={panelId}
                id={panelId}
                title={t(PANEL_TITLE_KEYS[panelId])}
                isFocused={panelId === 'masterValue'}
                className={PANEL_HEIGHT[panelId]}
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
