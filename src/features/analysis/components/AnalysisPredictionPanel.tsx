import { memo, useMemo } from 'react';

import type { AnalysisResult, CodeValueStatRow } from '@/shared/utils/analysisEngine';

import {
  predictNextDigitStep,
  type HierarchicalStepInfo,
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

export const AnalysisPredictionPanel = memo(function AnalysisPredictionPanel({
  result,
  codeValueStats,
}: AnalysisPredictionPanelProps) {
  const { t } = useI18n();

  const hasData = result.totalCount > 0;

  const nextStep = useMemo(
    () => predictNextDigitStep(result, codeValueStats, '', 1),
    [result, codeValueStats],
  );

  const topCandidate = nextStep?.candidates[0] ?? null;

  return (
    <div className="shrink-0 border-b border-[#404040] bg-[#fffff0] px-3 py-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[#000080]">{t('analysis.prediction.title')}</div>
          <div className="mt-0.5 text-xs text-content-muted">{t('analysis.prediction.subtitle')}</div>
        </div>
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
              <div
                className="mt-1 font-mono text-4xl font-bold leading-none text-black"
                title={topCandidate.pickReason}
              >
                {topCandidate.digit}
              </div>
            </div>
          ) : null}

          {nextStep ? <PathSummary hierarchy={nextStep.hierarchy} /> : null}
        </div>
      )}
    </div>
  );
});
