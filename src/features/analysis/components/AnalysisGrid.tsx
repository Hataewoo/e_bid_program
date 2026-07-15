import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, RowClickedEvent, GridReadyEvent } from 'ag-grid-community';
import type { Master } from '@/types/electron';
import { AG_GRID_PERF_DEFAULTS } from '@/lib/ag-grid-performance';
import { useI18n } from '@/i18n/use-i18n';
import { useAnalysisStore } from '../stores/analysis-store';
import { masterDescription } from '../types/analysis.types';

export function AnalysisGrid() {
  const { t } = useI18n();
  const filteredMasters = useAnalysisStore((s) => s.filteredMasters);
  const selectedMaster = useAnalysisStore((s) => s.selectedMaster);
  const searchQuery = useAnalysisStore((s) => s.searchQuery);
  const loading = useAnalysisStore((s) => s.loading);
  const setSearchQuery = useAnalysisStore((s) => s.setSearchQuery);
  const selectMaster = useAnalysisStore((s) => s.selectMaster);
  const gridRef = useRef<AgGridReact<Master>>(null);

  const columnDefs = useMemo<ColDef<Master>[]>(
    () => [
      { field: 'masterNo', headerName: 'Master No', width: 100, sortable: true },
      {
        headerName: t('analysis.grid.col.description'),
        flex: 1,
        sortable: true,
        valueGetter: (p) => (p.data ? masterDescription(p.data) : ''),
      },
    ],
    [t],
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({ resizable: true, sortable: false, filter: false }),
    [],
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
    [selectedMaster?.masterNo],
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
      <div className="win-panel-header">{t('analysis.grid.title')}</div>
      <div className="border-b border-border px-2 py-1.5">
        <input
          type="text"
          className="win-input w-full text-sm"
          placeholder={t('analysis.grid.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
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
              defaultColDef={defaultColDef}
              onRowClicked={onRowClicked}
              getRowClass={getRowClass}
              onGridReady={onGridReady}
              rowSelection={{ mode: 'singleRow', enableClickSelection: true }}
              suppressCellFocus={true}
              headerHeight={32}
              rowHeight={30}
              {...AG_GRID_PERF_DEFAULTS}
            />
          </div>
        )}
      </div>
    </div>
  );
}
