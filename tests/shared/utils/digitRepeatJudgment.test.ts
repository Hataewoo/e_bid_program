import { describe, expect, it } from 'vitest';
import { analyzeMasterValue } from '@/shared/utils/analysisEngine';
import { pickDigitByPatternRepeatJudgment } from '@/shared/utils/digitRepeatJudgment';

describe('digitRepeatJudgment', () => {
  it('blocks repetitive ABAB patterns', () => {
    const result = analyzeMasterValue('00', '1212121212');
    const pick = pickDigitByPatternRepeatJudgment([1, 2, 3], { 1: 50, 2: 40, 3: 10 }, {
      master: result.digits,
      prefix: '12',
      result,
      activeSide: 'low',
      targetSubBand: 'lowHigh',
    });

    expect(pick.digit).not.toBe(2);
  });
});
