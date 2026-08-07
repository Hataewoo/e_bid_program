import { memo, useMemo } from 'react';
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
                <div className="win-point-values-header shrink-0 font-semibold text-[#0000ff]">
                  {t(pointHeaderKey)}
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
                <div className="win-pattern-stats-sequence shrink-0 text-[calc(14px*var(--font-scale))] leading-snug">
                  {t('codeValue.legacy.masterCountLow')}: {stepBands.masterCountLow || '-'}
                </div>
                <div className="win-pattern-stats-sequence shrink-0 text-[calc(14px*var(--font-scale))] leading-snug">
                  {t('codeValue.legacy.masterCountHigh')}: {stepBands.masterCountHigh || '-'}
                </div>
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
              />
            }
            bottom={
              <LegacyPointBandSection
                headerLabel={secondaryHeader}
                band={stepBands.secondaryBand}
                storageKey={`codevalue-legacy-${side}-${SECONDARY_SUB_BAND[side]}`}
              />
            }
          />
        }
      />
    </div>
  );
});
