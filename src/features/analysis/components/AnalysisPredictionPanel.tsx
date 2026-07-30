import { memo, useCallback, useMemo, useState } from 'react';
import type { AnalysisResult } from '@/shared/utils/analysisEngine';
import { parseBidRateInput, predictFromCodeValuePatterns } from '@/shared/utils/nextDigitEngine';
import { useI18n } from '@/i18n/use-i18n';

interface AnalysisPredictionPanelProps {
  result: AnalysisResult;
}

function SegmentCandidateChip({ value, probability }: { value: number; probability: number }) {
  return (
    <span className="inline-flex min-w-[2.5rem] flex-col items-center rounded border border-[#808080] bg-[#fffacd] px-2 py-1 font-mono text-lg font-bold text-black">
      {value}
      <span className="text-[10px] font-normal text-[#404040]">{probability}%</span>
    </span>
  );
}

function SegmentBlock({
  segment,
  repeatDescription,
}: {
  segment: import('@/shared/utils/runSegmentEngine').RunSegmentPrediction;
  repeatDescription?: string;
}) {
  const { t } = useI18n();
  const remaining = segment.remainingInRunCandidates.filter((c) => c.value > 0);
  const expectedRun = segment.expectedRunLengthCandidates;
  const nextSegment = segment.nextSegmentCandidates;
  const hasRecommendation =
    segment.runEndsAfterNextDigit ||
    remaining.length > 0 ||
    expectedRun.length > 0 ||
    nextSegment.length > 0;

  const matchTierLabel =
    segment.matchTier === 'exact'
      ? t('analysis.prediction.segmentMatchExact')
      : segment.matchTier === 'suffix'
        ? t('analysis.prediction.segmentMatchSuffix')
        : segment.matchTier === 'progress'
          ? t('analysis.prediction.segmentMatchProgress')
          : null;

  return (
    <div className="rounded border border-[#c0c0c0] bg-[#fffacd]/60 p-2">
      <div className="mb-1.5 text-sm font-semibold text-[#000080]">
        {t('analysis.prediction.segmentTitle')}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#404040]">
        <span>
          {t('analysis.prediction.segmentSide')}:{' '}
          <span className="font-semibold text-black">{segment.sideLabel}</span>
        </span>
        <span>
          {t('analysis.prediction.segmentSPrefix')}:{' '}
          <span className="max-w-[32rem] truncate font-mono font-semibold text-black" title={segment.sPrefixLabel}>
            {segment.sPrefixLabel}
          </span>
        </span>
        <span className="font-semibold text-[#8b4513]">
          {t('analysis.prediction.segmentProgress', {
            progress: segment.live.currentRunProgress,
          })}
        </span>
        {repeatDescription ? (
          <span className="font-semibold text-[#006400]">{repeatDescription}</span>
        ) : null}
        {segment.activePatternLabels.length > 0 ? (
          <span>
            {t('analysis.prediction.segmentPatterns')}:{' '}
            {segment.activePatternLabels.slice(0, 4).join(', ')}
          </span>
        ) : null}
        {matchTierLabel ? (
          <span className="font-semibold text-[#000080]">{matchTierLabel}</span>
        ) : null}
        {segment.sampleCount > 0 ? (
          <span>{t('analysis.prediction.segmentPatternFit')}</span>
        ) : (
          <span className="text-content-muted">{t('analysis.prediction.segmentEmpty')}</span>
        )}
      </div>
      {!hasRecommendation && segment.sampleCount === 0 ? (
        <div className="mt-2 text-xs text-content-muted">{t('analysis.prediction.segmentNoCandidate')}</div>
      ) : null}
      {segment.runEndsAfterNextDigit ? (
        <div className="mt-2 text-xs font-semibold text-[#8b4513]">
          {t('analysis.prediction.segmentRunEnds')}
        </div>
      ) : null}
      {nextSegment.length > 0 ? (
        <div className="mt-2">
          <div className="mb-1 text-xs font-semibold text-black">
            {t('analysis.prediction.segmentNext')}
          </div>
          <div className="mb-1 text-[10px] text-content-muted">
            {t('analysis.prediction.segmentNextHint')}
          </div>
          <div className="flex flex-wrap gap-2">
            {nextSegment.slice(0, 5).map((c) => (
              <SegmentCandidateChip key={`next-${c.value}`} value={c.value} probability={c.probability} />
            ))}
          </div>
        </div>
      ) : null}
      {expectedRun.length > 0 ? (
        <div className="mt-2">
          <div className="mb-1 text-xs font-semibold text-black">
            {t('analysis.prediction.segmentExpectedRun')}
          </div>
          <div className="mb-1 text-[10px] text-content-muted">
            {t('analysis.prediction.segmentExpectedRunHint', {
              progress: segment.live.currentRunProgress,
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            {expectedRun.slice(0, 5).map((c) => (
              <SegmentCandidateChip key={`run-${c.value}`} value={c.value} probability={c.probability} />
            ))}
          </div>
        </div>
      ) : null}
      {remaining.length > 0 ? (
        <div className="mt-2">
          <div className="mb-1 text-xs font-semibold text-black">
            {t('analysis.prediction.segmentRemaining')}
          </div>
          <div className="flex flex-wrap gap-2">
            {remaining.slice(0, 5).map((c) => (
              <SegmentCandidateChip key={`rem-${c.value}`} value={c.value} probability={c.probability} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export const AnalysisPredictionPanel = memo(function AnalysisPredictionPanel({
  result,
}: AnalysisPredictionPanelProps) {
  const { t } = useI18n();
  const [input, setInput] = useState('');

  const hasData = result.totalCount > 0;
  const decimalPrefix = useMemo(() => parseBidRateInput(input).decimalPrefix, [input]);

  const patternPred = useMemo(
    () => (hasData ? predictFromCodeValuePatterns(result, decimalPrefix) : null),
    [hasData, result, decimalPrefix],
  );

  const handleClear = useCallback(() => {
    setInput('');
  }, []);

  const displayPrefix = parseBidRateInput(input).displayValue || input;

  return (
    <div className="shrink-0 border-b border-[#404040] bg-[#fffff0] px-3 py-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[#000080]">{t('analysis.prediction.title')}</div>
          <div className="mt-0.5 text-xs text-content-muted">{t('analysis.prediction.subtitle')}</div>
        </div>
        {hasData ? (
          <button type="button" className="win-button text-xs" onClick={handleClear}>
            {t('analysis.prediction.clear')}
          </button>
        ) : null}
      </div>

      {!hasData ? (
        <div className="mt-2 text-sm text-content-muted">{t('analysis.prediction.empty')}</div>
      ) : (
        <div className="mt-2 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm font-semibold text-black" htmlFor="next-digit-input">
              {t('analysis.prediction.inputLabel')}
            </label>
            <input
              id="next-digit-input"
              type="text"
              inputMode="decimal"
              className="win-input min-w-[8rem] flex-1 font-mono text-lg tracking-wider"
              placeholder={t('analysis.prediction.inputPlaceholder')}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            {displayPrefix ? (
              <span className="font-mono text-lg font-bold text-[#000080]">{displayPrefix}</span>
            ) : null}
          </div>

          {patternPred ? (
            <SegmentBlock
              segment={patternPred.segment}
              repeatDescription={patternPred.repeatDescription}
            />
          ) : (
            <div className="text-xs text-content-muted">{t('analysis.prediction.segmentNoCandidate')}</div>
          )}
        </div>
      )}
    </div>
  );
});
