import { memo, useCallback, useMemo, useState } from 'react';
import type { AnalysisResult, CodeValueStatRow } from '@/shared/utils/analysisEngine';
import {
  appendDigitToInput,
  predictDigitChain,
  type NextDigitCandidate,
  type NextDigitStepResult,
} from '@/shared/utils/nextDigitEngine';
import { useI18n } from '@/i18n/use-i18n';

interface AnalysisPredictionPanelProps {
  result: AnalysisResult;
  codeValueStats: CodeValueStatRow[];
}

function CandidateRow({
  candidate,
  onPick,
}: {
  candidate: NextDigitCandidate;
  onPick: (digit: number) => void;
}) {
  return (
    <button
      type="button"
      className="flex min-w-[4.5rem] flex-col items-center rounded border border-[#808080] bg-white px-2 py-1.5 text-black hover:border-[#000080] hover:bg-[#e8e8ff]"
      onClick={() => onPick(candidate.digit)}
      title={`${candidate.digit} (${candidate.probability}%)`}
    >
      <span className="font-mono text-2xl font-bold leading-none">{candidate.digit}</span>
      <span className="mt-0.5 text-xs tabular-nums">{candidate.probability.toFixed(1)}%</span>
      {candidate.matchCount > 0 ? (
        <span className="text-[10px] text-content-muted">{candidate.matchCount}건</span>
      ) : null}
    </button>
  );
}

function StepBlock({
  step,
  label,
  onPickDigit,
}: {
  step: NextDigitStepResult;
  label: string;
  onPickDigit: (digit: number) => void;
}) {
  return (
    <div className="rounded border border-[#c0c0c0] bg-white/80 p-2">
      <div className="mb-1.5 flex flex-wrap items-baseline gap-2 text-xs text-[#404040]">
        <span className="font-semibold text-[#000080]">{label}</span>
        <span>
          prefix: <span className="font-mono">{step.prefix || '(시작)'}</span>
        </span>
        <span>
          매칭 {step.totalMatches}건 ·{' '}
          {step.source === 'prefix'
            ? '기록 직접'
            : step.source === 'blended'
              ? '기록+전체 혼합'
              : '전체 분포'}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {step.candidates.map((c) => (
          <CandidateRow key={`${step.prefix}-${c.digit}`} candidate={c} onPick={onPickDigit} />
        ))}
      </div>
    </div>
  );
}

export const AnalysisPredictionPanel = memo(function AnalysisPredictionPanel({
  result,
  codeValueStats,
}: AnalysisPredictionPanelProps) {
  const { t } = useI18n();
  const [input, setInput] = useState('');
  const [extraChainSteps, setExtraChainSteps] = useState(0);

  const hasData = result.totalCount > 0;

  const prediction = useMemo(
    () =>
      predictDigitChain(result, codeValueStats, input, {
        extraSteps: extraChainSteps,
      }),
    [result, codeValueStats, input, extraChainSteps],
  );

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
    setExtraChainSteps(0);
  }, []);

  const handlePickDigit = useCallback((digit: number) => {
    setInput((prev) => appendDigitToInput(prev, digit));
    setExtraChainSteps(0);
  }, []);

  const handleExtendChain = useCallback(() => {
    setExtraChainSteps((n) => n + 1);
  }, []);

  const handleClear = useCallback(() => {
    setInput('');
    setExtraChainSteps(0);
  }, []);

  const displayPrefix = prediction.parsed.displayValue || input;
  const chainOnlySuffix =
    prediction.suggestedChain.length > prediction.parsed.decimalPrefix.length
      ? prediction.suggestedChain.slice(prediction.parsed.decimalPrefix.length)
      : '';

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
              onChange={(e) => handleInputChange(e.target.value)}
            />
            {displayPrefix ? (
              <span className="font-mono text-lg font-bold text-[#000080]">{displayPrefix}</span>
            ) : null}
          </div>

          {prediction.nextStep ? (
            <div>
              <div className="mb-1 text-sm font-semibold text-black">
                {t('analysis.prediction.nextDigitTitle', {
                  position: prediction.nextStep.position,
                })}
              </div>
              <StepBlock
                step={prediction.nextStep}
                label={t('analysis.prediction.immediate')}
                onPickDigit={handlePickDigit}
              />
            </div>
          ) : null}

          {prediction.chainSteps.length > 0 ? (
            <div>
              <div className="mb-1 flex flex-wrap items-baseline gap-2">
                <span className="text-sm font-semibold text-black">
                  {t('analysis.prediction.chainTitle')}
                </span>
                {chainOnlySuffix ? (
                  <span className="font-mono text-lg font-bold text-black">
                    +{chainOnlySuffix}
                    {prediction.suggestedDisplay ? (
                      <span className="ml-2 text-sm font-normal text-[#404040]">
                        → {prediction.suggestedDisplay}
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </div>
              <div className="space-y-2">
                {prediction.chainSteps.map((step, idx) => (
                  <StepBlock
                    key={`chain-${step.prefix}-${idx}`}
                    step={step}
                    label={t('analysis.prediction.chainStep', { step: idx + 1 })}
                    onPickDigit={handlePickDigit}
                  />
                ))}
              </div>
              <button
                type="button"
                className="win-button mt-2 text-xs"
                onClick={handleExtendChain}
              >
                {t('analysis.prediction.extendChain')}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
});
