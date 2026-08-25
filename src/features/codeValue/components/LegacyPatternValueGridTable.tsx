import { memo, useCallback } from 'react';
import type { LegacyPatternValueGridRow } from '@/shared/utils/legacyEmyoungAlgorithms';
import { useI18n } from '@/i18n/use-i18n';
import {
  patternModalFromLegacyRow,
  type PatternModalState,
  type PatternSide,
} from '@/features/analysis/types/pattern-rows';

interface LegacyPatternValueGridTableProps {
  rows: readonly LegacyPatternValueGridRow[];
  side?: PatternSide;
  onOpenPatternDetail?: (modal: PatternModalState) => void;
}

/** E-Myoung grid_Code_* — RearchRs_Grid_Code 10행 */
export const LegacyPatternValueGridTable = memo(function LegacyPatternValueGridTable({
  rows,
  side,
  onOpenPatternDetail,
}: LegacyPatternValueGridTableProps) {
  const { t } = useI18n();

  const handleOpenDetail = useCallback(
    (row: LegacyPatternValueGridRow) => {
      if (!side || !onOpenPatternDetail) return;
      const modal = patternModalFromLegacyRow(side, row.label, row.content);
      if (modal) onOpenPatternDetail(modal);
    },
    [side, onOpenPatternDetail],
  );

  return (
    <table className="win-pattern-values-table win-legacy-pattern-table w-full">
      <thead>
        <tr>
          <th className="win-pattern-code-col text-left">{t('codeValue.legacy.patternLabelColumn')}</th>
          <th className="win-pattern-values-col text-left">{t('codeValue.legacy.patternContentColumn')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const hasContent = row.content.length > 0;
          const canOpenDetail = Boolean(side && onOpenPatternDetail && hasContent);

          return (
            <tr key={row.label} className={canOpenDetail ? 'cursor-pointer' : undefined}>
              <td
                className={
                  canOpenDetail
                    ? 'win-pattern-code-col cursor-pointer select-none font-semibold text-[#0000ff] hover:underline'
                    : 'win-pattern-code-col font-semibold text-[#000080]'
                }
                title={canOpenDetail ? t('analysis.pattern.subDetailDblClickHint') : undefined}
                onDoubleClick={() => handleOpenDetail(row)}
              >
                {row.label}
              </td>
              <td
                className={
                  canOpenDetail
                    ? 'win-pattern-values-col win-legacy-table-content cursor-pointer'
                    : 'win-pattern-values-col win-legacy-table-content'
                }
                title={canOpenDetail ? t('analysis.pattern.subDetailDblClickHint') : undefined}
                onDoubleClick={() => handleOpenDetail(row)}
              >
                {row.content || '-'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
});
