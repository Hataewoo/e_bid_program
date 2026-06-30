import { describe, expect, it, beforeEach } from 'vitest';
import { BUILTIN_CODE_VALUE_VERIFICATION_CASES } from '@/shared/fixtures/code-value-verification-cases';
import {
  evaluateCodeValueCase,
  resolveCodeValueVerificationState,
  runCodeValueVerificationSuite,
} from '@/shared/utils/codeValueVerification';
import {
  getAlgorithmVerificationStatus,
  resetAlgorithmVerificationCache,
} from '@/shared/utils/algorithmVerificationStatus';

describe('codeValueVerification', () => {
  it('runs builtin suite at 100% pass rate', () => {
    const summary = runCodeValueVerificationSuite(BUILTIN_CODE_VALUE_VERIFICATION_CASES);
    if (summary.failed > 0) {
      const lines = summary.results
        .filter((row) => !row.passed)
        .map((row) => `${row.name} ${row.code} ${row.field}: ${row.expected} vs ${row.actual}`);
      expect.fail(`CodeValue failures:\n${lines.join('\n')}`);
    }
    expect(summary.passRate).toBeGreaterThanOrEqual(95);
    expect(BUILTIN_CODE_VALUE_VERIFICATION_CASES.length).toBeGreaterThanOrEqual(10);
  });

  it('marks legacy status unverified without SRC-LEGACY cases', () => {
    expect(resolveCodeValueVerificationState(BUILTIN_CODE_VALUE_VERIFICATION_CASES, 0)).toBe(
      'unverified',
    );
  });

  it('algorithm status reports unverified CodeValue', () => {
    resetAlgorithmVerificationCache();
    const status = getAlgorithmVerificationStatus();
    expect(status.codeValue).toBe('unverified');
    expect(status.prediction).toBe('unverified');
    expect(status.codeValueBaselinePassRate).toBeGreaterThanOrEqual(95);
  });

  beforeEach(() => {
    resetAlgorithmVerificationCache();
  });

  it('evaluates sequence case TC-CV-001', () => {
    const testCase = BUILTIN_CODE_VALUE_VERIFICATION_CASES[0]!;
    const results = evaluateCodeValueCase(testCase);
    expect(results.every((row) => row.passed)).toBe(true);
  });
});
