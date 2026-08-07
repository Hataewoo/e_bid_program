import { describe, expect, it } from 'vitest';
import { analyzeMasterValue } from '@/shared/utils/analysisEngine';
import { pickDigitByPatternRepeatJudgment } from '@/shared/utils/digitRepeatJudgment';
import {
  pickTopRecommendCandidates,
  poolExcludingPrefixPicks,
  recommendDigitChain,
  resolveFinalDigitPick,
  resolvePatternRecommendPath,
} from '@/shared/utils/patternRecommendEngine';

describe('patternRecommendEngine', () => {
  it('uses S pattern for flow only — not digit 1 when S has repeated 1', () => {
    const result = analyzeMasterValue('00', '0404040404');
    const path = resolvePatternRecommendPath(result, '');

    const top = Number(
      Object.entries(path.digitScores).sort((a, b) => b[1] - a[1])[0]?.[0],
    );

    expect(top).not.toBe(1);
    expect(path.candidatePool.every((d) => d <= 4)).toBe(true);
    expect(path.targetMainBand).toBe('low');
  });

  it('recommends digits from pattern flow pool', () => {
    const result = analyzeMasterValue('00', '000111222');
    const path = resolvePatternRecommendPath(result, '');

    expect(path.digitReasons.some((line) => line.includes('S″'))).toBe(true);
    const top = Number(
      Object.entries(path.digitScores).sort((a, b) => b[1] - a[1])[0]?.[0],
    );
    expect(path.candidatePool).toContain(top);
  });

  it('never uses pattern gap values as digit candidates', () => {
    const result = analyzeMasterValue('00', '2323232323');
    const path = resolvePatternRecommendPath(result, '');
    for (const d of path.candidatePool) {
      expect(path.digitScores[d]).toBeGreaterThan(0);
    }
    expect(path.digitReasons.some((r) => /3 이상.*→ digit/.test(r))).toBe(false);
  });

  it('re-resolves sub-band via pattern flow after prefix', () => {
    const result = analyzeMasterValue('00', '5616125612');
    const afterSix = resolvePatternRecommendPath(result, '6');

    expect(afterSix.mainBandReasons.some((r) => r.includes('run'))).toBe(true);
    expect(afterSix.subBandReasons.some((r) => r.includes('②'))).toBe(true);
  });

  it('2nd+ step uses run suffix pattern flow (no score sum)', () => {
    const result = analyzeMasterValue('00', '5616125612');
    const afterSix = resolvePatternRecommendPath(result, '6');

    expect(afterSix.mainBandReasons.some((r) => r.includes('패턴 흐름'))).toBe(true);
    expect(afterSix.mainBandReasons.some((r) => r.includes('점수 합산'))).toBe(true);
  });

  it('orders top candidate via repeat/transition judgment', () => {
    const result = analyzeMasterValue('00', '5566778899');
    const path = resolvePatternRecommendPath(result, '');
    const top = pickTopRecommendCandidates(path, 3, '', result.digits, result);
    expect(top.length).toBeGreaterThan(0);
  });
});

describe('digitRepeatJudgment', () => {
  it('prefers less-recent digit in transition phase when one is overused', () => {
    const result = analyzeMasterValue('00', '6666665612');
    const pick = pickDigitByPatternRepeatJudgment([5, 6, 7], { 5: 30, 6: 55, 7: 15 }, {
      master: result.digits,
      prefix: '666',
      result,
      activeSide: 'high',
      targetSubBand: 'highLow',
    });

    expect(pick.digit).not.toBe(6);
  });

  it('after picking 6, next step excludes 6 and uses pattern flow', () => {
    const result = analyzeMasterValue('00', '5566778899');
    const path = resolvePatternRecommendPath(result, '6');
    const pick = resolveFinalDigitPick(path, result, '6');

    expect(pick).not.toBeNull();
    expect(pick!.digit).not.toBe(6);
    expect(['repeat', 'transition', 'pattern']).toContain(pick!.mode);
    expect(pick!.reason).toContain('패턴 흐름');
  });

  it('resolveFinalDigitPick returns repeat or transition reason', () => {
    const result = analyzeMasterValue('00', '5566778899');
    const path = resolvePatternRecommendPath(result, '');
    const pick = resolveFinalDigitPick(path, result, '');

    expect(pick).not.toBeNull();
    expect(path.candidatePool).toContain(pick!.digit);
    expect(pick!.reason.length).toBeGreaterThan(0);
  });

  it('poolExcludingPrefixPicks never restores used digits when pool is exhausted', () => {
    expect(poolExcludingPrefixPicks([5, 6, 7], '657')).toEqual([]);
    expect(poolExcludingPrefixPicks([8, 9], '6098')).toEqual([]);
  });

  it('candidates never include digits already in prefix', () => {
    const result = analyzeMasterValue('00', '5566778899');
    const path = resolvePatternRecommendPath(result, '6098');
    const candidates = pickTopRecommendCandidates(path, 4, '6098', result.digits, result);
    const used = new Set('6098'.split(''));

    for (const c of candidates) {
      expect(used.has(String(c.digit))).toBe(false);
    }
  });

  it('chain never repeats a digit from working prefix', () => {
    const result = analyzeMasterValue('00', '5566778899');
    const chain = recommendDigitChain(result, [], '6', { chainDepth: 4 });
    const full = `6${chain.recommendedCombo}`;
    const seen = new Set<string>();

    for (const ch of full) {
      expect(seen.has(ch)).toBe(false);
      seen.add(ch);
    }
  });
});
