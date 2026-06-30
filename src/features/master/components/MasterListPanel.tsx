import { useCallback, useRef, useEffect, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, RowClickedEvent, GridReadyEvent } from 'ag-grid-community';
import { AG_GRID_PERF_DEFAULTS } from '@/lib/ag-grid-performance';
import { useI18n } from '@/i18n/use-i18n';
import { useMasterStore } from '../stores/master-store';
import { MASTER_NO_OPTIONS, type MasterGridRow } from '../types/master.types';

export function MasterListPanel() {
  const { t } = useI18n();
  const gridRows = useMasterStore((s) => s.gridRows);
  const selectedMasterNo = useMasterStore((s) => s.selectedMasterNo);
  const searchMasterNo = useMasterStore((s) => s.searchMasterNo);
  const isLoading = useMasterStore((s) => s.isLoading);
  const recordCount = useMasterStore((s) => s.recordCount);
  const selectMaster = useMasterStore((s) => s.selectMaster);
  const setSearchMasterNo = useMasterStore((s) => s.setSearchMasterNo);
  const gridRef = useRef<AgGridReact<MasterGridRow>>(null);

  const displayRows = useMemo(() => {
    if (!searchMasterNo) return gridRows;
    return gridRows.filter((row) => row.masterNo === searchMasterNo);
  }, [gridRows, searchMasterNo]);

  const columnDefs = useMemo<ColDef<MasterGridRow>[]>(
    () => [
      { field: 'index', headerName: t('master.grid.index'), width: 56, sortable: false },
      { field: 'masterNo', headerName: t('master.grid.masterNo'), width: 88, sortable: false },
      { field: 'memo', headerName: t('master.grid.memo'), flex: 1, sortable: false },
    ],
    [t],
  );

  const scrollToMaster = useCallback((masterNo: string) => {
    const api = gridRef.current?.api;
    if (!api) return;

    api.forEachNode((node) => {
      if (node.data?.masterNo === masterNo) {
        node.setSelected(true);
        api.ensureIndexVisible(node.rowIndex ?? 0, 'middle');
      }
    });
  }, []);

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
    scrollToMaster(selectedMasterNo);
  }, [selectedMasterNo, displayRows, scrollToMaster]);

  const onGridReady = useCallback(
    (params: GridReadyEvent<MasterGridRow>) => {
      scrollToMaster(selectedMasterNo);
      params.api.sizeColumnsToFit();
    },
    [selectedMasterNo, scrollToMaster],
  );

  const handleSearchChange = (value: string) => {
    setSearchMasterNo(value);
    if (value) {
      selectMaster(value);
    }
  };

  return (
    <div className="bg-surface-muted/30 flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border bg-surface-muted px-2 py-1.5">
        <span className="win-label shrink-0">{t('master.label.search')}</span>
        <select
          id="masterSearch"
          className="win-combobox flex-1"
          value={searchMasterNo}
          onChange={(e) => handleSearchChange(e.target.value)}
        >
          <option value="">{t('master.filter.all')}</option>
          {MASTER_NO_OPTIONS.map((no) => (
            <option key={no} value={no}>
              {no}
            </option>
          ))}
        </select>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden border-b border-border p-0.5">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-content-muted">
            {t('common.loading')}
          </div>
        ) : (
          <div className="ag-theme-quartz win-ag-grid win-ag-grid-classic h-full w-full">
            <AgGridReact
              ref={gridRef}
              rowData={displayRows}
              columnDefs={columnDefs}
              onRowClicked={onRowClicked}
              getRowClass={getRowClass}
              onGridReady={onGridReady}
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

      <div className="shrink-0 border-t border-border bg-surface-muted px-2 py-1 text-xs text-content">
        {t('common.recordCount', { count: recordCount })}
      </div>
    </div>
  );
}
