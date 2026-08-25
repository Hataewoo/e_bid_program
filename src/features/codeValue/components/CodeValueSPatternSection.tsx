import { memo } from 'react';
import type { AnalysisResult } from '@/shared/utils/analysisEngine';
import { PatternValuesTable } from '@/features/analysis/components/PatternValuesTable';
import {
  CODE_VALUE_PATTERN_ROWS,
  type PatternHighlightState,
  type PatternModalState,
  type PatternSide,
} from '@/features/analysis/types/pattern-rows';
import { formatRunLengthSequence } from '@/features/analysis/utils/analysis-display';
import { useI18n } from '@/i18n/use-i18n';

interface CodeValueSPatternSectionProps {
  side: PatternSide;
  result: AnalysisResult;
  activeHighlight: PatternHighlightState | null;
  onOpenPatternDetail: (modal: PatternModalState) => void;
  onPatternHighlight: (highlight: PatternHighlightState | null) => void;
  onPatternPin: (highlight: PatternHighlightState | null) => void;
  showPopupButton?: boolean;
  onOpenPopup?: () => void;
  /** classic: 레거시 STEP2/3 — 넓은 S run 텍스트 + Code/Values */
  layout?: 'default' | 'classic';
}

/** STEP1·2·3 — S run 시퀀스 + Code/Values 10규칙 테이블 */
export const CodeValueSPatternSection = memo(function CodeValueSPatternSection({
  side,
  result,
  activeHighlight,
  onOpenPatternDetail,
  onPatternHighlight,
  onPatternPin,
  showPopupButton = false,
  onOpenPopup,
  layout = 'default',
}: CodeValueSPatternSectionProps) {
  const { t } = useI18n();
  const isLow = side === 'low';
  const title = isLow ? t('analysis.panel.lowPoint') : t('analysis.panel.highPoint');
  const isClassic = layout === 'classic';
  const stepLabel = isLow ? t('analysis.step.step2') : t('analysis.step.step3');
  const digitRange = isLow ? '0 ~ 4' : '5 ~ 9';

  const runLengths = isLow ? result.lowRunLengths : result.highRunLengths;
  const patterns = isLow ? result.lowPatterns : result.highPatterns;
  const runLengthText = formatRunLengthSequence(runLengths);
  const count = isLow ? result.lowCount : result.highCount;
  const rate = isLow ? result.lowRate : result.highRate;

  return (
    <div
      className={`flex h-full min-h-0 flex-col overflow-hidden bg-white${
        isClassic ? (isLow ? ' win-band-section-low' : ' win-band-section-high') : ''
      }`}
    >
      <div
        className={`win-point-values-header flex shrink-0 items-center justify-between font-semibold${
          isClassic ? (isLow ? ' win-band-header-low' : ' win-band-header-high') : ' text-[#0000ff]'
        }`}
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          {isClassic ? (
            <span className={`win-band-step-badge${isLow ? ' win-band-step-badge-low' : ' win-band-step-badge-high'}`}>
              {stepLabel}
            </span>
          ) : null}
          <span className="truncate">{title}</span>
          {isClassic ? (
            <span className="text-xs font-normal opacity-90">
              {t('codeValue.legacy.bandDigitRange', { range: digitRange })}
            </span>
          ) : null}
        </div>
        {showPopupButton && onOpenPopup ? (
          <button
            type="button"
            className="win-link-popup font-normal"
            disabled={runLengths.length === 0}
            onClick={onOpenPopup}
          >
            {t('analysis.pattern.popup')}
          </button>
        ) : null}
      </div>

      <div
        className={`win-pattern-stats-line shrink-0${
          isClassic ? (isLow ? ' win-band-stats-line-low' : ' win-band-stats-line-high') : ''
        }`}
      >
        {t('analysis.pattern.statsLine', {
          side: isLow ? 'Low' : 'High',
          count,
          rate,
        })}
      </div>

      {runLengthText ? (
        <pre
          className={`win-pattern-stats-sequence shrink-0 overflow-auto whitespace-pre-wrap${
            isClassic
              ? ` win-pattern-stats-sequence-classic${isLow ? ' win-band-srun-low' : ' win-band-srun-high'}`
              : ''
          }`}
        >
          {runLengthText}
        </pre>
      ) : (
        <div className="win-pattern-stats-sequence shrink-0 text-content-muted">
          {t('analysis.pattern.noValues')}
        </div>
      )}

      <div
        className={`win-pattern-values-panel min-h-0 overflow-auto p-0${
          isClassic ? ' win-pattern-values-panel-classic flex-1' : ' flex-1'
        }`}
      >
        <PatternValuesTable
          side={side}
          rows={CODE_VALUE_PATTERN_ROWS}
          patterns={patterns}
          activeHighlight={activeHighlight}
          onOpenModal={onOpenPatternDetail}
          onPatternHighlight={onPatternHighlight}
          onPatternPin={onPatternPin}
          density={isClassic ? 'comfortable' : 'default'}
        />
      </div>
    </div>
  );
});
