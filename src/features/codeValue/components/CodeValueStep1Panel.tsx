import { memo, useCallback, useState } from 'react';
import type { AnalysisResult, CodeValueStatRow } from '@/shared/utils/analysisEngine';
import { MasterValueTextarea } from '@/components/ui/MasterValueTextarea';
import { ResizableSplitter } from '@/components/layout/ResizableSplitter';
import { ResizableVerticalSplitter } from '@/components/layout/ResizableVerticalSplitter';
import { PatternDetailModal } from '@/features/analysis/components/PatternDetailModal';
import { CodeValueStatsGrid } from '@/features/analysis/components/CodeValueStatsGrid';
import type { PatternHighlightState, PatternModalState } from '@/features/analysis/types/pattern-rows';
import { useI18n } from '@/i18n/use-i18n';
import { CodeValueSPatternSection } from './CodeValueSPatternSection';
import { formatRunLengthSequence } from '@/features/analysis/utils/analysis-display';
import { PatternValuesTable } from '@/features/analysis/components/PatternValuesTable';
import { CODE_VALUE_PATTERN_ROWS } from '@/features/analysis/types/pattern-rows';

interface CodeValueStep1PanelProps {
  result: AnalysisResult;
  codeValueStats: CodeValueStatRow[];
  loading?: boolean;
}

/** 레거시 IbInformation 요약 (STEP1 좌하단) */
const CodeValueIbInfoBox = memo(function CodeValueIbInfoBox({ result }: { result: AnalysisResult }) {
  const { t } = useI18n();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden border border-[#808080] bg-white">
      <div className="win-point-values-header shrink-0 font-semibold text-[#0000ff]">
        {t('analysis.panel.ibInfo')}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        <div className="flex gap-2 border border-[#404040] bg-[#ffffe0] p-3 text-sm text-black">
          <div className="flex-1 space-y-1">
            <div>
              <span className="font-semibold">{t('analysis.ib.masterNo')} </span>
              {result.masterNo}
            </div>
            <div>
              <span className="font-semibold">{t('analysis.ib.totalDigits')} </span>
              {t('analysis.ib.countUnit', { count: result.totalCount })}
            </div>
            <div className="win-ib-low-row">
              <span className="font-semibold">{t('analysis.ib.lowCount')} </span>
              {t('analysis.ib.caseUnit', { count: result.lowCount, rate: result.lowRate })}
            </div>
            <div className="win-ib-high-row">
              <span className="font-semibold">{t('analysis.ib.highCount')} </span>
              {t('analysis.ib.caseUnit', { count: result.highCount, rate: result.highRate })}
            </div>
          </div>
          <div className="flex w-16 shrink-0 items-center justify-center border border-dashed border-[#808080] text-[10px] text-[#404040]">
            LOGO
          </div>
        </div>
      </div>
    </div>
  );
});

/**
 * STEP1 — 레거시 2열: 좌 Master+IbInfo / 우 저점·고점 (S run + 10규칙).
 * 하단 Code Value 통계는 가로 전체.
 */
