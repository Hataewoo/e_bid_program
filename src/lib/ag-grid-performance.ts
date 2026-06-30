import type { GetRowIdParams, GridOptions } from 'ag-grid-community';

/** AG Grid 가상 스크롤·리렌더 비용 절감 기본값 */
export const AG_GRID_PERF_DEFAULTS: Pick<
  GridOptions,
  | 'suppressRowVirtualisation'
  | 'suppressColumnVirtualisation'
  | 'rowBuffer'
  | 'debounceVerticalScrollbar'
  | 'animateRows'
  | 'suppressColumnMoveAnimation'
  | 'suppressAnimationFrame'
  | 'suppressMovableColumns'
  | 'enableCellTextSelection'
> = {
  suppressRowVirtualisation: false,
  suppressColumnVirtualisation: false,
  rowBuffer: 24,
  debounceVerticalScrollbar: true,
  animateRows: false,
  suppressColumnMoveAnimation: true,
  suppressAnimationFrame: false,
  suppressMovableColumns: true,
  enableCellTextSelection: false,
};

/** 대량 rowData에서 React 리렌더 시 행 재사용 */
export function masterNoRowId<T extends { masterNo?: string }>(params: GetRowIdParams<T>): string {
  return params.data?.masterNo ?? `row-${params.level}`;
}

export function numericIdRowId<T extends { id?: number }>(params: GetRowIdParams<T>): string {
  return String(params.data?.id ?? `row-${params.level}`);
}
