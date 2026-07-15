import { memo, useMemo } from 'react';
import type { AnalysisResult } from '@/shared/utils/analysisEngine';
import { MasterValueTextarea } from '@/components/ui/MasterValueTextarea';
import { useI18n } from '@/i18n/use-i18n';
import {
  HIGH_PATTERN_ROWS,
  LOW_PATTERN_ROWS,
  type PatternHighlightState,
  type PatternModalState,
} from '../types/pattern-rows';
import { filterDigitsByClass } from '../utils/analysis-display';
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
    () => filterDigitsByClass(result.digits, side),
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

      <MasterValueTextarea readOnly value={rawText} />

      <div className="win-pattern-stats-line">{statsLine}</div>

      <div className="win-pattern-values-panel min-h-[200px] flex-1 overflow-auto p-0">
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
