import { memo, useCallback, useMemo, useState } from 'react';

import type { AnalysisResult, CodeValueStatRow } from '@/shared/utils/analysisEngine';

import {

  appendDigitToInput,

  clampNextDigitTopN,

  NEXT_DIGIT_TOP_N,

  parseBidRateInput,

  predictDigitChain,

  type HierarchicalStepInfo,

  type NextDigitCandidate,

  type NextDigitStepResult,

} from '@/shared/utils/nextDigitEngine';

import { useI18n } from '@/i18n/use-i18n';

import { SubBandCountsPanel } from './SubBandCountsPanel';



interface AnalysisPredictionPanelProps {

  result: AnalysisResult;

  codeValueStats: CodeValueStatRow[];

}



function PathSummary({ hierarchy }: { hierarchy: HierarchicalStepInfo }) {

  const { t } = useI18n();



  return (

    <div className="rounded border border-[#c0c0c0] bg-[#f8f8ff] p-2 text-xs text-[#404040]">

      <div className="mb-1 font-semibold text-[#000080]">

        {t('analysis.prediction.hierarchyTitle')}

      </div>

      <ol className="list-decimal space-y-0.5 pl-4">

        <li>

          <span className="font-semibold">{t('analysis.prediction.stepMainBand')}: </span>

          <span className="text-[#0000ff]">{hierarchy.mainBandLabel}</span>

          {hierarchy.mainBandReasons[0] ? (

            <span className="text-content-muted"> — {hierarchy.mainBandReasons[0]}</span>

          ) : null}

        </li>

        <li>

          <span className="font-semibold">{t('analysis.prediction.stepSubBand')}: </span>

          <span className="text-[#0000ff]">{hierarchy.subBandLabel}</span>

          {hierarchy.subBandReasons[0] ? (

            <span className="text-content-muted"> — {hierarchy.subBandReasons[0]}</span>

          ) : null}

        </li>

        {hierarchy.activeMainCodes.length > 0 ? (

          <li>

            <span className="font-semibold">{t('analysis.prediction.stepMainCodes')}: </span>

            <span className="text-[#0000ff]">{hierarchy.activeMainCodes.slice(0, 5).join(', ')}</span>

          </li>

        ) : null}

        {hierarchy.activeSubDetailCodes.length > 0 ? (

          <li>

            <span className="font-semibold">{t('analysis.prediction.stepSubDetail')}: </span>

            <span className="text-[#0000ff]">

              {hierarchy.activeSubDetailCodes.slice(0, 5).join(', ')}

            </span>

          </li>

        ) : null}

        {hierarchy.digitReasons.length > 0 ? (
          <li>
            <span className="font-semibold">{t('analysis.prediction.stepDigitSource')}: </span>
            <span className="text-content-muted">{hierarchy.digitReasons.join(' · ')}</span>
          </li>
        ) : null}
      </ol>

    </div>

  );

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

    </button>

  );

}



function CompactStepRow({

  step,

  label,

  onPickDigit,

}: {

  step: NextDigitStepResult;

  label: string;

  onPickDigit: (digit: number) => void;

}) {

  const { t } = useI18n();

  const stageLabel = t('analysis.prediction.pickModeFull');
  const top = step.candidates[0];

  return (

    <div className="flex flex-wrap items-center gap-2 rounded border border-[#c0c0c0] bg-white/80 px-2 py-1.5 text-xs">

      <span className="font-semibold text-[#000080]">{label}</span>

      <span className="text-content-muted">{stageLabel}</span>

      <span className="text-[#0000ff]">{step.hierarchy.mainBandLabel}</span>

      <span>→</span>

      <span className="text-[#0000ff]">{step.hierarchy.subBandLabel}</span>

      <span className="font-mono">{step.prefix || '(시작)'}</span>

      <span>→</span>

      {top ? (

        <button

          type="button"

          className="font-mono text-lg font-bold text-[#000080] hover:underline"

          onClick={() => onPickDigit(top.digit)}

        >

          {top.digit}

        </button>

      ) : null}

      <span className="text-content-muted">

        [{step.hierarchy.allowedDigits.join(' ')}]

      </span>

      <div className="flex flex-wrap gap-1">

        {step.candidates.slice(0, 4).map((c) => (

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

  const [topN, setTopN] = useState(NEXT_DIGIT_TOP_N);



  const hasData = result.totalCount > 0;



  const prediction = useMemo(

    () =>

      predictDigitChain(result, codeValueStats, input, {

        extraSteps: extraChainSteps,

        topN,

      }),

    [result, codeValueStats, input, extraChainSteps, topN],

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
  const analysisPrefix = useMemo(
    () => parseBidRateInput(input).decimalPrefix,
    [input],
  );

  const comboDisplay = prediction.recommendedCombo

    ? prediction.parsed.integerPart !== null

      ? `${prediction.parsed.integerPart}.${prediction.parsed.decimalPrefix}${prediction.recommendedCombo}`

      : prediction.parsed.decimalPrefix

        ? `xx.${prediction.parsed.decimalPrefix}${prediction.recommendedCombo}`

        : `xx.${prediction.recommendedCombo}`

    : '';



  return (

    <div className="shrink-0 border-b border-[#404040] bg-[#fffff0] px-3 py-2">

      <div className="flex flex-wrap items-start justify-between gap-3">

        <div>

          <div className="text-sm font-semibold text-[#000080]">{t('analysis.prediction.title')}</div>

          <div className="mt-0.5 text-xs text-content-muted">{t('analysis.prediction.subtitle')}</div>

        </div>

        {hasData ? (

          <div className="flex flex-wrap items-center gap-2">

            <label className="flex items-center gap-2 text-xs text-black">

              <span>{t('analysis.prediction.countLabel')}</span>

              <input

                type="number"

                min={1}

                max={10}

                value={topN}

                onChange={(e) => setTopN(clampNextDigitTopN(Number(e.target.value)))}

                className="win-input w-14 px-1 py-0.5 text-center font-mono text-sm"

              />

            </label>

            <button type="button" className="win-button text-xs" onClick={handleClear}>

              {t('analysis.prediction.clear')}

            </button>

          </div>

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



          {prediction.recommendedCombo ? (

            <div className="rounded border border-[#000080] bg-[#e8e8ff] px-3 py-2">

              <div className="text-xs font-semibold text-[#000080]">

                {t('analysis.prediction.comboTitle')}

              </div>

              <div className="mt-1 font-mono text-2xl font-bold tracking-widest text-black">

                {comboDisplay || prediction.recommendedCombo}

              </div>

            </div>

          ) : null}



          {prediction.pathSummary ? <PathSummary hierarchy={prediction.pathSummary} /> : null}

          <SubBandCountsPanel result={result} prefix={analysisPrefix} />



          {prediction.chainSteps.length > 0 ? (

            <div>

              <div className="mb-1 text-sm font-semibold text-black">

                {t('analysis.prediction.chainTitle')}

              </div>

              <div className="space-y-1.5">

                {prediction.chainSteps.map((step, idx) => (

                  <CompactStepRow

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


