import { describe, expect, it } from 'vitest';
import { wouldFormRepetitivePattern } from '@/shared/utils/patternRepeatGuard';
import { pickChainStepDigit } from '@/shared/utils/patternRecommendEngine';

describe('patternRepeatGuard', () => {
  it('blocks 2323 ABAB style', () => {
    expect(wouldFormRepetitivePattern('232', 3)).toBe(true);
  });

  it('blocks 2111 consecutive', () => {
    expect(wouldFormRepetitivePattern('21', 1)).toBe(true);
  });

  it('blocks 666 triple', () => {
    expect(wouldFormRepetitivePattern('66', 6)).toBe(true);
  });

  it('allows non-repetitive picks', () => {
    expect(wouldFormRepetitivePattern('1', 5)).toBe(false);
    expect(wouldFormRepetitivePattern('12', 7)).toBe(false);
  });

  it('pickChainStepDigit skips repetitive candidate', () => {
    const pick = pickChainStepDigit(
      [
        { digit: 3, patternScore: 50, pickMode: 'repeat', pickReason: '' },
        { digit: 5, patternScore: 40, pickMode: 'transition', pickReason: '' },
      ],
      '232',
    );
    expect(pick?.digit).toBe(5);
    expect(wouldFormRepetitivePattern('232', pick!.digit)).toBe(false);
  });
});
