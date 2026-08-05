import { describe, expect, it } from 'vitest';
import {
  RECENT_DIGIT_SCORE_TAIL,
  sliceRecentDigitScoreTail,
  sliceRecentTail,
  useFullMasterSequence,
} from '@/shared/utils/recentCompare';

describe('recentCompare', () => {
  it('useFullMasterSequence returns entire array without truncation', () => {
    const arr = Array.from({ length: 80 }, (_, i) => i);
    expect(useFullMasterSequence(arr)).toEqual(arr);
    expect(useFullMasterSequence(arr).length).toBe(80);
  });

  it('sliceRecentTail alias returns full master sequence', () => {
    const arr = Array.from({ length: 200 }, (_, i) => i);
    const sliced = sliceRecentTail(arr);
    expect(sliced.length).toBe(200);
    expect(sliced[0]).toBe(0);
    expect(sliced[sliced.length - 1]).toBe(199);
  });

  it('returns full array for short sequences', () => {
    expect(sliceRecentTail([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('sliceRecentDigitScoreTail limits digit scoring window', () => {
    const arr = Array.from({ length: 50 }, (_, i) => i);
    const tail = sliceRecentDigitScoreTail(arr);
    expect(tail.length).toBe(RECENT_DIGIT_SCORE_TAIL);
    expect(tail[0]).toBe(50 - RECENT_DIGIT_SCORE_TAIL);
  });
});
