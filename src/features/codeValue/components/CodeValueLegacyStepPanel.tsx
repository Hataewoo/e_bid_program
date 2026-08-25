import { memo, useCallback, useMemo, useState } from 'react';
import type { AnalysisResult, CodeMatchInput } from '@/shared/utils/analysisEngine';
import {
  buildLegacyCodeContentRows,
  buildLegacyStepPanelBands,
  LEGACY_CODE_CONTENT_ENGINE_VERSION,
} from '@/shared/utils/legacyCodeContentEngine';
import { LEGACY_STEP2_CODE_ORDER, LEGACY_STEP3_CODE_ORDER } from '@/shared/fixtures/legacy-step-code-catalog';
import { MasterValueTextarea } from '@/components/ui/MasterValueTextarea';
import { ResizableSplitter } from '@/components/layout/ResizableSplitter';
import { ResizableVerticalSplitter } from '@/components/layout/ResizableVerticalSplitter';
import { filterDigitsByClass, formatRunLengthSequence } from '@/features/analysis/utils/analysis-display';
import { PatternValuesTable } from '@/features/analysis/components/PatternValuesTable';
import { PatternDetailModal } from '@/features/analysis/components/PatternDetailModal';
import { CODE_VALUE_PATTERN_ROWS, type PatternModalState } from '@/features/analysis/types/pattern-rows';
import type { DigitBand, DigitSubBand } from '@/shared/utils/digitSubBand';
import { useI18n } from '@/i18n/use-i18n';
import type { MessageKey } from '@/i18n/messages';
import { LegacyCodeMatchTable } from './LegacyCodeMatchTable';
import { LegacyPointBandSection } from './LegacyPointBandSection';

interface CodeValueLegacyStepPanelProps {
  side: DigitBand;
  result: AnalysisResult;
  codes: CodeMatchInput[];
  loading?: boolean;
}

const SUB_BAND_HEADER_KEYS: Record<DigitSubBand, MessageKey> = {
  lowLow: 'codeValue.legacy.headerLowLow',
  lowHigh: 'codeValue.legacy.headerLowHigh',
  highLow: 'codeValue.legacy.headerHighLow',
  highHigh: 'codeValue.legacy.headerHighHigh',
};

const PRIMARY_SUB_BAND: Record<DigitBand, DigitSubBand> = {
  low: 'lowLow',
  high: 'highLow',
};

const SECONDARY_SUB_BAND: Record<DigitBand, DigitSubBand> = {
  low: 'lowHigh',
  high: 'highHigh',
};

