import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { analyzeMasterValue } from '@/shared/utils/analysisEngine';
import {
  refineSubBandWithSiblingCodeFlow,
  resolveAnchorDigitForSubBand,
} from '@/shared/utils/subBandCrossRefinement';
import { findLastDigitInSubBand } from '@/shared/utils/subBandRepeatJudgment';
import {
  resolveFinalDigitPick,
  resolvePatternRecommendPath,
} from '@/shared/utils/patternRecommendEngine';

const USER_MASTER = readFileSync('scripts/_tmp_master.txt', 'utf8').trim();

describe('subBandCrossRefinement', () => {
  it('finds last 저저/저고 digits in master tail', () => {
    const ctx = USER_MASTER;
    expect(findLastDigitInSubBand(ctx, 'lowLow')).toBe(0);
    expect(findLastDigitInSubBand(ctx, 'lowHigh')).toBe(3);
  });

  it('user master — 저저·저고 다중 코드 비교 후 pool 확정', () => {
    const result = analyzeMasterValue('00', USER_MASTER);
    const refined = refineSubBandWithSiblingCodeFlow(result, '', 'low', 'lowLow', []);
    expect(refined.primaryDigit).toBe(0);
    expect(refined.siblingDigit).toBe(3);
    expect(refined.primaryScore?.consultedCodes).toContain('01');
    expect(refined.siblingScore?.consultedCodes.length).toBeGreaterThan(1);
    expect(refined.sub).toBeDefined();
    expect(refined.reasons.some((r) => r.includes('②′'))).toBe(true);
  });

  it('resolveAnchorDigitForSubBand prefers sub-band tail digit', () => {
    const anchor = resolveAnchorDigitForSubBand(USER_MASTER, 'lowLow', [0, 1]);
    expect(anchor).toBe(0);
  });

  it('full path applies cross refinement before digit pick', () => {
    const result = analyzeMasterValue('00', USER_MASTER);
    const path = resolvePatternRecommendPath(result, '', []);
    expect(path.subBandReasons.some((r) => r.startsWith('②′'))).toBe(true);
    expect(path.targetSubBand).toBe('lowHigh');
    const pick = resolveFinalDigitPick(path, result, '', []);
    expect(pick?.digit).toBeGreaterThanOrEqual(2);
    expect(pick?.digit).toBeLessThanOrEqual(4);
    expect(['repeat', 'transition', 'pattern']).toContain(pick?.mode);
  });
});
