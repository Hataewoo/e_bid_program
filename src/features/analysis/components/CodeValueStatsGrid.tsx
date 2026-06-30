import { memo, useCallback, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ValueFormatterParams } from 'ag-grid-community';
import type { CodeValueStatRow } from '@/shared/utils/analysisEngine';
import { AG_GRID_PERF_DEFAULTS } from '@/lib/ag-grid-performance';
import { useI18n } from '@/i18n/use-i18n';
import { isCodeValueLegacyVerified } from '@/shared/utils/algorithmVerificationStatus';

interface CodeValueStatsGridProps {
  rows: CodeValueStatRow[];
  loading?: boolean;
}

function formatPercent(params: ValueFormatterParams<CodeValueStatRow>) {
  const value = params.value as number;
  return `${value.toFixed(1)}%`;
}

export const CodeValueStatsGrid = memo(function CodeValueStatsGrid({
  rows,
  loading = false,
}: CodeValueStatsGridProps) {
  const { t } = useI18n();
  const legacyVerified = isCodeValueLegacyVerified();
  const columnDefs = useMemo<ColDef<CodeValueStatRow>[]>(
    () => [
      { field: 'seq', headerName: t('code.grid.index'), width: 48, sortable: false },
      { field: 'code', headerName: t('code.grid.code'), width: 68, sortable: true },
      { field: 'type', headerName: t('code.grid.type'), width: 52, sortable: true },
      {
        field: 'count',
        headerName: t('analysis.codeValue.col.count'),
        width: 76,
        sortable: true,
        type: 'numericColumn',
      },
      {
        field: 'percent',
        headerName: t('analysis.codeValue.col.percent'),
        width: 64,
        sortable: true,
        valueFormatter: formatPercent,
      },
      {
        field: 'description',
        headerName: t('analysis.codeValue.col.descriptionPattern'),
        flex: 1,
        minWidth: 120,
        sortable: false,
      },
    ],
    [t],
  );

  const getRowClass = useCallback((params: { data?: CodeValueStatRow }) => {
    if (params.data?.isTop) return 'code-value-row-top';
    return '';
  }, []);

  const getRowId = useCallback(
    (params: { data?: CodeValueStatRow }) => `code-stat-${params.data?.seq ?? 0}`,
    [],
  );

  return (
    <div className="win-code-value-panel flex h-full min-h-0 flex-col border-t border-[#404040] bg-[#f0f0f0]">
      <div className="win-point-values-header shrink-0 font-semibold text-[#0000ff]">
        {t('analysis.codeValue.title')}
        {!legacyVerified ? (
          <span className="ml-2 text-[10px] font-normal text-[#b8860b]">
            ({t('algorithm.codeValue.gridNote')})
          </span>
        ) : null}
      </div>
      <div className="min-h-[120px] flex-1 overflow-hidden p-px">
        {loading ? (
          <div className="flex h-full items-center justify-center text-[11px] text-content-muted">
            {t('analysis.codeValue.computing')}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[11px] text-content-muted">
            {t('analysis.codeValue.noRules')}
          </div>
        ) : (
          <div className="ag-theme-quartz win-ag-grid win-ag-grid-classic h-full w-full">
            <AgGridReact
              rowData={rows}
              columnDefs={columnDefs}
              getRowClass={getRowClass}
              getRowId={getRowId}
              suppressCellFocus={true}
              headerHeight={18}
              rowHeight={16}
              defaultColDef={{ resizable: true, sortable: false }}
              {...AG_GRID_PERF_DEFAULTS}
            />
          </div>
        )}
      </div>
    </div>
  );
});
