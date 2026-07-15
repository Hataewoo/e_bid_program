import { describe, expect, it } from 'vitest';
import {
  LARGE_MASTER_VALUE_THRESHOLD,
  shouldUseAnalysisWorker,
} from '@/shared/constants/analysis-worker';

describe('analysis-worker constants', () => {
  it('uses half of master value max length as threshold', () => {
    expect(LARGE_MASTER_VALUE_THRESHOLD).toBe(500);
  });

  it('enables worker only when setting is on and value is large', () => {
    expect(shouldUseAnalysisWorker(false, LARGE_MASTER_VALUE_THRESHOLD)).toBe(false);
    expect(shouldUseAnalysisWorker(true, LARGE_MASTER_VALUE_THRESHOLD - 1)).toBe(false);
    expect(shouldUseAnalysisWorker(true, LARGE_MASTER_VALUE_THRESHOLD)).toBe(true);
  });
});
