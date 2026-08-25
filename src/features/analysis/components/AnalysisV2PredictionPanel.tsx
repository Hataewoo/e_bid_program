import { memo, useMemo } from 'react';

import type { AnalysisResult } from '@/shared/utils/analysisEngine';
import { runHumanStyleV2 } from '@/shared/utils/humanStyleCounterfactualPredictor';

import { useI18n } from '@/i18n/use-i18n';

interface AnalysisV2PredictionPanelProps {
  result: AnalysisResult;
}

export const AnalysisV2PredictionPanel = memo(function AnalysisV2PredictionPanel({
  result,
}: AnalysisV2PredictionPanelProps) {
  const { t } = useI18n();

  const hasData = result.totalCount > 0;

  const v2 = useMemo(
    () => (hasData ? runHumanStyleV2(result.digits, result.masterNo) : null),
    [hasData, result.digits, result.masterNo],
  );

  const display = v2
    ? {
        step1: v2.step1.winnerId,
        step2: v2.step2?.winnerId ?? null,
        finalDigit: v2.finalDigit,
      }
    : null;

  return (
    <div className="shrink-0 border-b border-[#404040] bg-[#f5fff5] px-3 py-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[#006400]">
            {t('analysis.prediction.v2.title')}
          </div>
          <div className="mt-0.5 text-xs text-content-muted">
            {t('analysis.prediction.v2.subtitle')}
          </div>
        </div>
      </div>

      {!hasData || !display ? (
        <div className="mt-2 text-sm text-content-muted">{t('analysis.prediction.empty')}</div>
      ) : (
        <div className="mt-2 space-y-3">
          {display.finalDigit != null ? (
            <div className="rounded border border-[#006400] bg-[#e8ffe8] px-3 py-2">
              <div className="text-xs font-semibold text-[#006400]">
                {t('analysis.prediction.v2.recommendedValue')}
              </div>
              <div className="mt-1 font-mono text-4xl font-bold leading-none text-black">
                {display.finalDigit}
              </div>
            </div>
          ) : null}

          <div className="rounded border border-[#c0c0c0] bg-[#f8fff8] p-2 text-xs text-[#404040]">
            <div className="mb-1 font-semibold text-[#006400]">
              {t('analysis.prediction.v2.hierarchyTitle')}
            </div>
            <ol className="list-decimal space-y-0.5 pl-4">
              <li>
                <span className="font-semibold">{t('analysis.prediction.v2.step1')}: </span>
                <span className="font-mono text-[#0000ff]">{display.step1}</span>
              </li>
              {display.step2 ? (
                <li>
                  <span className="font-semibold">{t('analysis.prediction.v2.step2')}: </span>
                  <span className="font-mono text-[#0000ff]">{display.step2}</span>
                </li>
              ) : null}
              <li>
                <span className="font-semibold">{t('analysis.prediction.v2.finalDigit')}: </span>
                <span className="font-mono text-[#0000ff]">
                  {display.finalDigit ?? '—'}
                </span>
              </li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
});
