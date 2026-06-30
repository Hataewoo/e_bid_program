import { analyzeMasterValue, type AnalysisResult } from '@/shared/utils/analysisEngine';
import type { AnalysisWorkerResponse } from '@/workers/analysis.worker';

let worker: Worker | null = null;
let jobSeq = 0;
const pending = new Map<
  number,
  { resolve: (r: AnalysisResult) => void; reject: (e: Error) => void }
>();

function attachWorkerHandlers(instance: Worker): void {
  instance.onmessage = (event: MessageEvent<AnalysisWorkerResponse>) => {
    const payload = event.data;
    const job = pending.get(payload.id);
    if (!job) return;
    pending.delete(payload.id);
    if (payload.ok) {
      job.resolve(payload.result);
      return;
    }
    job.reject(new Error(payload.error));
  };

  instance.onerror = () => {
    for (const [, job] of pending) {
      job.reject(new Error('Analysis worker failed'));
    }
    pending.clear();
    worker?.terminate();
    worker = null;
  };
}

function getWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  if (!worker) {
    worker = new Worker(new URL('../../workers/analysis.worker.ts', import.meta.url), {
      type: 'module',
    });
    attachWorkerHandlers(worker);
  }
  return worker;
}

export function terminateAnalysisWorker(): void {
  worker?.terminate();
  worker = null;
  pending.clear();
}

export async function runAnalysisInWorker(
  masterNo: string,
  masterValue: string,
): Promise<AnalysisResult> {
  const instance = getWorker();
  if (!instance) {
    return analyzeMasterValue(masterNo, masterValue);
  }

  const id = ++jobSeq;
  return new Promise<AnalysisResult>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    instance.postMessage({ id, masterNo, masterValue });
  });
}
