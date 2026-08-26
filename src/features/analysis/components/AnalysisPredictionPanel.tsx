import { memo, useMemo } from 'react';

import type { AnalysisResult, CodeValueStatRow } from '@/shared/utils/analysisEngine';

import { predictNextDigitStep } from '@/shared/utils/nextDigitEngine';

import { useI18n } from '@/i18n/use-i18n';

interface AnalysisPredictionPanelProps {
  result: AnalysisResult;
  codeValueStats: CodeValueStatRow[];
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

  const recommendedDigit = nextStep?.scoreBreakdown?.winningDigit ?? null;

  return (
    <div className="flex min-w-0 flex-1 items-center gap-4 border-r border-[#404040] bg-[#fffff0] px-4 py-2">
      <div className="shrink-0">
        <div className="text-sm font-semibold text-[#000080]">{t('analysis.prediction.title')}</div>
      </div>

      {!hasData ? (
        <div className="text-sm text-content-muted">{t('analysis.prediction.empty')}</div>
      ) : recommendedDigit != null ? (
        <div className="rounded border border-[#000080] bg-[#e8e8ff] px-4 py-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-[#000080]">
            {t('analysis.prediction.recommendedValue')}
          </div>
          <div className="font-mono text-4xl font-bold leading-none text-black">{recommendedDigit}</div>
        </div>
      ) : null}
    </div>
  );
});
