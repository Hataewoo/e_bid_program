import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, RowClickedEvent, GridReadyEvent } from 'ag-grid-community';
import { AG_GRID_PERF_DEFAULTS, masterNoRowId } from '@/lib/ag-grid-performance';
import type { Master } from '@/types/electron';
import { useI18n } from '@/i18n/use-i18n';
import { useStatisticsStore } from '../stores/statistics-store';
import { masterName } from '../types/statistics.types';

export function StatisticsMasterGrid() {
  const { t } = useI18n();
  const filteredMasters = useStatisticsStore((s) => s.filteredMasters);
  const selectedMaster = useStatisticsStore((s) => s.selectedMaster);
  const loading = useStatisticsStore((s) => s.loading);
  const selectMaster = useStatisticsStore((s) => s.selectMaster);
  const gridRef = useRef<AgGridReact<Master>>(null);

  const columnDefs = useMemo<ColDef<Master>[]>(
    () => [
      { field: 'masterNo', headerName: t('statistics.grid.masterNo'), width: 100, sortable: true },
      {
        headerName: t('statistics.grid.name'),
        flex: 1,
        sortable: true,
        valueGetter: (p) => (p.data ? masterName(p.data) : ''),
      },
    ],
    [t],
  );

  const onRowClicked = useCallback(
    (event: RowClickedEvent<Master>) => {
      if (event.data) selectMaster(event.data);
    },
    [selectMaster],
  );

  const getRowClass = useCallback(
    (params: { data?: Master }) =>
      params.data?.masterNo === selectedMaster?.masterNo ? 'master-grid-row-selected' : '',
    [selectedMaster],
  );

  useEffect(() => {
    const api = gridRef.current?.api;
    if (!api || !selectedMaster) return;
    api.forEachNode((node) => {
      if (node.data?.masterNo === selectedMaster.masterNo) {
        node.setSelected(true);
        api.ensureIndexVisible(node.rowIndex ?? 0, 'middle');
      }
    });
  }, [selectedMaster, filteredMasters]);

  const onGridReady = useCallback(
    (params: GridReadyEvent<Master>) => {
      if (!selectedMaster) return;
      params.api.forEachNode((node) => {
        if (node.data?.masterNo === selectedMaster.masterNo) {
          node.setSelected(true);
        }
      });
    },
    [selectedMaster],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="win-panel-header">{t('statistics.masterSelector')}</div>
      <div className="min-h-0 flex-1 overflow-hidden p-1">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-content-muted">
            {t('common.loading')}
          </div>
        ) : (
          <div className="ag-theme-quartz win-ag-grid h-full w-full">
            <AgGridReact
              ref={gridRef}
              rowData={filteredMasters}
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
