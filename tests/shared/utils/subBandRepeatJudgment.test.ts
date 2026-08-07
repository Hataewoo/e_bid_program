import { describe, expect, it } from 'vitest';
import { analyzeMasterValue } from '@/shared/utils/analysisEngine';
import { predictDigitChain } from '@/shared/utils/nextDigitEngine';
import { resolvePatternRecommendPath } from '@/shared/utils/patternRecommendEngine';
import { inferSubBandPhase } from '@/shared/utils/subBandRepeatJudgment';

describe('subBandRepeatJudgment', () => {
  it('detects highLow run continuation on repeated 7 in high side PV', () => {
    const result = analyzeMasterValue('00', '5566777788');
    const phase = inferSubBandPhase(result, '77', 'high', 'highLow');
    expect(phase.phase).toBe('repeat');
  });

  it('after virtual append 6, main band uses run suffix pattern flow', () => {
    const result = analyzeMasterValue('00', '5566778899');
    const afterSix = resolvePatternRecommendPath(result, '6');

    expect(afterSix.mainBandReasons.some((r) => r.includes('패턴 흐름'))).toBe(true);
  });

  it('master ending in 7 + append 6 uses pattern flow sub-band (repeat/transition)', () => {
    const result = analyzeMasterValue('00', '5566775617');
    const afterSix = resolvePatternRecommendPath(result, '6');

    expect(afterSix.mainBandReasons.some((r) => r.includes('패턴 흐름'))).toBe(true);
    expect(afterSix.subBandReasons.some((r) => r.includes('패턴 흐름') || r.includes('run'))).toBe(true);
  });

  it('4-digit chain uses repeat/transition pick modes from pattern flow', () => {
    const result = analyzeMasterValue('00', '5566778899');
    const chain = predictDigitChain(result, [], '6');

    expect(chain.chainSteps.length).toBeGreaterThan(1);
    expect(
      chain.chainSteps.every((s) =>
        s.candidates.every((c) => ['repeat', 'transition', 'pattern'].includes(c.pickMode)),
      ),
    ).toBe(true);
  });

  it('chain can reach varied sub-bands when S″ pattern supports', () => {
    const result = analyzeMasterValue('00', '5566778899');
    const chain = predictDigitChain(result, [], '');

    const subBands = chain.chainSteps.map((s) => s.hierarchy.targetSubBand);
    const unique = new Set(subBands);
    expect(unique.size).toBeGreaterThan(1);
  });
});
