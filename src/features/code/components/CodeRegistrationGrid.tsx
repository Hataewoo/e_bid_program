import { useCallback, useRef, useEffect, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, RowClickedEvent, GridReadyEvent } from 'ag-grid-community';
import { AG_GRID_PERF_DEFAULTS } from '@/lib/ag-grid-performance';
import { useI18n } from '@/i18n/use-i18n';
import { useCodeStore } from '../stores/code-store';
import type { CodeGridRow } from '../types/code.types';

export function CodeRegistrationGrid() {
  const { t } = useI18n();
  const gridRows = useCodeStore((s) => s.gridRows);
  const selectedId = useCodeStore((s) => s.selectedId);
  const isLoading = useCodeStore((s) => s.isLoading);
  const selectCode = useCodeStore((s) => s.selectCode);
  const gridRef = useRef<AgGridReact<CodeGridRow>>(null);

  const columnDefs = useMemo<ColDef<CodeGridRow>[]>(
    () => [
      { field: 'index', headerName: t('code.grid.index'), width: 56, sortable: false },
      { field: 'code', headerName: t('code.grid.code'), width: 88, sortable: false },
      { field: 'type', headerName: t('code.grid.type'), width: 72, sortable: false },
      { field: 'description', headerName: t('code.grid.description'), flex: 1, sortable: false },
    ],
    [t],
  );

  const scrollToSelected = useCallback((id: number | null) => {
    const api = gridRef.current?.api;
    if (!api || id === null) return;

    api.forEachNode((node) => {
      if (node.data?.id === id) {
        node.setSelected(true);
        api.ensureIndexVisible(node.rowIndex ?? 0, 'middle');
      }
    });
  }, []);

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
        return 'code-grid-row-selected';
      }
      return '';
    },
    [selectedId],
  );

  useEffect(() => {
    scrollToSelected(selectedId);
  }, [selectedId, gridRows, scrollToSelected]);

  const onGridReady = useCallback(
    (params: GridReadyEvent<CodeGridRow>) => {
      scrollToSelected(selectedId);
      params.api.sizeColumnsToFit();
    },
    [selectedId, scrollToSelected],
  );

  const onFirstDataRendered = useCallback((params: { api: { sizeColumnsToFit: () => void } }) => {
    params.api.sizeColumnsToFit();
  }, []);

  return (
    <div className="min-h-0 flex-1 overflow-hidden bg-[#f0f0f0] p-0.5">
      {isLoading ? (
        <div className="flex h-full items-center justify-center text-sm text-content-muted">
          {t('common.loading')}
        </div>
      ) : (
        <div className="ag-theme-quartz win-ag-grid win-ag-grid-classic h-full w-full">
          <AgGridReact
            ref={gridRef}
            rowData={gridRows}
            columnDefs={columnDefs}
            onRowClicked={onRowClicked}
            getRowClass={getRowClass}
            onGridReady={onGridReady}
            onFirstDataRendered={onFirstDataRendered}
            rowSelection={{ mode: 'singleRow', enableClickSelection: true }}
            suppressCellFocus={true}
            headerHeight={28}
            rowHeight={26}
            defaultColDef={{ resizable: true }}
            {...AG_GRID_PERF_DEFAULTS}
          />
        </div>
      )}
    </div>
  );
}
