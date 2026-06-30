import { describe, expect, it } from 'vitest';
import {
  evaluateRegressionGate,
  formatRegressionGateMessage,
  REGRESSION_GATE_MIN_PASS_RATE,
} from '@/shared/utils/regressionGate';

describe('regressionGate', () => {
  it('uses 95% minimum pass rate', () => {
    expect(REGRESSION_GATE_MIN_PASS_RATE).toBe(95);
  });

  it('passes built-in regression gate', () => {
    const result = evaluateRegressionGate();
    expect(result.ok).toBe(true);
    expect(result.summary.passRate).toBeGreaterThanOrEqual(REGRESSION_GATE_MIN_PASS_RATE);
    expect(formatRegressionGateMessage(result)).toContain('PASS');
  });
});
