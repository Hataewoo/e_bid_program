import { electronService } from '@/services';
import type { AnalysisHistory, Statistics as DbStatistics } from '@/types/electron';

export class StatisticsHistoryRepository {
  async findAnalysisHistories(): Promise<AnalysisHistory[]> {
    return electronService.getAnalysisHistories();
  }

  async findStatisticsRows(): Promise<DbStatistics[]> {
    return electronService.getStatistics();
  }

  async clearAnalysisHistories(): Promise<number> {
    return electronService.clearAnalysisHistories();
  }

  async clearStatistics(): Promise<number> {
    return electronService.clearStatistics();
  }
}

export const statisticsHistoryRepository = new StatisticsHistoryRepository();
