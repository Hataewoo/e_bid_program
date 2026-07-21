import { useCallback, useMemo, useRef, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, RowClickedEvent, GridReadyEvent } from 'ag-grid-community';
import { AG_GRID_PERF_DEFAULTS, masterNoRowId } from '@/lib/ag-grid-performance';
import { useI18n } from '@/i18n/use-i18n';
import { useMasterStore } from '../stores/master-store';
import type { MasterGridRow } from '../types/master.types';

export function MasterGrid() {
  const { t } = useI18n();
  const gridRows = useMasterStore((s) => s.gridRows);
  const selectedMasterNo = useMasterStore((s) => s.selectedMasterNo);
  const isLoading = useMasterStore((s) => s.isLoading);
  const selectMaster = useMasterStore((s) => s.selectMaster);
  const gridRef = useRef<AgGridReact<MasterGridRow>>(null);

  const columnDefs = useMemo<ColDef<MasterGridRow>[]>(
    () => [
      { field: 'masterNo', headerName: t('master.grid.masterNo'), width: 100, sortable: false },
      { field: 'memo', headerName: t('master.grid.memo'), flex: 1, sortable: false },
    ],
    [t],
  );

  const onRowClicked = useCallback(
    (event: RowClickedEvent<MasterGridRow>) => {
      if (event.data) {
        selectMaster(event.data.masterNo);
      }
    },
    [selectMaster],
  );

  const getRowClass = useCallback(
    (params: { data?: MasterGridRow }) => {
      if (params.data?.masterNo === selectedMasterNo) {
        return 'master-grid-row-selected';
      }
      if (params.data?.hasData) {
        return 'master-grid-row-has-data';
      }
      return '';
    },
    [selectedMasterNo],
  );

  useEffect(() => {
    const api = gridRef.current?.api;
    if (!api) return;

    api.forEachNode((node) => {
      if (node.data?.masterNo === selectedMasterNo) {
        node.setSelected(true);
        api.ensureIndexVisible(node.rowIndex ?? 0, 'middle');
      }
    });
  }, [selectedMasterNo, gridRows]);

  const onGridReady = useCallback(
    (params: GridReadyEvent<MasterGridRow>) => {
      params.api.forEachNode((node) => {
        if (node.data?.masterNo === selectedMasterNo) {
          node.setSelected(true);
        }
      });
    },
    [selectedMasterNo],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="win-panel-header">{t('master.panel.gridTitle')}</div>
      <div className="flex-1 overflow-hidden p-1">
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
              rowSelection={{ mode: 'singleRow', enableClickSelection: true }}
              suppressCellFocus={true}
              headerHeight={28}
              rowHeight={26}
              getRowId={masterNoRowId}
              defaultColDef={{ resizable: true }}
              {...AG_GRID_PERF_DEFAULTS}
            />
          </div>
        )}
      </div>
    </div>
  );
}
