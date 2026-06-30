import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, RowClickedEvent } from 'ag-grid-community';
import { AG_GRID_PERF_DEFAULTS, masterNoRowId } from '@/lib/ag-grid-performance';
import { useI18n } from '@/i18n/use-i18n';
import { useCodeValueAnalysisStore } from '../stores/code-value-analysis-store';

interface MasterSlotRow {
  masterNo: string;
  hasData: boolean;
}

export function CodeValueMasterList() {
  const { t } = useI18n();
  const selectedMasterNo = useCodeValueAnalysisStore((s) => s.selectedMasterNo);
  const masterSlotRows = useCodeValueAnalysisStore((s) => s.masterSlotRows);
  const loading = useCodeValueAnalysisStore((s) => s.loading);
  const selectMaster = useCodeValueAnalysisStore((s) => s.selectMaster);
  const gridRef = useRef<AgGridReact<MasterSlotRow>>(null);

  const columnDefs = useMemo<ColDef<MasterSlotRow>[]>(
    () => [{ field: 'masterNo', headerName: t('codeValue.grid.master'), flex: 1, sortable: false }],
    [t],
  );

  const onRowClicked = useCallback(
    (event: RowClickedEvent<MasterSlotRow>) => {
      if (event.data) void selectMaster(event.data.masterNo);
    },
    [selectMaster],
  );

  const getRowClass = useCallback(
    (params: { data?: MasterSlotRow }) =>
      params.data?.masterNo === selectedMasterNo ? 'master-grid-row-selected' : '',
    [selectedMasterNo],
  );

  useEffect(() => {
    const api = gridRef.current?.api;
    if (!api || !selectedMasterNo) return;
    api.forEachNode((node) => {
      if (node.data?.masterNo === selectedMasterNo) {
        node.setSelected(true);
        api.ensureIndexVisible(node.rowIndex ?? 0, 'middle');
      }
    });
  }, [selectedMasterNo, masterSlotRows]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#ece9d8]">
      <div className="win-panel-header shrink-0">{t('codeValue.grid.master')}</div>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {loading ? (
          <div className="absolute z-10 bg-black/5 px-1 text-[10px] text-content-muted">
            {t('codeValue.grid.analyzing')}
          </div>
        ) : null}
        <div className="ag-theme-quartz win-ag-grid win-ag-grid-classic h-full w-full">
          <AgGridReact
            ref={gridRef}
            rowData={masterSlotRows}
            columnDefs={columnDefs}
            onRowClicked={onRowClicked}
            getRowClass={getRowClass}
            getRowId={masterNoRowId}
            {...AG_GRID_PERF_DEFAULTS}
          />
        </div>
      </div>
    </div>
  );
}
