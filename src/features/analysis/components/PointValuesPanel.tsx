import { memo, useMemo } from 'react';
import type { AnalysisResult } from '@/shared/utils/analysisEngine';
import { useI18n } from '@/i18n/use-i18n';
import {
  HIGH_PATTERN_ROWS,
  LOW_PATTERN_ROWS,
  type PatternHighlightState,
  type PatternModalState,
} from '../types/pattern-rows';
import { chunkDigits, filterDigitsByClass } from '../utils/analysis-display';
import { PatternValuesTable } from './PatternValuesTable';

interface PointValuesPanelProps {
  side: 'low' | 'high';
  result: AnalysisResult;
  activeHighlight: PatternHighlightState | null;
  onOpenModal: (modal: PatternModalState) => void;
  onPopup?: (side: 'low' | 'high') => void;
  onPatternHighlight: (highlight: PatternHighlightState | null) => void;
  onPatternPin: (highlight: PatternHighlightState | null) => void;
}

export const PointValuesPanel = memo(function PointValuesPanel({
  side,
  result,
  activeHighlight,
  onOpenModal,
  onPopup,
  onPatternHighlight,
  onPatternPin,
}: PointValuesPanelProps) {
  const { t } = useI18n();
  const isLow = side === 'low';
  const title = isLow ? t('analysis.panel.lowPoint') : t('analysis.panel.highPoint');

  const rawText = useMemo(
    () => chunkDigits(filterDigitsByClass(result.digits, side), 60),
    [result.digits, side],
  );

  const statsLine = useMemo(() => {
    const count = isLow ? result.lowCount : result.highCount;
    const rate = isLow ? result.lowRate : result.highRate;
    return t('analysis.pattern.statsLine', {
      side: isLow ? 'Low' : 'High',
      count,
      rate,
    });
  }, [isLow, result.highCount, result.highRate, result.lowCount, result.lowRate, t]);

  const patterns = isLow ? result.lowPatterns : result.highPatterns;
  const rows = isLow ? LOW_PATTERN_ROWS : HIGH_PATTERN_ROWS;

  return (
    <div className="win-point-values-shell flex min-h-0 flex-1 flex-col">
      <div className="win-point-values-header flex shrink-0 items-center justify-between">
        <span className="font-semibold text-[#0000ff]">{title}</span>
        <button type="button" className="win-link-popup" onClick={() => onPopup?.(side)}>
          {t('analysis.pattern.popup')}
        </button>
      </div>

      <textarea
        readOnly
        className="win-textarea-master min-h-0 flex-1 resize-none border-0 text-[11px]"
        value={rawText}
        spellCheck={false}
      />

      <div className="win-pattern-stats-line">{statsLine}</div>

      <div className="win-pattern-values-panel max-h-[132px] shrink-0 overflow-auto p-0">
        <PatternValuesTable
          side={side}
          rows={rows}
          patterns={patterns}
          activeHighlight={activeHighlight}
          onOpenModal={onOpenModal}
          onPatternHighlight={onPatternHighlight}
          onPatternPin={onPatternPin}
        />
      </div>
    </div>
  );
});
