import { memo, useMemo } from 'react';
import type { AnalysisResult } from '@/shared/utils/analysisEngine';
import {
  buildSubBandPointValueCounts,
  type SubBandComparisonDetail,
  type SubBandPointValuesCountDetail,
} from '@/shared/utils/pointValuesCodeFlow';
import { getSubBandLabel, type DigitSubBand } from '@/shared/utils/digitSubBand';
import { formatPatternValuesPreview } from '../utils/analysis-display';
import { useI18n } from '@/i18n/use-i18n';

interface SubBandCountsPanelProps {
  result: AnalysisResult;
  prefix: string;
}

function ComparisonBar({ comparison }: { comparison: SubBandComparisonDetail }) {
  const { t } = useI18n();
  const [subA, subB] =
    comparison.mainBand === 'low'
      ? (['lowLow', 'lowHigh'] as const)
      : (['highLow', 'highHigh'] as const);

  const scoreA = comparison.scores[subA] ?? 0;
  const scoreB = comparison.scores[subB] ?? 0;
  const total = scoreA + scoreB || 1;
  const widthA = Math.round((scoreA / total) * 100);
  const widthB = 100 - widthA;

  return (
    <div className="rounded border border-[#c0c0c0] bg-white p-2">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-1 text-xs">
        <span className="font-semibold text-[#000080]">
          {comparison.mainBandLabel} {t('analysis.subBandCounts.comparisonTitle')}
        </span>
        {comparison.sPrimeTail.length > 0 ? (
          <span className="font-mono text-[#0000ff]">
            S′ [{comparison.sPrimeTail.join(', ')}]
          </span>
        ) : null}
      </div>
      <div className="flex h-5 overflow-hidden rounded border border-[#808080]">
        <div
          className={`flex items-center justify-center text-[10px] font-semibold ${
            comparison.selected === subA ? 'bg-[#000080] text-white' : 'bg-[#d0d0ff] text-black'
          }`}
          style={{ width: `${Math.max(widthA, 12)}%` }}
          title={`${getSubBandLabel(subA)}: ${scoreA.toFixed(2)}`}
        >
          {scoreA.toFixed(1)}
        </div>
        <div
          className={`flex items-center justify-center text-[10px] font-semibold ${
            comparison.selected === subB ? 'bg-[#000080] text-white' : 'bg-[#ffe8d0] text-black'
          }`}
          style={{ width: `${Math.max(widthB, 12)}%` }}
          title={`${getSubBandLabel(subB)}: ${scoreB.toFixed(2)}`}
        >
          {scoreB.toFixed(1)}
        </div>
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-content-muted">
        <span className={comparison.selected === subA ? 'font-semibold text-[#000080]' : ''}>
          {getSubBandLabel(subA)}
        </span>
        <span className={comparison.selected === subB ? 'font-semibold text-[#000080]' : ''}>
          {getSubBandLabel(subB)}
        </span>
      </div>
    </div>
  );
}

function SubBandCountTable({ detail }: { detail: SubBandPointValuesCountDetail }) {
  const { t } = useI18n();

  return (
    <div className="flex min-h-0 flex-col rounded border border-[#c0c0c0] bg-white">
      <div className="border-b border-[#c0c0c0] bg-[#f0f0ff] px-2 py-1">
        <div className="text-xs font-semibold text-[#000080]">{detail.label}</div>
        <div className="text-[10px] text-content-muted">
          {t('analysis.subBandCounts.filtered', { count: detail.filteredLength })}
          {detail.baseSequenceTail.length > 0 ? (
            <span className="ml-2 font-mono text-[#0000ff]">
              S″ [{detail.baseSequenceTail.join(', ')}]
            </span>
          ) : null}
        </div>
      </div>
      <div className="max-h-36 overflow-auto">
        <table className="win-pattern-values-table w-full text-xs">
          <thead>
            <tr>
              <th className="win-pattern-code-col text-left">Code</th>
              <th className="w-10 text-right">{t('analysis.subBandCounts.colMatchCount')}</th>
              <th className="win-pattern-values-col text-left">Values</th>
            </tr>
          </thead>
          <tbody>
            {detail.activeRules.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-content-muted">
                  {t('analysis.subBandCounts.noRules')}
                </td>
              </tr>
            ) : (
              detail.activeRules.map((rule) => {
                const preview = formatPatternValuesPreview(rule.values);
                return (
                <tr key={`${detail.subBand}-${rule.code}`}>
                  <td className="win-pattern-code-col font-semibold text-[#0000ff]">{rule.code}</td>
                  <td
                    className="text-right font-mono tabular-nums"
                    title={t('analysis.subBandCounts.matchCountHint')}
                  >
                    {preview.matchCount}
                  </td>
                  <td className="win-pattern-values-col font-mono">{preview.text}</td>
                </tr>
              );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const SubBandCountsPanel = memo(function SubBandCountsPanel({
  result,
  prefix,
}: SubBandCountsPanelProps) {
  const { t } = useI18n();

  const report = useMemo(
    () => buildSubBandPointValueCounts(result, prefix),
    [result, prefix],
  );

  const bySubBand = useMemo(() => {
    const map = new Map<DigitSubBand, SubBandPointValuesCountDetail>();
    for (const detail of report.details) {
      map.set(detail.subBand, detail);
    }
    return map;
  }, [report.details]);

  return (
    <div className="rounded border border-[#808080] bg-[#fffff8] p-2">
      <div className="mb-2 text-xs font-semibold text-[#000080]">
        {t('analysis.subBandCounts.title')}
      </div>

      <div className="mb-2 grid gap-2 md:grid-cols-2">
        <ComparisonBar comparison={report.lowComparison} />
        <ComparisonBar comparison={report.highComparison} />
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {(['lowLow', 'lowHigh', 'highLow', 'highHigh'] as const).map((subBand) => {
          const detail = bySubBand.get(subBand);
          if (!detail) return null;
          return <SubBandCountTable key={subBand} detail={detail} />;
        })}
      </div>
    </div>
  );
});