export const CodeValueLegacyStepPanel = memo(function CodeValueLegacyStepPanel({
  side,
  result,
  codes,
  loading = false,
}: CodeValueLegacyStepPanelProps) {
  const { t } = useI18n();
  const [sPatternPopupOpen, setSPatternPopupOpen] = useState(false);
  const [patternModal, setPatternModal] = useState<PatternModalState | null>(null);

  const handleOpenPatternDetail = useCallback(
    (modal: PatternModalState) => setPatternModal(modal),
    [],
  );

  const isLow = side === 'low';
  const patternSide = isLow ? 'low' : 'high';

  const rawPointText = useMemo(
    () => filterDigitsByClass(result.digits, patternSide),
    [result.digits, patternSide],
  );

  const stepBands = useMemo(
    () => buildLegacyStepPanelBands(result.digits, side),
    [result.digits, side],
  );

  const runLengths = isLow ? result.lowRunLengths : result.highRunLengths;
  const runLengthText = formatRunLengthSequence(runLengths);
  const sPatterns = isLow ? result.lowPatterns : result.highPatterns;
  const lowCount = result.lowCount;
  const highCount = result.highCount;
  const lowRate = result.lowRate;
  const highRate = result.highRate;

  const legacyCodeRows = useMemo(
    () =>
      buildLegacyCodeContentRows(result, codes, patternSide, {
        codeOrder: isLow ? LEGACY_STEP2_CODE_ORDER : LEGACY_STEP3_CODE_ORDER,
      }),
    [result, codes, patternSide, isLow],
  );

  const pointHeaderKey = isLow ? 'analysis.panel.lowPoint' : 'analysis.panel.highPoint';
  const codeTableTitleKey = isLow
    ? 'codeValue.legacy.step2CodeTableTitle'
    : 'codeValue.legacy.step3CodeTableTitle';
  const codeTableHintKey = isLow
    ? 'codeValue.legacy.step2CodeTableHint'
    : 'codeValue.legacy.step3CodeTableHint';

  const primaryHeader = t(SUB_BAND_HEADER_KEYS[PRIMARY_SUB_BAND[side]]);
  const secondaryHeader = t(SUB_BAND_HEADER_KEYS[SECONDARY_SUB_BAND[side]]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-px bg-[#808080] p-px">
      <ResizableVerticalSplitter
        storageKey={`codevalue-legacy-${side}-top`}
        defaultTopPercent={38}
        minTopPercent={22}
        minBottomPercent={28}
        top={
          <ResizableSplitter
            storageKey={`codevalue-legacy-${side}-header`}
            defaultLeftWidth={420}
            minLeftWidth={240}
            minRightWidth={260}
            left={
              <div className="flex h-full min-h-0 flex-col bg-white">
                <div className="win-point-values-header flex shrink-0 items-center justify-between font-semibold text-[#0000ff]">
                  <span>{t(pointHeaderKey)}</span>
                  <button
                    type="button"
                    className="win-link-popup font-normal"
                    disabled={runLengths.length === 0}
                    onClick={() => setSPatternPopupOpen(true)}
                  >
                    {t('analysis.pattern.popup')}
                  </button>
                </div>
                <MasterValueTextarea readOnly value={rawPointText} className="min-h-0 flex-1" />
                <div className="win-pattern-stats-line shrink-0">
                  {t('analysis.pattern.statsLine', {
                    side: isLow ? 'Low' : 'High',
                    count: isLow ? lowCount : highCount,
                    rate: isLow ? lowRate : highRate,
                  })}
                </div>
                {runLengthText ? (
                  <div className="win-pattern-stats-sequence shrink-0">{runLengthText}</div>
                ) : null}
              </div>
            }
            right={
              <div className="flex h-full min-h-0 flex-col bg-white">
                <div className="win-point-values-header shrink-0 font-semibold text-[#000080]">
                  {t(codeTableTitleKey)}
                </div>
                <LegacyCodeMatchTable
                  rows={legacyCodeRows}
                  loading={loading}
                  engineVersion={LEGACY_CODE_CONTENT_ENGINE_VERSION}
                  hintKey={codeTableHintKey}
                  patternSide={patternSide}
                  onOpenPatternDetail={handleOpenPatternDetail}
                />
              </div>
            }
          />
        }
        bottom={
          <ResizableVerticalSplitter
            storageKey={`codevalue-legacy-${side}-subs`}
            defaultTopPercent={50}
            minTopPercent={25}
            minBottomPercent={25}
            top={
              <LegacyPointBandSection
                headerLabel={primaryHeader}
                band={stepBands.primaryBand}
                storageKey={`codevalue-legacy-${side}-${PRIMARY_SUB_BAND[side]}`}
                patternSide={patternSide}
                onOpenPatternDetail={handleOpenPatternDetail}
              />
            }
            bottom={
              <LegacyPointBandSection
                headerLabel={secondaryHeader}
                band={stepBands.secondaryBand}
                storageKey={`codevalue-legacy-${side}-${SECONDARY_SUB_BAND[side]}`}
                patternSide={patternSide}
                onOpenPatternDetail={handleOpenPatternDetail}
              />
            }
          />
        }
      />

      {sPatternPopupOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="win-dialog-window flex max-h-[90vh] w-full max-w-5xl flex-col shadow-lg">
            <div className="win-titlebar flex items-center justify-between">
              <span>{t(pointHeaderKey)}</span>
              <button
                type="button"
                className="win-button text-xs"
                onClick={() => setSPatternPopupOpen(false)}
              >
                {t('common.close')}
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-3">
              <div className="mb-2 text-xs text-content-muted">
                {t('analysis.pattern.statsLine', {
                  side: isLow ? 'Low' : 'High',
                  count: isLow ? lowCount : highCount,
                  rate: isLow ? lowRate : highRate,
                })}
              </div>
              <div className="mb-4">
                <div className="mb-1 text-xs text-content-muted">{t('codeValue.legacy.sPatternPopupHint')}</div>
                <pre className="win-pattern-stats-sequence max-h-[32vh] overflow-auto whitespace-pre-wrap">
                  {runLengthText || t('analysis.pattern.noValues')}
                </pre>
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold text-[#000080]">
                  {t('codeValue.legacy.patternAnalysisPopupSection')}
                </div>
                <PatternValuesTable
                  side={patternSide}
                  rows={CODE_VALUE_PATTERN_ROWS}
                  patterns={sPatterns}
                  activeHighlight={null}
                  onOpenModal={handleOpenPatternDetail}
                  onPatternHighlight={() => {}}
                  onPatternPin={() => {}}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <PatternDetailModal
        modal={patternModal}
        masterNo={result.masterNo}
        onClose={() => setPatternModal(null)}
      />
    </div>
  );
});
