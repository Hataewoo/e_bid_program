import type { DatabaseService } from '../database/database-service';
import type { OperationResult } from '../../src/types/electron';
import type { HealthCheckReport } from '../../src/shared/utils/appHealthCheck';
import type { SuiteRunSummary } from '../../src/shared/utils/verificationSuite';
import { AppErrorCode } from '../../src/shared/errors/app-error-codes';
import { runAppHealthCheck } from '../../src/shared/utils/appHealthCheck';
import { runBuiltInRegressionSuite } from '../../src/shared/utils/regressionSuite';
import { runFullVerificationSuite } from '../../src/shared/utils/verificationSuite';
import { mapCodeRow, mapExperimentRow, mapVerificationRow } from './research-ipc-mappers';

async function loadCodes(databaseService: DatabaseService) {
  const rows = await databaseService.getCodeService().getAll();
  return rows.map(mapCodeRow);
}

export async function handleRegressionSuite(
  databaseService: DatabaseService | null,
): Promise<OperationResult<SuiteRunSummary>> {
  if (!databaseService) {
    return { success: false, errors: [AppErrorCode.DB_NOT_INIT] };
  }

  try {
    const codes = await loadCodes(databaseService);
    return { success: true, data: runBuiltInRegressionSuite(codes) };
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : AppErrorCode.IPC_REGRESSION_FAILED],
    };
  }
}

export async function handleFullVerificationSuite(
  databaseService: DatabaseService | null,
): Promise<OperationResult<SuiteRunSummary>> {
  if (!databaseService) {
    return { success: false, errors: [AppErrorCode.DB_NOT_INIT] };
  }

  try {
    const research = databaseService.getResearchService();
    const [codes, verificationRows, experimentRows] = await Promise.all([
      loadCodes(databaseService),
      research.verifications.getAll(),
      research.experiments.getAll(),
    ]);

    const verifications = verificationRows.map(mapVerificationRow);
    const experiments = experimentRows.map(mapExperimentRow);
    const data = runFullVerificationSuite(verifications, experiments, codes);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : AppErrorCode.IPC_VERIFICATION_FAILED],
    };
  }
}

export async function handleHealthCheck(
  databaseService: DatabaseService | null,
): Promise<OperationResult<HealthCheckReport>> {
  if (!databaseService) {
    return { success: false, errors: [AppErrorCode.DB_NOT_INIT] };
  }

  try {
    const codes = await loadCodes(databaseService);
    return { success: true, data: runAppHealthCheck(codes) };
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : AppErrorCode.IPC_HEALTH_CHECK_FAILED],
    };
  }
}
