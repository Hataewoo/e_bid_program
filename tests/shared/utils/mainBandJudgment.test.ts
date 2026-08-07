import { describe, expect, it } from 'vitest';
import { analyzeMasterValue } from '@/shared/utils/analysisEngine';
import { recommendDigitChain, resolvePatternRecommendPath } from '@/shared/utils/patternRecommendEngine';

describe('mainBandJudgment virtual chain', () => {
  it('1st digit uses run continuation; 2nd+ uses run suffix pattern flow', () => {
    const result = analyzeMasterValue('00', '5566778899');
    const first = resolvePatternRecommendPath(result, '');
    const second = resolvePatternRecommendPath(result, '6');

    expect(first.mainBandReasons.some((r) => r.includes('run'))).toBe(true);
    expect(second.mainBandReasons.some((r) => r.includes('패턴 흐름'))).toBe(true);
    expect(second.mainBandReasons.some((r) => r.includes('점수 합산'))).toBe(true);
  });

  it('2nd+ digit pick uses repeat/transition from pattern flow', () => {
    const result = analyzeMasterValue('00', '5566778899');
    const chain = recommendDigitChain(result, [], '6');

    expect(chain.chainSteps.length).toBeGreaterThan(0);
    expect(['repeat', 'transition', 'pattern']).toContain(chain.chainSteps[0]!.candidates[0]?.pickMode);
  });

  it('master tail 7 + append 6 — run suffix pattern flow (no score sum)', () => {
    const result = analyzeMasterValue('00', '5566775617');
    const path = resolvePatternRecommendPath(result, '6');

    expect(path.mainBandReasons.some((r) => r.includes('패턴 흐름'))).toBe(true);
    expect(path.mainBandReasons.some((r) => r.includes('점수 합산'))).toBe(true);
    expect(['low', 'high']).toContain(path.targetMainBand);
  });

  it('low-dominant master stays in low band on 1st digit (no blind flip to high)', () => {
    const result = analyzeMasterValue('00', '0011223344');
    const path = resolvePatternRecommendPath(result, '');

    expect(path.targetMainBand).toBe('low');
    expect(path.candidatePool.every((d) => d <= 4)).toBe(true);
  });
});
