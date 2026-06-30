import type { Master } from '@/types/electron';
import { masterDisplayName } from '@/shared/utils/masterFilter';

export { filterMasters } from '@/shared/utils/masterFilter';

export interface StatisticsCardData {
  id: string;
  title: string;
  content: string;
}

export interface StatisticsData {
  cards: StatisticsCardData[];
}

export interface StatisticsMasterInfo {
  masterNo: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export type LogLevel = 'info' | 'ready' | 'waiting';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
}

export const CARD_TITLES = [
  'Frequency',
  'Low / High Ratio',
  'Run Count',
  'Distribution',
  'Recent History',
  'Statistics Summary',
] as const;

export const EMPTY_STATISTICS_DATA: StatisticsData = {
  cards: CARD_TITLES.map((title) => ({
    id: title.toLowerCase().replace(/\s+/g, '-'),
    title,
    content: '',
  })),
};

export const EMPTY_MASTER_INFO: StatisticsMasterInfo = {
  masterNo: '-',
  description: '-',
  createdAt: '-',
  updatedAt: '-',
};

export function masterName(master: Master): string {
  return masterDisplayName(master);
}
