import { memo, useCallback, useMemo, useState } from 'react';
import type { AnalysisResult } from '@/shared/utils/analysisEngine';
import {
  BATCH_DECIMAL_DIGITS,
  BATCH_VARIANT_COUNT,
  parseBidRateInput,
  pickMultipleBatchNextDigits,
  predictFromCodeValuePatterns,
  type BatchBandMode,
} from '@/shared/utils/nextDigitEngine';
import type { BatchNextDigitsPick } from '@/shared/utils/codeValuePatternPredictor';
import type { MessageKey } from '@/i18n/messages';
import { useI18n } from '@/i18n/use-i18n';

interface AnalysisPredictionPanelProps {
  result: AnalysisResult;
}

const BAND_MODE_OPTIONS: { id: BatchBandMode; labelKey: MessageKey }[] = [
  { id: 'balanced', labelKey: 'analysis.prediction.bandModeAll' },
  { id: 'low', labelKey: 'analysis.prediction.bandModeLow' },
  { id: 'high', labelKey: 'analysis.prediction.bandModeHigh' },
];

function BatchVariantCard({ batch, compact }: { batch: BatchNextDigitsPick; compact?: boolean }) {
  const { t } = useI18n();
  const label = batch.variantIndex ?? 1;

  if (compact) {
    return (
      <div className="rounded border border-[#000080] bg-white/80 px-3 py-2 text-center">
        <div className="text-[10px] font-semibold text-[#000080]">
          {t('analysis.prediction.batchVariantLabel', { index: label })}
        </div>
        <div className="font-mono text-2xl font-bold tracking-[0.25em] text-black">{batch.chain}</div>
      </div>
    );
  }

  return (
    <div className="rounded border-2 border-[#000080] bg-[#fffacd] px-4 py-3">
      <div className="mb-2 text-center text-sm font-semibold text-[#000080]">
        {t('analysis.prediction.batchPickTitle')} · {t('analysis.prediction.batchVariantLabel', { index: label })}
      </div>
      <div className="text-center font-mono text-5xl font-bold tracking-[0.35em] text-black">
        {batch.chain}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {batch.steps.map((step) => (
          <div
            key={step.step}
            className="rounded border border-[#c0c0c0] bg-white/70 px-2 py-1.5 text-center"
          >
            <div className="text-[10px] font-semibold text-[#000080]">
              {t('analysis.prediction.chainStep', { step: step.step })}
            </div>
            <div className="font-mono text-2xl font-bold text-black">{step.digit}</div>
            <div className="mt-0.5 truncate text-[9px] text-content-muted">{step.patternLabel}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BatchDigitPickBlock({
  batches,
  hintKey = 'analysis.prediction.batchPickHint',
}: {
  batches: BatchNextDigitsPick[];
  hintKey?: MessageKey;
}) {
  const { t } = useI18n();
  const primary = batches[0];
  const alternates = batches.slice(1);

  if (!primary) return null;

  return (
    <div className="space-y-3">
      <BatchVariantCard batch={primary} />
      {alternates.length > 0 ? (
        <div>
          <div className="mb-2 text-xs font-semibold text-[#000080]">
            {t('analysis.prediction.batchAlternatesTitle', { count: alternates.length })}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {alternates.map((batch) => (
              <BatchVariantCard key={batch.chain} batch={batch} compact />
            ))}
          </div>
        </div>
      ) : null}
      <div className="text-center text-[10px] text-content-muted">
        {t(hintKey)}
      </div>
    </div>
  );
}

function SegmentContextBlock({
  segment,
  repeatDescription,
}: {
  segment: import('@/shared/utils/runSegmentEngine').RunSegmentPrediction;
  repeatDescription?: string;
}) {
  const { t } = useI18n();
  const next = segment.nextSegmentCandidates[0];

  return (
    <div className="rounded border border-[#c0c0c0] bg-[#fffacd]/40 p-2 text-xs text-[#404040]">
      <div className="mb-1 font-semibold text-[#000080]">{t('analysis.prediction.segmentTitle')}</div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        <span>
          {t('analysis.prediction.segmentSide')}:{' '}
          <span className="font-semibold text-black">{segment.sideLabel}</span>
        </span>
        <span>
          {t('analysis.prediction.segmentProgress', {
            progress: segment.live.currentRunProgress,
          })}
        </span>
        {repeatDescription ? (
          <span className="font-semibold text-[#006400]">{repeatDescription}</span>
        ) : null}
        {next ? (
          <span>
            {t('analysis.prediction.segmentNext')}:{' '}
            <span className="font-mono font-bold text-black">{next.value}</span>
          </span>
        ) : null}
      </div>
    </div>
  );
}

export const AnalysisPredictionPanel = memo(function AnalysisPredictionPanel({
  result,
}: AnalysisPredictionPanelProps) {
  const { t } = useI18n();
  const [input, setInput] = useState('');
  const [bandMode, setBandMode] = useState<BatchBandMode>('balanced');

  const hasData = result.totalCount > 0;
  const decimalPrefix = useMemo(() => parseBidRateInput(input).decimalPrefix, [input]);

  const patternPred = useMemo(
    () => (hasData ? predictFromCodeValuePatterns(result, decimalPrefix) : null),
    [hasData, result, decimalPrefix],
  );

  const bandBatches = useMemo(() => {
    if (!hasData || bandMode === 'balanced') return [];
    return pickMultipleBatchNextDigits(
      result,
      decimalPrefix,
      BATCH_DECIMAL_DIGITS,
      BATCH_VARIANT_COUNT,
      bandMode,
    );
  }, [hasData, result, decimalPrefix, bandMode]);

  const handleClear = useCallback(() => {
    setInput('');
  }, []);

  const displayPrefix = parseBidRateInput(input).displayValue || input;
  const balancedBatches =
    patternPred?.batchDigitPicks && patternPred.batchDigitPicks.length > 0
      ? patternPred.batchDigitPicks
      : patternPred?.batchDigitPick
        ? [patternPred.batchDigitPick]
        : [];
  const activeBatches = bandMode === 'balanced' ? balancedBatches : bandBatches;
  const batchHintKey: MessageKey =
    bandMode === 'low'
      ? 'analysis.prediction.batchPickHintLow'
      : bandMode === 'high'
        ? 'analysis.prediction.batchPickHintHigh'
        : 'analysis.prediction.batchPickHint';

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

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[#000080]">
              {t('analysis.prediction.bandModeLabel')}
            </span>
            {BAND_MODE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`win-button text-xs ${bandMode === option.id ? 'win-button-primary' : ''}`}
                onClick={() => setBandMode(option.id)}
              >
                {t(option.labelKey)}
              </button>
            ))}
          </div>

          {activeBatches.length > 0 ? (
            <>
              <BatchDigitPickBlock batches={activeBatches} hintKey={batchHintKey} />
              <SegmentContextBlock
                segment={patternPred!.segment}
                repeatDescription={patternPred!.repeatDescription}
              />
            </>
          ) : patternPred ? (
            <div className="text-xs text-content-muted">{t('analysis.prediction.segmentNoCandidate')}</div>
          ) : (
            <div className="text-xs text-content-muted">{t('analysis.prediction.segmentNoCandidate')}</div>
          )}
        </div>
      )}
    </div>
  );
});
