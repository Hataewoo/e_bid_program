import type { Master } from '@/types/electron';

export interface AnalysisData {
  step1Original: string;
  step2Result: string;
  step3Result: string;
  step4CodeValue: string;
  step5Statistics: string;
}

export interface AnalysisInfo {
  totalLength: number;
  digitCount: number;
  lowCount: number;
  highCount: number;
  createdAt: string;
  updatedAt: string;
}

export type LogLevel = 'info' | 'ready' | 'error';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
}

export interface MasterSearchParams {
  query: string;
}

export const EMPTY_ANALYSIS_DATA: AnalysisData = {
  step1Original: '',
  step2Result: '',
  step3Result: '',
  step4CodeValue: '',
  step5Statistics: '',
};

export const EMPTY_ANALYSIS_INFO: AnalysisInfo = {
  totalLength: 0,
  digitCount: 0,
  lowCount: 0,
  highCount: 0,
  createdAt: '-',
  updatedAt: '-',
};

export function masterDescription(master: Master): string {
  return master.memo?.trim() || `Master ${master.masterNo}`;
}
