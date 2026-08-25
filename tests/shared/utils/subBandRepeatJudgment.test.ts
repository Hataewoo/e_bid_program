import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { analyzeMasterValue } from '@/shared/utils/analysisEngine';
import { buildLegacyCodeContentForLastDigit } from '@/shared/utils/legacyDigitCodePick';
import { predictDigitChain } from '@/shared/utils/nextDigitEngine';
import { resolvePatternRecommendPath } from '@/shared/utils/patternRecommendEngine';
import {
  inferSubBandPhase,
  inferSubBandPhaseFromOneBetween,
  inferMainBandPhaseFromSequence,
  inferPhaseFromSequence,
} from '@/shared/utils/subBandRepeatJudgment';

describe('subBandRepeatJudgment', () => {
  it('1사이 패턴 1순위 — between 진행 중이면 repeat', () => {
    const phase = inferSubBandPhaseFromOneBetween([1, 3, 2, 1, 3], 'low', 'lowLow');
    expect(phase?.phase).toBe('repeat');
    expect(phase?.label).toContain('1사이');
    expect(phase?.label).toContain('1/2');
  });

  it('1사이 패턴 1순위 — between 종료면 transition', () => {
    const phase = inferSubBandPhaseFromOneBetween([1, 3, 2, 1], 'low', 'lowLow');
    expect(phase?.phase).toBe('transition');
    expect(phase?.label).toContain('1사이');
  });

  it('1사이 없으면 null — 다른 패턴으로 fallback', () => {
    expect(inferSubBandPhaseFromOneBetween([3, 2, 3], 'low', 'lowHigh')).toBeNull();
  });

  it('main band 1사이 우선 — high S 1사이 종료면 저점 전환', () => {
    const highS = [1, 2, 2, 2, 1, 3, 1, 1, 2, 1, 1, 1, 1, 3, 5, 1, 1, 1, 1, 1, 2, 2];
    const phase = inferMainBandPhaseFromSequence(highS, 'high', 2, 9);
    expect(phase.phase).toBe('transition');
    expect(phase.label).toContain('1사이');
    expect(phase.label).toContain('전환');
  });

  it('detects highLow run continuation on repeated 7 in high side PV', () => {
    const result = analyzeMasterValue('00', '5566777788');
    const phase = inferSubBandPhase(result, '77', 'high', 'highLow');
    expect(phase.phase).toBe('repeat');
  });

  it('after virtual append 6, main band uses run suffix pattern flow', () => {
    const result = analyzeMasterValue('00', '5566778899');
    const afterSix = resolvePatternRecommendPath(result, '6');

    expect(afterSix.mainBandReasons.some((r) => r.includes('CodeValues'))).toBe(true);
  });

  it('master ending in 7 + append 6 uses pattern flow sub-band (repeat/transition)', () => {
    const result = analyzeMasterValue('00', '5566775617');
    const afterSix = resolvePatternRecommendPath(result, '6');

    expect(afterSix.mainBandReasons.some((r) => r.includes('CodeValues'))).toBe(true);
    expect(afterSix.subBandReasons.some((r) => r.includes('CodeValues') || r.includes('run'))).toBe(true);
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

  it('1사이 transition wins tie against 1중복 at marker 1 (code 89)', () => {
    const master = readFileSync('scripts/_tmp_master.txt', 'utf8').trim();
    const r = analyzeMasterValue('00', master);
    const { row } = buildLegacyCodeContentForLastDigit(r, 'high', 8, []);
    const phase = inferPhaseFromSequence(row.gaps, 'high', 'highHigh', 8);
    expect(phase.phase).toBe('transition');
    expect(phase.label).toContain('마커 1 도달');
  });

  it('고고 S″ 1사이 없을 때 Side S run 1사이 → 형제 전환', () => {
    const master = readFileSync('scripts/_tmp_master.txt', 'utf8').trim();
    const r = analyzeMasterValue('00', master);
    const phase = inferSubBandPhase(r, '', 'high', 'highHigh');
    expect(phase.phase).toBe('transition');
    expect(phase.label).toContain('Side S');
  });
});
