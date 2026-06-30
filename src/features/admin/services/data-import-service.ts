import { electronService } from '@/services';
import type { BulkUpsertProgress, BulkUpsertResult, MasterInput } from '@/types/electron';
import type { ParsedMasterRow } from '@/shared/utils/dataParser';

export function toMasterInputs(rows: ParsedMasterRow[]): MasterInput[] {
  return rows.map((row) => ({
    masterNo: row.masterNo,
    masterValue: row.masterValue,
    memo: row.memo,
  }));
}

export async function bulkImportMasters(
  rows: ParsedMasterRow[],
  onProgress?: (progress: BulkUpsertProgress) => void,
): Promise<BulkUpsertResult> {
  const unsubscribe = onProgress
    ? electronService.onBulkUpsertProgress(onProgress)
    : () => undefined;
  try {
    return await electronService.bulkUpsertMasters(toMasterInputs(rows));
  } finally {
    unsubscribe();
  }
}
