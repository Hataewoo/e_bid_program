import fs from 'fs';
import os from 'os';
import path from 'path';
import { vi } from 'vitest';
import type { DatabaseService } from '../../../electron/database/database-service';
import type { MasterInput } from '../../../electron/database/validation/validation-service';
import type { CodeInput } from '../../../electron/database/code/code-validation-service';
import type { CodeValueInput } from '../../../electron/database/codeValue/code-value-validation-service';
import type {
  CreateAnalysisHistoryInput,
  RecordMasterStatisticsInput,
} from '../../../electron/database/analysis-persistence-types';
import type { AnalysisRunInput } from '../../../src/types/analysis';
import { handleAnalysisRun } from '../../../electron/analysis/analysis-run-handler';
import {
  handleHealthCheck,
  handleRegressionSuite,
} from '../../../electron/analysis/analysis-suite-handler';
import { AppErrorCode } from '../../../src/shared/errors/app-error-codes';

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: (name: string) => {
      if (name === 'userData') return os.tmpdir();
      if (name === 'exe') return process.execPath;
      return os.tmpdir();
    },
    getAppPath: () => process.cwd(),
  },
}));

export interface TestDatabaseHandle {
  service: DatabaseService;
  dbPath: string;
  cleanup: () => Promise<void>;
}

export async function createTestDatabase(options?: {
  seed?: boolean;
}): Promise<TestDatabaseHandle> {
  const { DatabaseService } = await import('../../../electron/database/database-service');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'csebid-integration-'));
  const dbPath = path.join(tmpDir, 'test.db');
  const service = new DatabaseService();

  await service.initializeAtPath(dbPath, { seed: options?.seed ?? false });

  return {
    service,
    dbPath,
    cleanup: async () => {
      await service.disconnect();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    },
  };
}

/** IPC-equivalent calls used in `electron/main.ts` handlers. */
export const ipc = {
  masterGetAll: (db: DatabaseService) => db.getMasterService().getAll(),
  masterGetByNo: (db: DatabaseService, masterNo: string) =>
    db.getMasterService().getByMasterNo(masterNo),
  masterSave: (db: DatabaseService, input: MasterInput & { id?: number | null }) =>
    db.getMasterService().save(input),
  masterDelete: (db: DatabaseService, masterNo: string) => db.getMasterService().delete(masterNo),
  masterValidateData: (db: DatabaseService, input: MasterInput) =>
    db.getMasterService().validateData(input),
  codeGetAll: (db: DatabaseService) => db.getCodeService().getAll(),
  codeSave: (db: DatabaseService, input: CodeInput & { id?: number | null }) =>
    db.getCodeService().save(input),
  codeDelete: (db: DatabaseService, id: number) => db.getCodeService().delete(id),
  codeValueSave: (db: DatabaseService, input: CodeValueInput & { id?: number | null }) =>
    db.getCodeValueService().save(input),
  dbGetStatus: (db: DatabaseService) => db.getStatus(),
  dbCreateAnalysisHistory: (db: DatabaseService, input: CreateAnalysisHistoryInput) =>
    db.createAnalysisHistory(input),
  dbRecordMasterStatistics: (db: DatabaseService, input: RecordMasterStatisticsInput) =>
    db.recordMasterStatistics(input),
  dbClearAnalysisHistories: (db: DatabaseService) => db.clearAnalysisHistories(),
  dbClearStatistics: (db: DatabaseService) => db.clearStatistics(),
  dbGetAnalysisHistories: (db: DatabaseService) => db.getAnalysisHistories(),
  dbGetStatistics: (db: DatabaseService) => db.getStatistics(),
  analysisRun: (db: DatabaseService, input: AnalysisRunInput) => handleAnalysisRun(db, input),
  analysisRegressionSuite: (db: DatabaseService) => handleRegressionSuite(db),
  analysisHealthCheck: (db: DatabaseService) => handleHealthCheck(db),
  researchSaveExperiment: (
    db: DatabaseService,
    input: { name: string; description?: string; status?: string },
  ) =>
    db.getResearchService().experiments.save({
      name: input.name,
      description: input.description ?? '',
      status: input.status ?? 'Draft',
    }),
  researchGetExperiment: (db: DatabaseService, id: number) =>
    db.getResearchService().experiments.getById(id),
  AppErrorCode,
};
