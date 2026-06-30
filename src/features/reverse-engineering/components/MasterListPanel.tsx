import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, RowClickedEvent, GridReadyEvent } from 'ag-grid-community';
import { AG_GRID_PERF_DEFAULTS, masterNoRowId } from '@/lib/ag-grid-performance';
import { useI18n } from '@/i18n/use-i18n';
import { useReverseEngineeringStore } from '../stores/re-store';
import type { MasterListItem } from '../types/analysis.types';

export function MasterListPanel() {
  const { t } = useI18n();
  const masterList = useReverseEngineeringStore((s) => s.masterList);
  const selectedMasterNo = useReverseEngineeringStore((s) => s.selectedMasterNo);
  const isLoading = useReverseEngineeringStore((s) => s.isLoading);
  const selectMaster = useReverseEngineeringStore((s) => s.selectMaster);
  const gridRef = useRef<AgGridReact<MasterListItem>>(null);

  const columnDefs = useMemo<ColDef<MasterListItem>[]>(
    () => [
      { field: 'masterNo', headerName: t('re.grid.no'), width: 70, sortable: false },
      {
        field: 'hasData',
        headerName: t('re.grid.data'),
        width: 60,
        sortable: false,
        valueFormatter: (p) => (p.value ? 'Y' : '-'),
      },
      { field: 'valueLength', headerName: t('re.grid.len'), width: 60, sortable: false },
    ],
    [t],
  );

  const onRowClicked = useCallback(
    (event: RowClickedEvent<MasterListItem>) => {
      if (event.data) selectMaster(event.data.masterNo);
    },
    [selectMaster],
  );

  const getRowClass = useCallback(
    (params: { data?: MasterListItem }) =>
      params.data?.masterNo === selectedMasterNo ? 'master-grid-row-selected' : '',
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
  }, [selectedMasterNo, masterList]);

  const onGridReady = useCallback(
    (params: GridReadyEvent<MasterListItem>) => {
      params.api.forEachNode((node) => {
        if (node.data?.masterNo === selectedMasterNo) node.setSelected(true);
      });
    },
    [selectedMasterNo],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="win-panel-header">{t('re.masterList.title')}</div>
      <div className="flex-1 overflow-hidden p-1">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-content-muted">
            {t('common.loading')}
          </div>
        ) : (
          <div className="ag-theme-quartz win-ag-grid h-full w-full">
            <AgGridReact
              ref={gridRef}
              rowData={masterList}
              columnDefs={columnDefs}
              onRowClicked={onRowClicked}
              getRowClass={getRowClass}
              onGridReady={onGridReady}
              rowSelection={{ mode: 'singleRow', enableClickSelection: true }}
              suppressCellFocus={true}
              headerHeight={28}
              getRowId={masterNoRowId}
              rowHeight={26}
              {...AG_GRID_PERF_DEFAULTS}
            />
          </div>
        )}
      </div>
    </div>
  );
}
