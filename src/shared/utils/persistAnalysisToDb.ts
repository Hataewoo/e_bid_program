import { electronService } from '@/services';
import { AppErrorCode } from '@/shared/errors/app-error-codes';
import { formatAppErrors } from '@/i18n/format-app-errors';
import { translate } from '@/i18n/translate';
import { reportSystemError } from '@/services/ipc-guard';
import type { AnalysisResult } from './analysisEngine';
import {
  buildAnalysisHistoryCreatePayload,
  buildMasterStatisticsRecord,
  type AnalysisPersistenceSource,
} from './analysisPersistence';

export type PersistenceChannel = 'history' | 'statistics';

/** Minimum rows written by `recordMasterStatistics` on success (without top_digit). */
const MIN_STATISTICS_ROW_COUNT = 5;

export class AnalysisPersistenceError extends Error {
  readonly failures: PersistenceChannel[];
  readonly codes: string[];

  constructor(failures: PersistenceChannel[], codes: string[]) {
    super(formatAppErrors(codes));
    this.name = 'AnalysisPersistenceError';
    this.failures = failures;
    this.codes = codes;
  }
}

function persistenceDetail(error: AnalysisPersistenceError): string {
  return error.failures
    .map((channel) =>
      channel === 'history'
        ? translate('DB_HISTORY_SAVE_FAILED')
        : translate('DB_STATISTICS_SAVE_FAILED'),
    )
    .join(', ');
}

export function formatPersistenceUserMessage(error: unknown, masterNo: string): string {
  if (error instanceof AnalysisPersistenceError) {
    return translate('analysis.persistence.failed', {
      masterNo,
      detail: persistenceDetail(error),
    });
  }

  const detail =
    error instanceof Error ? formatAppErrors([error.message]) : translate('DB_WRITE_FAILED');

  return translate('analysis.persistence.failed', { masterNo, detail });
}

/** StatusBar + optional feature callback when background DB persistence fails. */
export function notifyPersistenceFailure(
  error: unknown,
  masterNo: string,
  onNotify?: (message: string) => void,
): string {
  const message = formatPersistenceUserMessage(error, masterNo);
  reportSystemError(message);
  onNotify?.(message);
  return message;
}

/**
 * Persist analysis/statistics snapshots to SQLite (non-blocking for callers).
 * Rejects with {@link AnalysisPersistenceError} when a requested channel fails.
 */
export async function persistAnalysisRun(
  result: AnalysisResult,
  source: AnalysisPersistenceSource,
  options?: { skipHistory?: boolean; skipStatistics?: boolean; predictionValue?: string | null },
): Promise<void> {
  if (!electronService.isAvailable()) {
    const failures: PersistenceChannel[] = [];
    if (!options?.skipHistory) failures.push('history');
    if (!options?.skipStatistics) failures.push('statistics');
    if (failures.length === 0) return;
    throw new AnalysisPersistenceError(failures, [AppErrorCode.IPC_UNAVAILABLE]);
  }

  const failures: PersistenceChannel[] = [];
  const codes: string[] = [];

  if (!options?.skipHistory) {
    try {
      const created = await electronService.createAnalysisHistory(
        buildAnalysisHistoryCreatePayload(result, source, options?.predictionValue),
      );
      if (!created) {
        failures.push('history');
        codes.push(AppErrorCode.DB_HISTORY_SAVE_FAILED);
      }
    } catch (error) {
      failures.push('history');
      codes.push(error instanceof Error ? error.message : AppErrorCode.DB_HISTORY_SAVE_FAILED);
    }
  }

  if (!options?.skipStatistics) {
    try {
      const rowCount = await electronService.recordMasterStatistics(
        buildMasterStatisticsRecord(result, source),
      );
      if (rowCount < MIN_STATISTICS_ROW_COUNT) {
        failures.push('statistics');
        codes.push(AppErrorCode.DB_STATISTICS_SAVE_FAILED);
      }
    } catch (error) {
      failures.push('statistics');
      codes.push(error instanceof Error ? error.message : AppErrorCode.DB_STATISTICS_SAVE_FAILED);
    }
  }

  if (failures.length > 0) {
    throw new AnalysisPersistenceError(failures, codes);
  }
}
