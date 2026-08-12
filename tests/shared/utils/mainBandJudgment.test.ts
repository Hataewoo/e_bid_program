import { describe, expect, it } from 'vitest';
import { analyzeMasterValue } from '@/shared/utils/analysisEngine';
import { recommendDigitChain, resolvePatternRecommendPath } from '@/shared/utils/patternRecommendEngine';

describe('mainBandJudgment virtual chain', () => {
  it('1st digit uses S run CodeValues; 2nd+ uses virtual master pattern flow', () => {
    const result = analyzeMasterValue('00', '5566778899');
    const first = resolvePatternRecommendPath(result, '');
    const second = resolvePatternRecommendPath(result, '6');

    expect(first.mainBandReasons.some((r) => r.includes('CodeValues S run'))).toBe(true);
    expect(second.mainBandReasons.some((r) => r.includes('CodeValues S run'))).toBe(true);
    expect(second.mainBandReasons.some((r) => r.includes('가상 Master'))).toBe(true);
  });

  it('2nd+ digit pick uses repeat/transition from pattern flow', () => {
    const result = analyzeMasterValue('00', '5566778899');
    const chain = recommendDigitChain(result, [], '6');

    expect(chain.chainSteps.length).toBeGreaterThan(0);
    expect(['repeat', 'transition', 'pattern']).toContain(chain.chainSteps[0]!.candidates[0]?.pickMode);
  });

  it('master tail 7 + append 6 — S run pattern flow from CodeValues', () => {
    const result = analyzeMasterValue('00', '5566775617');
    const path = resolvePatternRecommendPath(result, '6');

    expect(path.mainBandReasons.some((r) => r.includes('CodeValues S run'))).toBe(true);
    expect(['low', 'high']).toContain(path.targetMainBand);
  });

  it('low-dominant master uses CodeValues run transition on long low run', () => {
    const result = analyzeMasterValue('00', '0011223344');
    const path = resolvePatternRecommendPath(result, '');

    expect(path.mainBandReasons.some((r) => r.includes('전환'))).toBe(true);
    expect(['low', 'high']).toContain(path.targetMainBand);
  });
});
