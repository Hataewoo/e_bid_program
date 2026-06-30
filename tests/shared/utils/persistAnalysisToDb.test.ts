import { beforeEach, describe, expect, it, vi } from 'vitest';

const createAnalysisHistory = vi.fn();
const recordMasterStatistics = vi.fn();
const isAvailable = vi.fn();

vi.mock('@/services/ipc-guard', () => ({
  reportSystemError: vi.fn(),
}));

vi.mock('@/services', () => ({
  electronService: {
    isAvailable: () => isAvailable(),
    createAnalysisHistory: (...args: unknown[]) => createAnalysisHistory(...args),
    recordMasterStatistics: (...args: unknown[]) => recordMasterStatistics(...args),
  },
}));

import { analyzeMasterValue } from '@/shared/utils/analysisEngine';
import { AnalysisPersistenceError, persistAnalysisRun } from '@/shared/utils/persistAnalysisToDb';
import { AppErrorCode } from '@/shared/errors/app-error-codes';
import { useSettingsStore } from '@/stores/settings-store';

describe('persistAnalysisRun', () => {
  const result = analyzeMasterValue('01', '0011223344');

  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsStore.setState({ language: 'ko' });
    isAvailable.mockReturnValue(true);
    createAnalysisHistory.mockResolvedValue({ id: 1 });
    recordMasterStatistics.mockResolvedValue(5);
  });

  it('resolves when history and statistics persist successfully', async () => {
    await expect(persistAnalysisRun(result, 'analysis')).resolves.toBeUndefined();
    expect(createAnalysisHistory).toHaveBeenCalledOnce();
    expect(recordMasterStatistics).toHaveBeenCalledOnce();
  });

  it('rejects when analysis history returns null', async () => {
    createAnalysisHistory.mockResolvedValue(null);

    await expect(
      persistAnalysisRun(result, 'analysis', { skipStatistics: true }),
    ).rejects.toBeInstanceOf(AnalysisPersistenceError);

    try {
      await persistAnalysisRun(result, 'analysis', { skipStatistics: true });
    } catch (error) {
      expect(error).toBeInstanceOf(AnalysisPersistenceError);
      expect((error as AnalysisPersistenceError).failures).toEqual(['history']);
      expect((error as AnalysisPersistenceError).codes).toContain(
        AppErrorCode.DB_HISTORY_SAVE_FAILED,
      );
    }
  });

  it('rejects when statistics row count is below threshold', async () => {
    recordMasterStatistics.mockResolvedValue(0);

    await expect(
      persistAnalysisRun(result, 'statistics', { skipHistory: true }),
    ).rejects.toBeInstanceOf(AnalysisPersistenceError);

    try {
      await persistAnalysisRun(result, 'statistics', { skipHistory: true });
    } catch (error) {
      expect((error as AnalysisPersistenceError).failures).toEqual(['statistics']);
    }
  });

  it('rejects with IPC_UNAVAILABLE when Electron API is missing', async () => {
    isAvailable.mockReturnValue(false);

    await expect(persistAnalysisRun(result, 'analysis')).rejects.toBeInstanceOf(
      AnalysisPersistenceError,
    );
  });
});
