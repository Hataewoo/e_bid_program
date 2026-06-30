import { MASTER_VALUE_MAX_LENGTH } from '@/features/master/services/validation-service';

/** Digit count at or above this uses Web Worker when the setting is enabled. */
export const LARGE_MASTER_VALUE_THRESHOLD = Math.floor(MASTER_VALUE_MAX_LENGTH / 2);

export function shouldUseAnalysisWorker(
  workerEnabled: boolean,
  masterValueLength: number,
): boolean {
  return workerEnabled && masterValueLength >= LARGE_MASTER_VALUE_THRESHOLD;
}
