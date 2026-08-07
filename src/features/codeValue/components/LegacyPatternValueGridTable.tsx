import { memo } from 'react';
import type { LegacyPatternValueGridRow } from '@/shared/utils/legacyEmyoungAlgorithms';
import { useI18n } from '@/i18n/use-i18n';

interface LegacyPatternValueGridTableProps {
  rows: readonly LegacyPatternValueGridRow[];
}

/** E-Myoung grid_Code_* — RearchRs_Grid_Code 10행 */
export const LegacyPatternValueGridTable = memo(function LegacyPatternValueGridTable({
  rows,
}: LegacyPatternValueGridTableProps) {
  const { t } = useI18n();

  return (
    <table className="win-pattern-values-table win-legacy-pattern-table w-full">
      <thead>
        <tr>
          <th className="win-pattern-code-col text-left">{t('codeValue.legacy.patternLabelColumn')}</th>
          <th className="win-pattern-values-col text-left">{t('codeValue.legacy.patternContentColumn')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <td className="win-pattern-code-col font-semibold text-[#000080]">{row.label}</td>
            <td className="win-pattern-values-col win-legacy-table-content">{row.content || '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
});
