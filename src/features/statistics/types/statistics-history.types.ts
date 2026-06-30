export type StatisticsHistoryStatus = 'SUCCESS' | 'FAILED';

export interface StatisticsHistory {
  id: string;
  masterNo: string;
  analysisType: string;
  result: string;
  duration: number;
  status: StatisticsHistoryStatus;
  createdAt: string;
  memo?: string;
}

export function formatHistoryTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function masterDisplayLabel(masterNo: string): string {
  return `Master ${masterNo}`;
}
