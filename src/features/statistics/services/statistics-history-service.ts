import type { AnalysisHistory, Statistics as DbStatistics } from '@/types/electron';
import type { StatisticsHistory } from '../types/statistics-history.types';
import { statisticsHistoryRepository } from '../repositories/statistics-history-repository';

function mapAnalysisHistoryRow(row: AnalysisHistory): StatisticsHistory {
  let summarySource = '';
  if (row.result) {
    try {
      const parsed = JSON.parse(row.result) as { source?: string };
      summarySource = parsed.source ?? '';
    } catch {
      summarySource = '';
    }
  }

  return {
    id: `analysis-${row.id}`,
    masterNo: row.bidNumber?.trim() || '-',
    analysisType: 'Analysis Run',
    result: row.status,
    duration: 0,
    status: row.status === 'failed' ? 'FAILED' : 'SUCCESS',
    createdAt: row.analyzedAt,
    memo: summarySource ? `${row.title} (${summarySource})` : row.title,
  };
}

function mapStatisticsRow(row: DbStatistics): StatisticsHistory {
  return {
    id: `stat-${row.id}`,
    masterNo: row.period?.trim() || row.category,
    analysisType: row.category,
    result: `${row.label}: ${row.value}${row.unit ? ` ${row.unit}` : ''}`,
    duration: 0,
    status: 'SUCCESS',
    createdAt: row.recordedAt,
    memo: row.label,
  };
}

export class StatisticsHistoryService {
  constructor(private readonly repository = statisticsHistoryRepository) {}

  async loadAll(): Promise<StatisticsHistory[]> {
    const [analysisRows, statisticsRows] = await Promise.all([
      this.repository.findAnalysisHistories(),
      this.repository.findStatisticsRows(),
    ]);

    const merged = [
      ...analysisRows.map(mapAnalysisHistoryRow),
      ...statisticsRows.map(mapStatisticsRow),
    ];

    merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return merged;
  }

  async reload(): Promise<StatisticsHistory[]> {
    return this.loadAll();
  }

  async clearAll(): Promise<void> {
    await Promise.all([
      this.repository.clearAnalysisHistories(),
      this.repository.clearStatistics(),
    ]);
  }
}

export const statisticsHistoryService = new StatisticsHistoryService();
