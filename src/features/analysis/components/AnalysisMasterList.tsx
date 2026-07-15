import { useCallback, useMemo, useRef, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, RowClickedEvent } from 'ag-grid-community';
import { AG_GRID_PERF_DEFAULTS, masterNoRowId } from '@/lib/ag-grid-performance';
import { useI18n } from '@/i18n/use-i18n';
import { useAnalysisStore } from '../stores/analysis-store';

interface MasterSlotRow {
  masterNo: string;
  hasData: boolean;
}

export function AnalysisMasterList() {
  const { t } = useI18n();
  const selectedMasterNo = useAnalysisStore((s) => s.selectedMasterNo);
  const masterSlotRows = useAnalysisStore((s) => s.masterSlotRows);
  const analyzing = useAnalysisStore((s) => s.analyzing);
  const analyzeMaster = useAnalysisStore((s) => s.analyzeMaster);
  const gridRef = useRef<AgGridReact<MasterSlotRow>>(null);

  const columnDefs = useMemo<ColDef<MasterSlotRow>[]>(
    () => [
      { field: 'masterNo', headerName: t('analysis.masterList.title'), flex: 1, sortable: false },
    ],
    [t],
  );

  const onRowClicked = useCallback(
    (event: RowClickedEvent<MasterSlotRow>) => {
      if (event.data) void analyzeMaster(event.data.masterNo);
    },
    [analyzeMaster],
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
    <div className="flex h-full min-h-full flex-col bg-[#ece9d8]">
      <div className="win-panel-header shrink-0">{t('analysis.masterList.title')}</div>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {analyzing && (
          <div className="absolute z-10 bg-black/5 px-2 text-sm text-content-muted">
            {t('analysis.masterList.analyzing')}
          </div>
        )}
        <div className="ag-theme-quartz win-ag-grid win-ag-grid-classic h-full w-full">
          <AgGridReact
            ref={gridRef}
            rowData={masterSlotRows}
            columnDefs={columnDefs}
            onRowClicked={onRowClicked}
            getRowClass={getRowClass}
            getRowId={masterNoRowId}
            rowSelection={{ mode: 'singleRow', enableClickSelection: true }}
            suppressCellFocus={true}
            headerHeight={32}
            rowHeight={30}
            {...AG_GRID_PERF_DEFAULTS}
          />
        </div>
      </div>
    </div>
  );
}
