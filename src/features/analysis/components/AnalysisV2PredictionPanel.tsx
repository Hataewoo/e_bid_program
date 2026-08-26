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

  const finalDigit = v2?.finalDigit ?? null;

  return (
    <div className="flex min-w-0 flex-1 items-center gap-4 bg-[#f5fff5] px-4 py-2">
      <div className="shrink-0">
        <div className="text-sm font-semibold text-[#006400]">
          {t('analysis.prediction.v2.title')}
        </div>
      </div>

      {!hasData || finalDigit == null ? (
        <div className="text-sm text-content-muted">{t('analysis.prediction.empty')}</div>
      ) : (
        <div className="rounded border border-[#006400] bg-[#e8ffe8] px-4 py-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-[#006400]">
            {t('analysis.prediction.v2.recommendedValue')}
          </div>
          <div className="font-mono text-4xl font-bold leading-none text-black">{finalDigit}</div>
        </div>
      )}
    </div>
  );
});
