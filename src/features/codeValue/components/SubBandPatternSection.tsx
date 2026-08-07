import { memo, useCallback, useMemo, useState } from 'react';
import type { SidePatterns } from '@/shared/utils/analysisEngine';
import { PatternValuesTable } from '@/features/analysis/components/PatternValuesTable';
import {
  CODE_VALUE_PATTERN_ROWS,
  type PatternHighlightState,
  type PatternModalState,
} from '@/features/analysis/types/pattern-rows';
import type { PatternSide } from '@/features/analysis/types/pattern-rows';
import { formatSPrimeCommaList } from '@/shared/utils/pointValuesCodeFlow';
import { useI18n } from '@/i18n/use-i18n';
import { ResizableSplitter } from '@/components/layout/ResizableSplitter';

interface SubBandPatternSectionProps {
  headerLabel: string;
  side: PatternSide;
  sPrimeSequence: readonly number[];
  patterns: SidePatterns;
  storageKey: string;
  onOpenModal: (modal: PatternModalState) => void;
}

export const SubBandPatternSection = memo(function SubBandPatternSection({
  headerLabel,
  side,
  sPrimeSequence,
  patterns,
  storageKey,
  onOpenModal,
}: SubBandPatternSectionProps) {
  const { t } = useI18n();
  const [popupOpen, setPopupOpen] = useState(false);
  const [activeHighlight, setActiveHighlight] = useState<PatternHighlightState | null>(null);
  const [pinnedHighlight, setPinnedHighlight] = useState<PatternHighlightState | null>(null);

  const sPrimeText = useMemo(() => formatSPrimeCommaList(sPrimeSequence), [sPrimeSequence]);
  const highlight = pinnedHighlight ?? activeHighlight;

  const handlePatternPin = useCallback((state: PatternHighlightState | null) => {
    setPinnedHighlight(state);
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col border border-[#808080] bg-[#f0f0f0]">
      <div className="win-point-values-header flex shrink-0 items-center justify-between">
        <span className="font-semibold text-[#0000ff]">{headerLabel}</span>
        <button
          type="button"
          className="win-link-popup"
          disabled={sPrimeSequence.length === 0}
          onClick={() => setPopupOpen(true)}
        >
          {t('analysis.pattern.popup')}
        </button>
      </div>

      <ResizableSplitter
        storageKey={storageKey}
        defaultLeftWidth={280}
        minLeftWidth={160}
        minRightWidth={220}
        left={
          <div className="flex h-full min-h-0 flex-col bg-white">
            {sPrimeText ? (
              <div className="win-pattern-stats-sequence min-h-[52px] flex-1">{sPrimeText}</div>
            ) : (
              <div className="flex flex-1 items-center justify-center p-3 text-xs text-content-muted">
                {t('codeValue.legacy.noSubBandSequence')}
              </div>
            )}
          </div>
        }
        right={
          <div className="win-pattern-values-panel h-full min-h-0 overflow-auto p-0">
            <PatternValuesTable
              side={side}
              rows={CODE_VALUE_PATTERN_ROWS}
              patterns={patterns}
              activeHighlight={highlight}
              onOpenModal={onOpenModal}
              onPatternHighlight={setActiveHighlight}
              onPatternPin={handlePatternPin}
            />
          </div>
        }
      />

      {popupOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="win-dialog-window flex max-h-[90vh] w-full max-w-4xl flex-col shadow-lg">
            <div className="win-titlebar flex items-center justify-between">
              <span>{headerLabel}</span>
              <button type="button" className="win-button text-xs" onClick={() => setPopupOpen(false)}>
                {t('common.close')}
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-3">
              <div className="mb-1 text-xs text-content-muted">{t('codeValue.legacy.sPrimeFull')}</div>
              <pre className="win-pattern-stats-sequence max-h-[60vh] whitespace-pre-wrap">
                {sPrimeText || t('analysis.pattern.noValues')}
              </pre>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
});
