import { memo, useCallback, useMemo } from 'react';
import type { SidePatterns } from '@/shared/utils/analysisEngine';
import {
  getPatternValues,
  type PatternHighlightState,
  type PatternModalState,
  type PatternRowDef,
  type PatternSide,
} from '../types/pattern-rows';
import { formatPatternValues } from '../utils/analysis-display';

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
  const tableRows = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        values: getPatternValues(patterns, row.field),
      })),
    [rows, patterns],
  );

  const handleClick = useCallback(
    (row: PatternRowDef, values: number[]) => {
      if (values.length === 0) return;
      const highlight: PatternHighlightState = {
        side,
        field: row.field,
        code: row.code,
      };
      onPatternPin(highlight);
      onOpenModal({
        side,
        code: row.code,
        values,
        valueKind: row.valueKind,
      });
    },
    [side, onOpenModal, onPatternPin],
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
          <th className="w-[72px] text-left">Code</th>
          <th className="text-left">Values</th>
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
              <td>{row.code}</td>
              <td>
                {!hasValues ? (
                  <span className="text-content-muted">-</span>
                ) : (
                  <button
                    type="button"
                    className="win-link-value text-left"
                    onClick={() => handleClick(row, row.values)}
                  >
                    {formatPatternValues(row.values)}
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
