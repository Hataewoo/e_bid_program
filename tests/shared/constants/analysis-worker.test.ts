import { describe, expect, it } from 'vitest';
import {
  LARGE_MASTER_VALUE_THRESHOLD,
  shouldUseAnalysisWorker,
} from '@/shared/constants/analysis-worker';
import { MASTER_VALUE_MAX_LENGTH } from '@/features/master/services/validation-service';

describe('analysis-worker constants', () => {
  it('uses half of master value max length as threshold', () => {
    expect(LARGE_MASTER_VALUE_THRESHOLD).toBe(Math.floor(MASTER_VALUE_MAX_LENGTH / 2));
  });

  it('enables worker only when setting is on and value is large', () => {
    expect(shouldUseAnalysisWorker(false, LARGE_MASTER_VALUE_THRESHOLD)).toBe(false);
    expect(shouldUseAnalysisWorker(true, LARGE_MASTER_VALUE_THRESHOLD - 1)).toBe(false);
    expect(shouldUseAnalysisWorker(true, LARGE_MASTER_VALUE_THRESHOLD)).toBe(true);
  });
});
