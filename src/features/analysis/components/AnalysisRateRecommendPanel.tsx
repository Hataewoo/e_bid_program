import { memo, useMemo, useState } from 'react';
import type { ProbabilityProfile } from '@/shared/utils/probabilityEngine';
import {
  buildRateRecommendations,
  type RateRecommendMode,
  type RateRecommendResult,
} from '@/shared/utils/rateRecommendEngine';
import { useI18n } from '@/i18n/use-i18n';
import { cn } from '@/lib/utils';
import type { MessageKey } from '@/i18n/messages';

interface AnalysisRateRecommendPanelProps {
  probabilityProfile: ProbabilityProfile | null;
  rateRecommendations: RateRecommendResult | null;
}

const MODE_OPTIONS: { id: RateRecommendMode; labelKey: MessageKey }[] = [
  { id: 'auto', labelKey: 'analysis.rateRecommend.modeAuto' },
  { id: 'low', labelKey: 'analysis.rateRecommend.modeLow' },
  { id: 'middle', labelKey: 'analysis.rateRecommend.modeMiddle' },
  { id: 'high', labelKey: 'analysis.rateRecommend.modeHigh' },
];

export const AnalysisRateRecommendPanel = memo(function AnalysisRateRecommendPanel({
  probabilityProfile,
  rateRecommendations,
}: AnalysisRateRecommendPanelProps) {
  const { t } = useI18n();
  const [count, setCount] = useState(rateRecommendations?.options.count ?? 10);
  const [mode, setMode] = useState<RateRecommendMode>(rateRecommendations?.options.mode ?? 'auto');

  const display = useMemo(() => {
    if (!probabilityProfile || probabilityProfile.totalDigits <= 0) {
      return null;
    }
    return buildRateRecommendations(probabilityProfile, { count, mode });
  }, [probabilityProfile, count, mode]);

  const segments = probabilityProfile?.segments.filter((s) => s.segmentKey.startsWith('digit:')) ?? [];
  const showBandColumn = mode === 'auto';

  return (
    <div className="shrink-0 border-b border-[#404040] bg-[#f0fff4] px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-[#006400]">
            {t('analysis.rateRecommend.title')}
          </div>
          <div className="text-sm text-[#404040]">{t('analysis.rateRecommend.subtitle')}</div>
        </div>
        <label className="flex items-center gap-2 text-sm text-black">
          <span>{t('analysis.rateRecommend.countLabel')}</span>
          <input
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(e) => setCount(Math.min(100, Math.max(1, Number(e.target.value) || 1)))}
            className="win-input w-16 px-1 py-0.5 text-center font-mono text-sm"
          />
        </label>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1">
        <span className="mr-1 text-sm text-black">{t('analysis.rateRecommend.modeLabel')}</span>
        {MODE_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={cn(
              'win-button min-w-[80px] px-2 py-1 text-sm',
              mode === option.id && 'win-button-primary',
            )}
            onClick={() => setMode(option.id)}
          >
            {t(option.labelKey)}
          </button>
        ))}
      </div>

      {!display || display.recommendations.length === 0 ? (
        <div className="mt-2 text-sm text-content-muted">{t('analysis.rateRecommend.empty')}</div>
      ) : (
        <>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-sm text-black">
              <thead>
                <tr className="border-b border-[#808080] bg-[#e8e8e8]">
                  <th className="px-2 py-1.5 text-left">{t('analysis.rateRecommend.colRank')}</th>
                  {showBandColumn ? (
                    <th className="px-2 py-1.5 text-left">{t('analysis.rateRecommend.colBand')}</th>
                  ) : null}
                  <th className="px-2 py-1.5 text-left">{t('analysis.rateRecommend.colRate')}</th>
                  <th className="px-2 py-1.5 text-right">{t('analysis.rateRecommend.colProb')}</th>
                </tr>
              </thead>
              <tbody>
                {display.recommendations.map((row) => (
                  <tr key={`${row.band}-${row.rate}`} className="border-b border-[#c0c0c0] hover:bg-[#e8ffe8]">
                    <td className="px-2 py-1 font-mono">{row.rank}</td>
                    {showBandColumn ? (
                      <td className="px-2 py-1">
                        {row.band === 'low'
                          ? t('analysis.rateRecommend.bandLow')
                          : row.band === 'high'
                            ? t('analysis.rateRecommend.bandHigh')
                            : t('analysis.rateRecommend.bandMiddle')}
                      </td>
                    ) : null}
                    <td className="px-2 py-1 font-mono text-base font-bold tracking-wider">
                      {row.rate}
                    </td>
                    <td className="px-2 py-1 text-right font-mono">{row.probability}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {segments.length > 0 ? (
            <details className="mt-2">
              <summary className="cursor-pointer text-sm font-semibold text-[#006400]">
                {t('analysis.rateRecommend.segmentTitle')}
              </summary>
              <div className="mt-1 grid grid-cols-5 gap-1 sm:grid-cols-10">
                {segments.map((seg) => (
                  <div
                    key={seg.segmentKey}
                    className="rounded border border-[#c0c0c0] bg-white px-1 py-1 text-center text-xs"
                  >
                    <div className="font-mono font-bold">{seg.label.replace('숫자 ', '')}</div>
                    <div>{seg.probability.toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            </details>
          ) : null}

          {display.recommendations[0]?.rationale?.length ? (
            <ul className="mt-2 list-inside list-disc text-sm leading-relaxed text-[#404040]">
              <li className="font-semibold">
                1위 {display.recommendations[0].rate}:{' '}
                {display.recommendations[0].rationale.join(' · ')}
              </li>
            </ul>
          ) : null}
        </>
      )}

      <p className="mt-2 text-xs text-[#808080]">{t('analysis.rateRecommend.disclaimer')}</p>
    </div>
  );
});
