import type { PrismaClient } from '@prisma/client';
import type {
  CreateAnalysisHistoryInput,
  RecordMasterStatisticsInput,
} from './analysis-persistence-types';

export class AnalysisPersistenceService {
  constructor(private readonly prisma: PrismaClient) {}

  async createAnalysisHistory(input: CreateAnalysisHistoryInput) {
    return this.prisma.analysisHistory.create({
      data: {
        title: input.title,
        bidNumber: input.bidNumber ?? null,
        status: input.status,
        result: input.result ?? null,
      },
    });
  }

  async recordMasterStatistics(input: RecordMasterStatisticsInput) {
    const period = input.masterNo;
    const rows = [
      {
        category: 'summary',
        label: 'total_digits',
        value: input.totalCount,
        unit: 'count',
        period,
      },
      {
        category: 'low_high',
        label: 'low_rate',
        value: input.lowRate,
        unit: '%',
        period,
      },
      {
        category: 'low_high',
        label: 'high_rate',
        value: input.highRate,
        unit: '%',
        period,
      },
      {
        category: 'run_count',
        label: 'total_runs',
        value: input.runCount,
        unit: 'count',
        period,
      },
      {
        category: 'run_count',
        label: 'max_run',
        value: input.maxRun,
        unit: 'count',
        period,
      },
    ];

    if (input.topDigit !== null) {
      rows.push({
        category: 'frequency',
        label: 'top_digit',
        value: input.topDigit,
        unit: 'digit',
        period,
      });
    }

    await this.prisma.statistics.createMany({ data: rows });

    return rows.length;
  }

  async clearAnalysisHistories(): Promise<number> {
    const result = await this.prisma.analysisHistory.deleteMany();
    return result.count;
  }

  async clearStatistics(): Promise<number> {
    const result = await this.prisma.statistics.deleteMany();
    return result.count;
  }
}
