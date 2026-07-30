import { memo, useCallback, useMemo, useState } from 'react';
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
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const tableRows = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        values: getPatternValues(patterns, row.field),
      })),
    [rows, patterns],
  );

  const handleRowClick = useCallback(
    (row: PatternRowDef, values: number[]) => {
      setSelectedCode(row.code);
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
          <th className="win-pattern-code-col">Code</th>
          <th className="win-pattern-values-col">Values</th>
        </tr>
      </thead>
      <tbody>
        {tableRows.map((row) => {
          const isPinned =
            activeHighlight?.side === side &&
            activeHighlight.field === row.field &&
            activeHighlight.code === row.code;
          const isSelected = selectedCode === row.code || isPinned;
          const hasValues = row.values.length > 0;

          return (
            <tr
              key={row.code}
              className={`${isSelected ? 'win-pattern-row-selected' : ''} ${hasValues ? 'cursor-pointer' : ''}`}
              onClick={() => handleRowClick(row, row.values)}
              onMouseEnter={() => handleMouseEnter(row, row.values)}
              onMouseLeave={handleMouseLeave}
            >
              <td className="win-pattern-code-col">{row.code}</td>
              <td className="win-pattern-values-col">
                {!hasValues ? (
                  <span className="win-pattern-empty">-</span>
                ) : (
                  <span className="win-link-value">{formatPatternValues(row.values)}</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
});
