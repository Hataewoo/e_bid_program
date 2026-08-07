import { describe, expect, it } from 'vitest';
import { analyzeMasterValue } from '@/shared/utils/analysisEngine';
import {
  pickDigitByPatternFlow,
  resolveMainBandFromPatternFlow,
  resolveSubBandFromPatternFlow,
} from '@/shared/utils/patternFlowPick';
import { recommendDigitChain } from '@/shared/utils/patternRecommendEngine';

describe('patternFlowPick', () => {
  it('does not always pick lowHigh for low-dominant masters', () => {
    const result = analyzeMasterValue('00', '0011223344');
    const { sub, reasons } = resolveSubBandFromPatternFlow(result, '', 'low');
    expect(['lowLow', 'lowHigh']).toContain(sub);
    expect(reasons.some((r) => r.includes('패턴 흐름'))).toBe(true);
  });

  it('chain sub-bands vary by pattern flow (not all lowHigh)', () => {
    const result = analyzeMasterValue('00', '0011223344');
    const chain = recommendDigitChain(result, [], '', { chainDepth: 4 });
    const subs = chain.chainSteps.map((s) => s.hierarchy.targetSubBand);
    expect(new Set(subs).size).toBeGreaterThan(1);
  });

  it('different masters produce different combos', () => {
    const a = recommendDigitChain(analyzeMasterValue('00', '5566775617'), [], '', { chainDepth: 4 });
    const b = recommendDigitChain(analyzeMasterValue('00', '0123401234'), [], '', { chainDepth: 4 });
    expect(a.recommendedCombo).not.toBe(b.recommendedCombo);
  });

  it('pickDigitByPatternFlow uses repeat/transition not scores', () => {
    const result = analyzeMasterValue('00', '0123401234');
    const pick = pickDigitByPatternFlow([2, 3, 4], result, '', 'lowHigh');
    expect(pick.digit).toBeGreaterThanOrEqual(2);
    expect(pick.digit).toBeLessThanOrEqual(4);
    expect(pick.reason).toContain('패턴 흐름');
  });

  it('2nd+ main band uses run suffix flow without score sum', () => {
    const result = analyzeMasterValue('00', '5566775617');
    const { reasons } = resolveMainBandFromPatternFlow(result, '6');
    expect(reasons.some((r) => r.includes('run'))).toBe(true);
    expect(reasons.some((r) => r.includes('점수 합산'))).toBe(true);
  });
});
