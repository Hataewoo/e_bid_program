import { useCallback, useMemo, useRef, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, RowClickedEvent, GridReadyEvent } from 'ag-grid-community';
import { AG_GRID_PERF_DEFAULTS, numericIdRowId } from '@/lib/ag-grid-performance';
import { useI18n } from '@/i18n/use-i18n';
import type { CodeGridRow } from '../types/code.types';
import { useCodeStore } from '../stores/code-store';

export function CodeGrid() {
  const { t } = useI18n();
  const gridRows = useCodeStore((s) => s.gridRows);
  const selectedId = useCodeStore((s) => s.selectedId);
  const isLoading = useCodeStore((s) => s.isLoading);
  const selectCode = useCodeStore((s) => s.selectCode);
  const gridRef = useRef<AgGridReact<CodeGridRow>>(null);

  const columnDefs = useMemo<ColDef<CodeGridRow>[]>(
    () => [
      { field: 'code', headerName: t('code.grid.code'), width: 120, sortable: true },
      { field: 'type', headerName: t('code.grid.type'), width: 120, sortable: true },
      { field: 'description', headerName: t('code.grid.description'), flex: 1, sortable: true },
    ],
    [t],
  );

  const onRowClicked = useCallback(
    (event: RowClickedEvent<CodeGridRow>) => {
      if (event.data) {
        selectCode(event.data.id);
      }
    },
    [selectCode],
  );

  const getRowClass = useCallback(
    (params: { data?: CodeGridRow }) => {
      if (params.data?.id === selectedId) {
        return 'master-grid-row-selected';
      }
      return '';
    },
    [selectedId],
  );

  useEffect(() => {
    const api = gridRef.current?.api;
    if (!api) return;

    api.forEachNode((node) => {
      if (node.data?.id === selectedId) {
        node.setSelected(true);
        api.ensureIndexVisible(node.rowIndex ?? 0, 'middle');
      }
    });
  }, [selectedId, gridRows]);

  const onGridReady = useCallback(
    (params: GridReadyEvent<CodeGridRow>) => {
      params.api.forEachNode((node) => {
        if (node.data?.id === selectedId) {
          node.setSelected(true);
        }
      });
    },
    [selectedId],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="win-panel-header">{t('code.listTitle')}</div>
      <div className="flex-1 overflow-hidden p-1">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-content-muted">
            {t('common.loading')}
          </div>
        ) : (
          <div className="ag-theme-quartz win-ag-grid h-full w-full">
            <AgGridReact
              ref={gridRef}
              rowData={gridRows}
              columnDefs={columnDefs}
              onRowClicked={onRowClicked}
              getRowClass={getRowClass}
              onGridReady={onGridReady}
              rowSelection={{ mode: 'singleRow', enableClickSelection: true }}
              suppressCellFocus={true}
              headerHeight={28}
              rowHeight={26}
              getRowId={numericIdRowId}
              defaultColDef={{ resizable: true }}
              {...AG_GRID_PERF_DEFAULTS}
            />
          </div>
        )}
      </div>
    </div>
  );
}
