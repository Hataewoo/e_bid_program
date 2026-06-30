import type { DatabaseService } from '../database/database-service';
import type { AnalysisRunInput } from '../../src/types/analysis';
import type { OperationResult } from '../../src/types/electron';
import type { AnalysisRunOutput } from '../../src/types/analysis';
import { AppErrorCode } from '../../src/shared/errors/app-error-codes';
import {
  resolveAnalysisContext,
  runAnalysisPipeline,
} from '../../src/shared/services/analysisRunService';
import { mapCodeRow } from './research-ipc-mappers';

function mapMaster(row: {
  id: number;
  masterNo: string;
  masterValue: string;
  memo: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    masterNo: row.masterNo,
    masterValue: row.masterValue,
    memo: row.memo,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function handleAnalysisRun(
  databaseService: DatabaseService | null,
  input: AnalysisRunInput,
): Promise<OperationResult<AnalysisRunOutput>> {
  if (!databaseService) {
    return { success: false, errors: [AppErrorCode.DB_NOT_INIT] };
  }

  const masterNo = input.masterNo.padStart(2, '0');

  try {
    const [masterRow, codeRows] = await Promise.all([
      databaseService.getMasterService().getByMasterNo(masterNo),
      databaseService.getCodeService().getAll(),
    ]);

    const master = masterRow ? mapMaster(masterRow) : null;
    const codes = codeRows.map(mapCodeRow);
    const context = resolveAnalysisContext(input, master, codes);
    const data = runAnalysisPipeline(context);

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : AppErrorCode.IPC_ANALYSIS_FAILED],
    };
  }
}
