import { describe, expect, it } from 'vitest';
import { analyzeMasterValue } from '@/shared/utils/analysisEngine';
import {
  relevantLegacyCodesForAnchorDigit,
  scoreAnchorDigitCodeFlow,
} from '@/shared/utils/legacyCodeFlowAnalysis';

describe('legacyCodeFlowAnalysis', () => {
  it('collects object-digit matching codes for 저고 anchor 3', () => {
    const codes = relevantLegacyCodesForAnchorDigit(3, 'low', '23');
    expect(codes).toContain('23');
    expect(codes).toContain('34');
    expect(codes).toContain('324');
    expect(codes).toContain('32');
  });

  it('collects object-digit matching codes for 저고 anchor 2', () => {
    const codes = relevantLegacyCodesForAnchorDigit(2, 'low', '23');
    expect(codes).toContain('23');
    expect(codes).toContain('24');
    expect(codes).toContain('234');
  });

  it('scores multiple code votes for anchor digit', () => {
    const result = analyzeMasterValue('00', '0011223344');
    const score = scoreAnchorDigitCodeFlow(result, 'low', 3, 'lowHigh', [], '23');
    expect(score.consultedCodes.length).toBeGreaterThan(1);
    expect(score.repeatWeight + score.transitionWeight).toBeGreaterThan(0);
  });
});
