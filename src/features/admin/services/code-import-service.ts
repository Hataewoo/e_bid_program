import { electronService } from '@/services';
import type { BulkUpsertProgress, BulkUpsertResult, CodeInput } from '@/types/electron';
import type { ParsedCodeRow } from '@/shared/utils/codeParser';

export function toCodeInputs(rows: ParsedCodeRow[]): CodeInput[] {
  return rows.map((row) => ({
    code: row.code,
    type: row.type,
    description: row.description,
  }));
}

export async function bulkImportCodes(
  rows: ParsedCodeRow[],
  onProgress?: (progress: BulkUpsertProgress) => void,
): Promise<BulkUpsertResult> {
  const unsubscribe = onProgress
    ? electronService.onCodeBulkUpsertProgress(onProgress)
    : () => undefined;
  try {
    return await electronService.bulkUpsertCodes(toCodeInputs(rows));
  } finally {
    unsubscribe();
  }
}