export const CodeValueStep1Panel = memo(function CodeValueStep1Panel({
  result,
  codeValueStats,
  loading = false,
}: CodeValueStep1PanelProps) {
  const { t } = useI18n();
  const [patternModal, setPatternModal] = useState<PatternModalState | null>(null);
  const [activeHighlight, setActiveHighlight] = useState<PatternHighlightState | null>(null);
  const [pinnedHighlight, setPinnedHighlight] = useState<PatternHighlightState | null>(null);
  const [lowPopupOpen, setLowPopupOpen] = useState(false);
  const [highPopupOpen, setHighPopupOpen] = useState(false);

  const handleOpenPatternDetail = useCallback((modal: PatternModalState) => {
    setPatternModal(modal);
  }, []);

  const handlePatternHighlight = useCallback(
    (highlight: PatternHighlightState | null) => {
      if (pinnedHighlight) return;
      setActiveHighlight(highlight);
    },
    [pinnedHighlight],
  );

  const handlePatternPin = useCallback((highlight: PatternHighlightState | null) => {
    setPinnedHighlight(highlight);
    setActiveHighlight(highlight);
  }, []);

  const displayHighlight = pinnedHighlight ?? activeHighlight;
  const lowRunText = formatRunLengthSequence(result.lowRunLengths);
  const highRunText = formatRunLengthSequence(result.highRunLengths);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#808080] p-px">
      <div className="min-h-0 flex-1 overflow-hidden">
        <ResizableVerticalSplitter
          storageKey="codevalue-step1-classic-main"
          defaultTopPercent={74}
          minTopPercent={48}
          minBottomPercent={16}
          top={
            <ResizableSplitter
              storageKey="codevalue-step1-classic-columns"
              defaultLeftWidth={520}
              minLeftWidth={380}
              minRightWidth={400}
              left={
                <ResizableVerticalSplitter
                  storageKey="codevalue-step1-classic-left"
                  defaultTopPercent={76}
                  minTopPercent={45}
                  minBottomPercent={14}
                  top={
                    <div className="flex h-full min-h-0 flex-col overflow-hidden border border-[#808080] bg-white">
                      <div className="win-point-values-header shrink-0 font-semibold text-[#0000ff]">
                        {t('codeValue.legacy.step1Header')}
                      </div>
                      <MasterValueTextarea readOnly value={result.digits} className="min-h-0 flex-1" />
                    </div>
                  }
                  bottom={<CodeValueIbInfoBox result={result} />}
                />
              }
              right={
                <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#606060] p-px">
                  <div className="win-step1-right-column-header shrink-0">
                    {t('codeValue.legacy.step1RightColumnTitle')}
                  </div>
                  <div className="min-h-0 flex-1 overflow-hidden">
                    <ResizableVerticalSplitter
                      storageKey="codevalue-step1-classic-right"
                      defaultTopPercent={50}
                      minTopPercent={28}
                      minBottomPercent={28}
                      top={
                    <div className="h-full min-h-0 overflow-hidden border border-[#808080]">
                      <CodeValueSPatternSection
                        side="low"
                        result={result}
                        activeHighlight={displayHighlight}
                        onOpenPatternDetail={handleOpenPatternDetail}
                        onPatternHighlight={handlePatternHighlight}
                        onPatternPin={handlePatternPin}
                        showPopupButton
                        onOpenPopup={() => setLowPopupOpen(true)}
                        layout="classic"
                      />
                    </div>
                  }
                  bottom={
                    <div className="h-full min-h-0 overflow-hidden border border-[#808080]">
                      <CodeValueSPatternSection
                        side="high"
                        result={result}
                        activeHighlight={displayHighlight}
                        onOpenPatternDetail={handleOpenPatternDetail}
                        onPatternHighlight={handlePatternHighlight}
                        onPatternPin={handlePatternPin}
                        showPopupButton
                        onOpenPopup={() => setHighPopupOpen(true)}
                        layout="classic"
                      />
                    </div>
                  }
                    />
                  </div>
                </div>
              }
            />
          }
          bottom={
            <div className="flex h-full min-h-0 flex-col overflow-hidden border border-[#808080] bg-white">
              <CodeValueStatsGrid rows={codeValueStats} loading={loading} density="comfortable" />
            </div>
          }
        />
      </div>

      <p className="shrink-0 border-t border-[#606060] bg-[#ece9d8] px-2 py-0.5 text-[11px] text-[#404040]">
        {t('codeValue.legacy.step1ResizeHint')}
      </p>

      {lowPopupOpen ? (
        <CodeValueStep1PatternPopup
          side="low"
          result={result}
          runLengthText={lowRunText}
          onClose={() => setLowPopupOpen(false)}
          onOpenPatternDetail={handleOpenPatternDetail}
        />
      ) : null}

      {highPopupOpen ? (
        <CodeValueStep1PatternPopup
          side="high"
          result={result}
          runLengthText={highRunText}
          onClose={() => setHighPopupOpen(false)}
          onOpenPatternDetail={handleOpenPatternDetail}
        />
      ) : null}

      <PatternDetailModal
        modal={patternModal}
        masterNo={result.masterNo}
        onClose={() => setPatternModal(null)}
      />
    </div>
  );
});

interface CodeValueStep1PatternPopupProps {
  side: 'low' | 'high';
  result: AnalysisResult;
  runLengthText: string;
  onClose: () => void;
  onOpenPatternDetail: (modal: PatternModalState) => void;
}

function CodeValueStep1PatternPopup({
  side,
  result,
  runLengthText,
  onClose,
  onOpenPatternDetail,
}: CodeValueStep1PatternPopupProps) {
  const { t } = useI18n();
  const isLow = side === 'low';
  const title = isLow ? t('analysis.panel.lowPoint') : t('analysis.panel.highPoint');
  const patterns = isLow ? result.lowPatterns : result.highPatterns;
  const count = isLow ? result.lowCount : result.highCount;
  const rate = isLow ? result.lowRate : result.highRate;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="win-dialog-window flex max-h-[90vh] w-full max-w-5xl flex-col shadow-lg">
        <div className="win-titlebar flex items-center justify-between">
          <span>{title}</span>
          <button type="button" className="win-button text-xs" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-3">
          <div className="mb-2 text-sm text-content-muted">
            {t('analysis.pattern.statsLine', { side: isLow ? 'Low' : 'High', count, rate })}
          </div>
          <div className="mb-4">
            <div className="mb-1 text-xs text-content-muted">{t('codeValue.legacy.sPatternPopupHint')}</div>
            <pre className="win-pattern-stats-sequence win-pattern-stats-sequence-classic max-h-[40vh] overflow-auto whitespace-pre-wrap">
              {runLengthText || t('analysis.pattern.noValues')}
            </pre>
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold text-[#000080]">
              {t('codeValue.legacy.patternAnalysisPopupSection')}
            </div>
            <PatternValuesTable
              side={side}
              rows={CODE_VALUE_PATTERN_ROWS}
              patterns={patterns}
              activeHighlight={null}
              onOpenModal={onOpenPatternDetail}
              onPatternHighlight={() => {}}
              onPatternPin={() => {}}
              density="comfortable"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
