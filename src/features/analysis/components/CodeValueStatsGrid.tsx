import { memo, useCallback, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ValueFormatterParams } from 'ag-grid-community';
import type { CodeValueStatRow } from '@/shared/utils/analysisEngine';
import { AG_GRID_PERF_DEFAULTS } from '@/lib/ag-grid-performance';
import { useI18n } from '@/i18n/use-i18n';
import {
  isCodeValueLegacyVerified,
  shouldShowLegacyUnverifiedUi,
} from '@/shared/utils/algorithmVerificationStatus';

interface CodeValueStatsGridProps {
  rows: CodeValueStatRow[];
  loading?: boolean;
  /** embedded: 분할 패널 내부 / page: 페이지 스크롤용 전체 높이 표시 */
  layout?: 'embedded' | 'page';
}

function formatPercent(params: ValueFormatterParams<CodeValueStatRow>) {
  const value = params.value as number;
  return `${value.toFixed(1)}%`;
}

export const CodeValueStatsGrid = memo(function CodeValueStatsGrid({
  rows,
  loading = false,
  layout = 'embedded',
}: CodeValueStatsGridProps) {
  const { t } = useI18n();
  const legacyVerified =
    !shouldShowLegacyUnverifiedUi() || isCodeValueLegacyVerified();
  const columnDefs = useMemo<ColDef<CodeValueStatRow>[]>(
    () => [
      { field: 'seq', headerName: t('code.grid.index'), width: 56, sortable: false },
      { field: 'code', headerName: t('code.grid.code'), width: 80, sortable: true },
      { field: 'type', headerName: t('code.grid.type'), width: 64, sortable: true },
      {
        field: 'count',
        headerName: t('analysis.codeValue.col.count'),
        width: 88,
        sortable: true,
        type: 'numericColumn',
      },
      {
        field: 'percent',
        headerName: t('analysis.codeValue.col.percent'),
        width: 76,
        sortable: true,
        valueFormatter: formatPercent,
      },
      {
        field: 'description',
        headerName: t('analysis.codeValue.col.descriptionPattern'),
        flex: 1,
        minWidth: 160,
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

  const isPageLayout = layout === 'page';

  return (
    <div
      className={`win-code-value-panel flex flex-col border-t border-[#404040] bg-[#f0f0f0] ${
        isPageLayout ? 'w-full' : 'h-full min-h-0'
      }`}
    >
      <div className="win-point-values-header shrink-0 font-semibold text-[#0000ff]">
        {t('analysis.codeValue.title')}
        {!legacyVerified ? (
          <span className="ml-2 text-xs font-normal text-[#b8860b]">
            ({t('algorithm.codeValue.gridNote')})
          </span>
        ) : null}
      </div>
      <div className={`p-px ${isPageLayout ? 'min-h-[280px]' : 'min-h-[140px] flex-1 overflow-hidden'}`}>
        {loading ? (
          <div className="flex min-h-[200px] items-center justify-center text-sm text-content-muted">
            {t('analysis.codeValue.computing')}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex min-h-[200px] items-center justify-center text-sm text-content-muted">
            {t('analysis.codeValue.noRules')}
          </div>
        ) : (
          <div
            className={`ag-theme-quartz win-ag-grid win-ag-grid-classic w-full ${
              isPageLayout ? '' : 'h-full'
            }`}
          >
            <AgGridReact
              rowData={rows}
              columnDefs={columnDefs}
              getRowClass={getRowClass}
              getRowId={getRowId}
              suppressCellFocus={true}
              headerHeight={30}
              rowHeight={26}
              domLayout={isPageLayout ? 'autoHeight' : 'normal'}
              defaultColDef={{ resizable: true, sortable: false }}
              {...AG_GRID_PERF_DEFAULTS}
            />
          </div>
        )}
      </div>
    </div>
  );
});
