import { describe, expect, it } from 'vitest';
import {
  analyzePatternPhases,
  assignUniqueNextSPerSlot,
  balanceSegmentLengthLists,
  buildPatternSlotRecommendations,
  buildPatternTransitionHints,
  collectMergedExpectedRunLengths,
  collectMergedNextSValues,
  countTrailingSameDigit,
  isStrongSegmentConsensus,
  phaseRecommendationsToDigitCandidates,
  pickChainStepDigit,
  pickVariedNextSValues,
  pickSingleNextDigit,
  sliceRecentRunLengths,
  wouldFormRepetitivePattern,
} from '@/shared/utils/codeValuePhaseEngine';

describe('codeValuePhaseEngine', () => {
  it('builds transition hints from pattern label sequence', () => {
    const hints = buildPatternTransitionHints([1, 2, 3, 1, 2], 'low');
    expect(hints.transitions).toBeInstanceOf(Map);
    const oneMap = hints.transitions.get('S run');
    if (oneMap) {
      for (const weight of oneMap.values()) {
        expect(weight).toBeLessThanOrEqual(1);
        expect(weight).toBeGreaterThan(0);
      }
    }
  });

  it('sliceRecentRunLengths keeps the full master run sequence', () => {
    const long = Array.from({ length: 60 }, (_, i) => (i % 5) + 1);
    const sliced = sliceRecentRunLengths(long, 40);
    expect(sliced.length).toBe(60);
    expect(sliced[0]).toBe(long[0]);
    expect(sliced[sliced.length - 1]).toBe(long[long.length - 1]);
  });

  it('assignUniqueNextSPerSlot avoids duplicate primary S across slots', () => {
    const live = {
      side: 'low' as const,
      completedRunLengths: [1, 2],
      currentRunProgress: 1,
      sourceDigits: '12',
    };
    const recs = analyzePatternPhases(live, [1, 2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4]);
    const unique = assignUniqueNextSPerSlot(recs, live.completedRunLengths, live.side, live.currentRunProgress);
    const primaries = unique.map((r) => r.nextSValues[0]).filter((v) => v !== undefined);
    expect(primaries.length).toBe(11);
    expect(new Set(primaries).size).toBeLessThanOrEqual(10);
    expect(primaries.some((v) => v! >= 5)).toBe(true);
  });

  it('phaseRecommendationsToDigitCandidates assigns unique digits per pattern slot', () => {
    const live = {
      side: 'low' as const,
      completedRunLengths: [1],
      currentRunProgress: 1,
      sourceDigits: '1',
    };
    const recs = analyzePatternPhases(live, [1, 2, 3, 4]);
    const digits = phaseRecommendationsToDigitCandidates(live, recs, '1', 10);
    const values = digits.map((d) => d.digit);
    expect(new Set(values).size).toBe(values.length);
  });

  it('always returns at least one recommendation when run is in progress', () => {
    const live = {
      side: 'low' as const,
      completedRunLengths: [],
      currentRunProgress: 2,
      sourceDigits: '11',
    };
    const recs = analyzePatternPhases(live, [1, 2, 3]);
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0]!.phase).toBe('transition');
  });

  it('prefers different digits after repeated prefix', () => {
    const live = {
      side: 'low' as const,
      completedRunLengths: [],
      currentRunProgress: 2,
      sourceDigits: '11',
    };
    const recs = analyzePatternPhases(live, [1, 2, 3]);
    const digits = phaseRecommendationsToDigitCandidates(live, recs, '11', 4);
    expect(digits.length).toBeGreaterThan(0);
    expect(digits[0]!.digit).not.toBe(1);
  });

  it('offers varied digits when not forced to continue run', () => {
    const live = {
      side: 'low' as const,
      completedRunLengths: [1],
      currentRunProgress: 1,
      sourceDigits: '1',
    };
    const recs = analyzePatternPhases(live, [1, 2, 3, 4]);
    const digits = phaseRecommendationsToDigitCandidates(live, recs, '1', 4);
    expect(digits.length).toBeGreaterThan(1);
    expect(digits[0]!.digit).not.toBe(1);
  });

  it('pickChainStepDigit avoids repeating last digit', () => {
    const candidates = [
      { digit: 1, fit: 0.95, patternLabel: '전환 · S run' },
      { digit: 2, fit: 0.88, patternLabel: '전환 · S run' },
      { digit: 3, fit: 0.85, patternLabel: '전환 · S run' },
    ];
    const picked = pickChainStepDigit(candidates, '1', null);
    expect(picked?.digit).not.toBe(1);
  });

  it('wouldFormRepetitivePattern blocks 2323 2111 6667 style', () => {
    expect(wouldFormRepetitivePattern('232', 3)).toBe(true);
    expect(wouldFormRepetitivePattern('21', 1)).toBe(true);
    expect(wouldFormRepetitivePattern('66', 6)).toBe(true);
    expect(wouldFormRepetitivePattern('1', 5)).toBe(false);
    expect(wouldFormRepetitivePattern('12', 7)).toBe(false);
  });

  it('pickSingleNextDigit returns one varied digit', () => {
    const live = {
      side: 'low' as const,
      completedRunLengths: [1, 2],
      currentRunProgress: 1,
      sourceDigits: '12',
    };
    const recs = analyzePatternPhases(live, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const pick = pickSingleNextDigit(recs, '23');
    expect(pick).not.toBeNull();
    expect(pick!.digit).toBeGreaterThanOrEqual(0);
    expect(pick!.digit).toBeLessThanOrEqual(9);
    expect(wouldFormRepetitivePattern('23', pick!.digit)).toBe(false);
  });

  it('pickVariedNextSValues returns balanced 0~9 order', () => {
    const values = pickVariedNextSValues([1, 2], 'low', 1);
    expect(values.length).toBe(10);
    expect(new Set(values).size).toBe(10);
    expect(values.some((v) => v <= 4)).toBe(true);
    expect(values.some((v) => v >= 5)).toBe(true);
  });

  it('analyzePatternPhases fills all 10 pattern slots with unique S', () => {
    const live = {
      side: 'low' as const,
      completedRunLengths: [1, 2],
      currentRunProgress: 1,
      sourceDigits: '12',
    };
    const recs = analyzePatternPhases(live, [1, 2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4]);
    expect(recs.length).toBe(11);
    const primaries = recs.map((r) => r.nextSValues[0]).filter((v) => v !== undefined);
    expect(new Set(primaries).size).toBeLessThanOrEqual(10);
    expect(primaries.some((v) => v! >= 5)).toBe(true);
    const slots = buildPatternSlotRecommendations(recs);
    expect(slots.every((s) => s.nextS >= 0 && s.nextS <= 9)).toBe(true);
  });

  it('counts trailing same digits', () => {
    expect(countTrailingSameDigit('1333')).toBe(3);
    expect(countTrailingSameDigit('1324')).toBe(1);
  });

  it('collectMergedNextSValues merges all pattern recs without duplicate S', () => {
    const live = {
      side: 'low' as const,
      completedRunLengths: [1, 2],
      currentRunProgress: 1,
      sourceDigits: '12',
    };
    const recs = analyzePatternPhases(live, [1, 2, 3, 4]);
    const merged = collectMergedNextSValues(recs, live.completedRunLengths, live.currentRunProgress);
    expect(merged.length).toBeGreaterThan(0);
    const values = merged.map((m) => m.value);
    expect(new Set(values).size).toBe(values.length);
    expect(merged.some((m) => m.labels.length > 0)).toBe(true);
  });

  it('collectMergedExpectedRunLengths merges pattern expected run lengths', () => {
    const live = {
      side: 'low' as const,
      completedRunLengths: [1, 3],
      currentRunProgress: 2,
      sourceDigits: '113',
    };
    const recs = analyzePatternPhases(live, [1, 3, 4, 3]);
    const merged = collectMergedExpectedRunLengths(recs, live.currentRunProgress);
    expect(merged.length).toBeGreaterThan(0);
    expect(merged.every((m) => m.value >= live.currentRunProgress)).toBe(true);
    const values = merged.map((m) => m.value);
    expect(new Set(values).size).toBe(values.length);
  });

  it('balanceSegmentLengthLists avoids cross-list overlap unless strong consensus', () => {
    const nextPool = [
      { value: 3, fit: 0.75, labels: ['3 이상'] },
      { value: 4, fit: 0.7, labels: ['2 run'] },
      { value: 5, fit: 0.65, labels: ['5 이상'] },
    ];
    const expectedPool = [
      { value: 3, fit: 0.72, labels: ['S run'] },
      { value: 2, fit: 0.68, labels: ['2 run'] },
    ];
    const weak = balanceSegmentLengthLists(nextPool, expectedPool, 5);
    const weakOverlap = weak.next.some((n) => weak.expected.some((e) => e.value === n.value));
    expect(weakOverlap).toBe(false);

    const strongExpectedPool = [
      { value: 3, fit: 0.9, labels: ['3 이상', 'S run'] },
      { value: 2, fit: 0.68, labels: ['2 run'] },
    ];
    expect(isStrongSegmentConsensus(strongExpectedPool[0]!)).toBe(true);
    const strong = balanceSegmentLengthLists(nextPool, strongExpectedPool, 5);
    expect(strong.next.some((n) => n.value === 3)).toBe(true);
    expect(strong.expected.some((e) => e.value === 3)).toBe(true);
  });
});
