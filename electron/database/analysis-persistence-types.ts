export interface CreateAnalysisHistoryInput {
  title: string;
  bidNumber?: string | null;
  status: string;
  result?: string | null;
}

export interface RecordMasterStatisticsInput {
  masterNo: string;
  totalCount: number;
  lowRate: number;
  highRate: number;
  runCount: number;
  maxRun: number;
  topDigit: number | null;
  source: string;
}

export interface CreateStatisticsRowInput {
  category: string;
  label: string;
  value: number;
  unit?: string | null;
  period?: string | null;
}
