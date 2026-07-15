import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type {
  ColDef,
  RowClickedEvent,
  GridReadyEvent,
  ValueFormatterParams,
} from 'ag-grid-community';
import type { CodeValue } from '@/types/electron';
import { AG_GRID_PERF_DEFAULTS, numericIdRowId } from '@/lib/ag-grid-performance';
import { useI18n } from '@/i18n/use-i18n';
import { useCodeValueStore } from '../stores/code-value-store';

function formatDate(params: ValueFormatterParams<CodeValue>) {
  if (!params.value) return '';
  return new Date(params.value as string).toLocaleString('ko-KR');
}

export function CodeValueGrid() {
  const { t } = useI18n();
  const filteredItems = useCodeValueStore((s) => s.filteredItems);
  const selectedId = useCodeValueStore((s) => s.selectedId);
  const isLoading = useCodeValueStore((s) => s.isLoading);
  const selectItem = useCodeValueStore((s) => s.selectItem);
  const gridRef = useRef<AgGridReact<CodeValue>>(null);

  const columnDefs = useMemo<ColDef<CodeValue>[]>(
    () => [
      { field: 'id', headerName: 'ID', width: 70, sortable: true },
      { field: 'code', headerName: 'Code', width: 100, sortable: true },
      { field: 'value', headerName: 'Value', width: 140, sortable: true },
      { field: 'description', headerName: 'Description', flex: 1, sortable: true },
      {
        field: 'createdAt',
        headerName: 'CreatedAt',
        width: 160,
        sortable: true,
        valueFormatter: formatDate,
      },
    ],
    [],
  );

  const onRowClicked = useCallback(
    (event: RowClickedEvent<CodeValue>) => {
      if (event.data) {
        selectItem(event.data.id);
      }
    },
    [selectItem],
  );

  const getRowClass = useCallback(
    (params: { data?: CodeValue }) => {
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
  }, [selectedId, filteredItems]);

  const onGridReady = useCallback(
    (params: GridReadyEvent<CodeValue>) => {
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
      <div className="win-panel-header">{t('codeValue.mgmt.listTitle')}</div>
      <div className="flex-1 overflow-hidden p-1">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-content-muted">
            {t('common.loading')}
          </div>
        ) : (
          <div className="ag-theme-quartz win-ag-grid h-full w-full">
            <AgGridReact
              ref={gridRef}
              rowData={filteredItems}
              columnDefs={columnDefs}
              onRowClicked={onRowClicked}
              getRowClass={getRowClass}
              onGridReady={onGridReady}
              rowSelection={{ mode: 'singleRow', enableClickSelection: true }}
              suppressCellFocus={true}
              headerHeight={32}
              rowHeight={30}
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
