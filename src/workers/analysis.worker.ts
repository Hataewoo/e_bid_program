import { analyzeMasterValue, type AnalysisResult } from '@/shared/utils/analysisEngine';

export interface AnalysisWorkerRequest {
  id: number;
  masterNo: string;
  masterValue: string;
}

export interface AnalysisWorkerSuccess {
  id: number;
  ok: true;
  result: AnalysisResult;
}

export interface AnalysisWorkerFailure {
  id: number;
  ok: false;
  error: string;
}

export type AnalysisWorkerResponse = AnalysisWorkerSuccess | AnalysisWorkerFailure;

self.onmessage = (event: MessageEvent<AnalysisWorkerRequest>) => {
  const { id, masterNo, masterValue } = event.data;
  try {
    const result = analyzeMasterValue(masterNo, masterValue);
    const response: AnalysisWorkerSuccess = { id, ok: true, result };
    self.postMessage(response);
  } catch (error) {
    const response: AnalysisWorkerFailure = {
      id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
    self.postMessage(response);
  }
};
