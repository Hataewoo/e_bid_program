import { memo } from 'react';
import type { PredictionResult } from '@/shared/utils/predictionEngine';
import { useI18n } from '@/i18n/use-i18n';
import { isPredictionHeuristic } from '@/shared/utils/algorithmVerificationStatus';
import { PredictionUnverifiedBanner } from './PredictionUnverifiedBanner';

interface AnalysisPredictionPanelProps {
  prediction: PredictionResult | null;
}

export const AnalysisPredictionPanel = memo(function AnalysisPredictionPanel({
  prediction,
}: AnalysisPredictionPanelProps) {
  const { t } = useI18n();
  const heuristic = isPredictionHeuristic();

  return (
    <div className="shrink-0 border-b border-[#404040] bg-[#fffff0] px-3 py-2">
      <PredictionUnverifiedBanner className="mb-2" />

      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold text-[#000080]">
            {t('analysis.prediction.title')}
            {heuristic ? (
              <span className="ml-2 text-[10px] font-normal text-[#b8860b]">
                ({t('algorithm.prediction.heuristicLabel')})
              </span>
            ) : null}
          </div>
          {prediction?.value ? (
            <div className="mt-1 font-mono text-lg font-bold tracking-wider text-black">
              {prediction.value}
            </div>
          ) : (
            <div className="mt-1 text-xs text-content-muted">{t('analysis.prediction.empty')}</div>
          )}
        </div>

        {prediction?.value ? (
          <div className="text-right text-[10px] text-black">
            <div>
              {t('analysis.prediction.confidence')}: {prediction.confidence}%
            </div>
            <div>
              STEP2 {prediction.step2Count} / STEP3 {prediction.step3Count}
            </div>
            {prediction.topCode ? (
              <div>
                Top Code: {prediction.topCode} ({prediction.topCodeCount})
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {prediction?.rationale?.length ? (
        <ul className="mt-2 list-inside list-disc text-[10px] leading-relaxed text-[#404040]">
          {prediction.rationale.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
});
