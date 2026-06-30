import { describe, expect, it, beforeEach } from 'vitest';
import { BUILTIN_PREDICTION_VERIFICATION_CASES } from '@/shared/fixtures/prediction-verification-cases';
import {
  resolvePredictionVerificationState,
  runPredictionVerificationSuite,
} from '@/shared/utils/predictionVerification';
import {
  getAlgorithmVerificationStatus,
  isPredictionLegacyVerified,
  resetAlgorithmVerificationCache,
} from '@/shared/utils/algorithmVerificationStatus';

describe('predictionVerification', () => {
  beforeEach(() => {
    resetAlgorithmVerificationCache();
  });

  it('runs builtin heuristic suite at 100% pass rate', () => {
    const summary = runPredictionVerificationSuite(BUILTIN_PREDICTION_VERIFICATION_CASES);
    if (summary.failed > 0) {
      const lines = summary.results
        .filter((row) => !row.passed)
        .map((row) => `${row.name} ${row.field}: ${row.expected} vs ${row.actual}`);
      expect.fail(`Prediction failures:\n${lines.join('\n')}`);
    }
    expect(summary.passRate).toBeGreaterThanOrEqual(95);
    expect(summary.heuristic).toBe(true);
    expect(BUILTIN_PREDICTION_VERIFICATION_CASES.length).toBeGreaterThanOrEqual(10);
  });

  it('marks legacy status unverified without SRC-LEGACY cases', () => {
    expect(resolvePredictionVerificationState(BUILTIN_PREDICTION_VERIFICATION_CASES, 0)).toBe(
      'unverified',
    );
  });

  it('algorithm status reports unverified prediction with baseline pass', () => {
    const status = getAlgorithmVerificationStatus();
    expect(status.prediction).toBe('unverified');
    expect(status.predictionHeuristic).toBe(true);
    expect(status.predictionBaselinePassRate).toBeGreaterThanOrEqual(95);
    expect(isPredictionLegacyVerified()).toBe(false);
  });
});
