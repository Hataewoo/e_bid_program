import { memo, useCallback, useMemo } from 'react';
import { useI18n } from '@/i18n/use-i18n';
import type { SidePatterns } from '@/shared/utils/analysisEngine';
import {
  getPatternValues,
  type PatternHighlightState,
  type PatternModalState,
  type PatternRowDef,
  type PatternSide,
} from '../types/pattern-rows';
import { getPatternValuesMatchCount } from '@/shared/utils/codeValueSubAnalysis';
import { formatPatternValuesPreview } from '../utils/analysis-display';

interface PatternValuesTableProps {
  side: PatternSide;
  rows: PatternRowDef[];
  patterns: SidePatterns;
  activeHighlight: PatternHighlightState | null;
  onOpenModal: (modal: PatternModalState) => void;
  onPatternHighlight: (highlight: PatternHighlightState | null) => void;
  onPatternPin: (highlight: PatternHighlightState | null) => void;
}

export const PatternValuesTable = memo(function PatternValuesTable({
  side,
  rows,
  patterns,
  activeHighlight,
  onOpenModal,
  onPatternHighlight,
  onPatternPin,
}: PatternValuesTableProps) {
  const { t } = useI18n();
  const tableRows = useMemo(
    () =>
      rows.map((row) => {
        const values = getPatternValues(patterns, row.field);
        return {
          ...row,
          values,
          matchCount: getPatternValuesMatchCount(values),
        };
      }),
    [rows, patterns],
  );

  const handleOpenDetail = useCallback(
    (row: PatternRowDef, values: number[]) => {
      if (values.length === 0) return;
      onOpenModal({
        side,
        code: row.code,
        values,
        valueKind: row.valueKind,
      });
    },
    [side, onOpenModal],
  );

  const handleCodeDoubleClick = useCallback(
    (row: PatternRowDef, values: number[]) => {
      if (values.length === 0) return;
      onPatternPin({ side, field: row.field, code: row.code });
      handleOpenDetail(row, values);
    },
    [side, handleOpenDetail, onPatternPin],
  );

  const handleValueClick = useCallback(
    (row: PatternRowDef, values: number[]) => {
      if (values.length === 0) return;
      onPatternPin({ side, field: row.field, code: row.code });
    },
    [side, onPatternPin],
  );

  const handleMouseEnter = useCallback(
    (row: PatternRowDef, values: number[]) => {
      if (values.length === 0) {
        onPatternHighlight(null);
        return;
      }
      onPatternHighlight({ side, field: row.field, code: row.code });
    },
    [side, onPatternHighlight],
  );

  const handleMouseLeave = useCallback(() => {
    onPatternHighlight(null);
  }, [onPatternHighlight]);

  return (
    <table className="win-pattern-values-table">
      <thead>
        <tr>
          <th className="win-pattern-code-col text-left">Code</th>
          <th className="w-10 text-right">{t('analysis.subBandCounts.colMatchCount')}</th>
          <th className="win-pattern-values-col text-left">Values</th>
        </tr>
      </thead>
      <tbody>
        {tableRows.map((row) => {
          const isActive =
            activeHighlight?.side === side &&
            activeHighlight.field === row.field &&
            activeHighlight.code === row.code;
          const hasValues = row.values.length > 0;

          return (
            <tr
              key={row.code}
              className={`${isActive ? 'win-pattern-row-active' : ''} ${hasValues ? 'cursor-pointer' : ''}`}
              onMouseEnter={() => handleMouseEnter(row, row.values)}
              onMouseLeave={handleMouseLeave}
            >
              <td
                className={
                  hasValues
                    ? 'win-pattern-code-col cursor-pointer select-none font-semibold text-[#0000ff] hover:underline'
                    : 'win-pattern-code-col'
                }
                title={hasValues ? t('analysis.pattern.subDetailDblClickHint') : undefined}
                onDoubleClick={() => handleCodeDoubleClick(row, row.values)}
              >
                {row.code}
              </td>
              <td
                className="text-right font-mono tabular-nums"
                title={hasValues ? t('analysis.subBandCounts.matchCountHint') : undefined}
              >
                {hasValues ? row.matchCount : '-'}
              </td>
              <td className="win-pattern-values-col">
                {!hasValues ? (
                  <span className="text-content-muted">-</span>
                ) : (
                  <button
                    type="button"
                    className="win-link-value text-left"
                    onClick={() => handleValueClick(row, row.values)}
                  >
                    {formatPatternValuesPreview(row.values).text}
                  </button>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
});
