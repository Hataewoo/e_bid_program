/** Digit count at or above this uses Web Worker when the setting is enabled. */
export const LARGE_MASTER_VALUE_THRESHOLD = 500;

export function shouldUseAnalysisWorker(
  workerEnabled: boolean,
  masterValueLength: number,
): boolean {
  return workerEnabled && masterValueLength >= LARGE_MASTER_VALUE_THRESHOLD;
}
