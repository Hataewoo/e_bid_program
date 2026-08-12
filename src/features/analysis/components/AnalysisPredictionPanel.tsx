import { memo, useMemo, useState } from 'react';

import type { AnalysisResult, CodeValueStatRow } from '@/shared/utils/analysisEngine';

import {
  clampNextDigitTopN,
  NEXT_DIGIT_TOP_N,
  predictNextDigitStep,
  type HierarchicalStepInfo,
  type NextDigitCandidate,
} from '@/shared/utils/nextDigitEngine';

import { useI18n } from '@/i18n/use-i18n';

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
  highlighted,
}: {
  candidate: NextDigitCandidate;
  highlighted?: boolean;
}) {
  const { t } = useI18n();
  const modeLabel =
    candidate.pickMode === 'repeat'
      ? t('analysis.prediction.candidateRepeat')
      : candidate.pickMode === 'transition'
        ? t('analysis.prediction.candidateTransition')
        : t('analysis.prediction.candidatePattern');

  return (
    <div
      className={`flex min-w-[4.5rem] flex-col items-center rounded border px-2 py-1.5 text-black ${
        highlighted
          ? 'border-[#000080] bg-[#e8e8ff] ring-1 ring-[#000080]'
          : 'border-[#808080] bg-white'
      }`}
      title={candidate.pickReason || `${candidate.digit} · ${modeLabel}`}
    >
      <span className="font-mono text-2xl font-bold leading-none">{candidate.digit}</span>
      <span className="mt-0.5 text-center text-[10px] leading-tight">{modeLabel}</span>
    </div>
  );
}

export const AnalysisPredictionPanel = memo(function AnalysisPredictionPanel({
  result,
  codeValueStats,
}: AnalysisPredictionPanelProps) {
  const { t } = useI18n();
  const [topN, setTopN] = useState(NEXT_DIGIT_TOP_N);

  const hasData = result.totalCount > 0;

  const nextStep = useMemo(
    () => predictNextDigitStep(result, codeValueStats, '', topN),
    [result, codeValueStats, topN],
  );

  const topCandidate = nextStep?.candidates[0] ?? null;

  return (
    <div className="shrink-0 border-b border-[#404040] bg-[#fffff0] px-3 py-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[#000080]">{t('analysis.prediction.title')}</div>
          <div className="mt-0.5 text-xs text-content-muted">{t('analysis.prediction.subtitle')}</div>
        </div>

        {hasData ? (
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
        ) : null}
      </div>

      {!hasData ? (
        <div className="mt-2 text-sm text-content-muted">{t('analysis.prediction.empty')}</div>
      ) : (
        <div className="mt-2 space-y-3">
          {topCandidate ? (
            <div className="rounded border border-[#000080] bg-[#e8e8ff] px-3 py-2">
              <div className="text-xs font-semibold text-[#000080]">
                {t('analysis.prediction.nextDigitTitle', { position: nextStep!.position })}
              </div>
              <div className="mt-1 font-mono text-4xl font-bold leading-none text-black" title={topCandidate.pickReason}>
                {topCandidate.digit}
              </div>
            </div>
          ) : null}

          {nextStep ? <PathSummary hierarchy={nextStep.hierarchy} /> : null}

          {nextStep && nextStep.candidates.length > 0 ? (
            <div>
              <div className="mb-1.5 text-sm font-semibold text-black">
                {t('analysis.prediction.candidatesTitle')}
              </div>
              <div className="flex flex-wrap gap-2">
                {nextStep.candidates.map((c) => (
                  <CandidateRow
                    key={`${nextStep.prefix}-${c.digit}`}
                    candidate={c}
                    highlighted={c.digit === topCandidate?.digit}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
});
