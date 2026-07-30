import { describe, expect, it } from 'vitest';
import { analyzeMasterValue } from '@/shared/utils/analysisEngine';
import {
  analyzePatternPhases,
  buildPatternTransitionHints,
} from '@/shared/utils/codeValuePhaseEngine';
import {
  dedupeDigitCandidates,
  predictFromCodeValuePatterns,
  scanPatternStructuralMatches,
} from '@/shared/utils/codeValuePatternPredictor';
import { getLiveSegmentState } from '@/shared/utils/runSegmentEngine';

describe('codeValuePatternPredictor', () => {
  it('finds structural matches without frequency aggregation (legacy scan)', () => {
    const master = '1123411234';
    const live = getLiveSegmentState('11');
    expect(live).not.toBeNull();

    const matches = scanPatternStructuralMatches(master, live!);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0]!.fit).toBeGreaterThanOrEqual(0.68);
  });

  it('dedupes digit candidates by best fit only', () => {
    const matches = [
      {
        digitIndex: 1,
        fit: 0.9,
        patternLabel: '1 중복',
        nextDigit: 2,
        nextClass: 'low' as const,
        runTotalLength: 2,
        remainingInRun: 1,
        runEndsAfterNext: false,
      },
      {
        digitIndex: 5,
        fit: 0.7,
        patternLabel: '1 중복',
        nextDigit: 2,
        nextClass: 'low' as const,
        runTotalLength: 2,
        remainingInRun: 1,
        runEndsAfterNext: false,
      },
      {
        digitIndex: 3,
        fit: 0.85,
        patternLabel: '3 이상',
        nextDigit: 4,
        nextClass: 'low' as const,
        runTotalLength: 3,
        remainingInRun: 2,
        runEndsAfterNext: false,
      },
    ];
    const digits = dedupeDigitCandidates(matches, 3);
    expect(digits).toHaveLength(2);
    expect(digits[0]!.digit).toBe(2);
    expect(digits[0]!.fit).toBe(0.9);
  });

  it('predicts from phase engine with repeat/transition description', () => {
    const result = analyzeMasterValue('00', '112345678901234567890');
    const pred = predictFromCodeValuePatterns(result, '11');

    expect(pred).not.toBeNull();
    expect(pred!.repeatDescription).toContain('저점');
    expect(pred!.phaseRecommendations.length).toBeGreaterThan(0);
    expect(pred!.digitCandidates.length).toBeGreaterThan(0);
    expect(pred!.digitCandidates.length).toBeLessThanOrEqual(5);
    const uniqueDigits = new Set(pred!.digitCandidates.map((c) => c.digit));
    expect(uniqueDigits.size).toBe(pred!.digitCandidates.length);
    expect(pred!.segment.sampleCount).toBeGreaterThan(0);
    expect(pred!.segment.nextSegmentCandidates.length).toBeGreaterThan(0);
    const uniqueS = new Set(pred!.segment.nextSegmentCandidates.map((c) => c.value));
    expect(uniqueS.size).toBe(pred!.segment.nextSegmentCandidates.length);
    const nextValues = pred!.segment.nextSegmentCandidates.map((c) => c.value);
    const expectedValues = pred!.segment.expectedRunLengthCandidates.map((c) => c.value);
    const crossOverlap = nextValues.filter((v) => expectedValues.includes(v));
    if (crossOverlap.length > 0) {
      const recs = pred!.phaseRecommendations;
      const hasStrong = crossOverlap.every((v) => {
        const labels = new Set<string>();
        let fit = 0;
        for (const rec of recs) {
          if (rec.nextSValues.includes(v) || rec.expectedRunLength === v) {
            labels.add(rec.patternLabel);
            fit = Math.max(fit, rec.fit);
          }
        }
        return labels.size >= 2 && fit >= 0.68;
      });
      expect(hasStrong).toBe(true);
    }
    expect(pred!.rationale.some((r) => r.includes('반복') || r.includes('전환'))).toBe(true);
  });

  it('detects oneBetween transition when gap is filled', () => {
    const live = {
      side: 'low' as const,
      completedRunLengths: [1, 3, 4],
      currentRunProgress: 1,
      sourceDigits: '1',
    };
    const recs = analyzePatternPhases(live, [1, 3, 4, 1, 2, 2, 1]);
    const oneBetween = recs.find((r) => r.patternLabel === '1 사이');
    expect(oneBetween).toBeDefined();
    expect(oneBetween!.phase).toBe('transition');
    expect(oneBetween!.nextSValues).toContain(1);
  });

  it('detects single-digit transition while run is in progress', () => {
    const live = {
      side: 'low' as const,
      completedRunLengths: [2],
      currentRunProgress: 1,
      sourceDigits: '22',
    };
    const recs = analyzePatternPhases(live, [2, 3, 4]);
    const transition = recs.find((r) => r.field === 'threeOrMore' && r.phase === 'transition');
    expect(transition).toBeDefined();
    expect(transition!.runEndsAfterNext).toBe(true);
  });

  it('segment next S avoids 1 when S prefix is mostly ones', () => {
    const result = analyzeMasterValue('00', '1214121412');
    const pred = predictFromCodeValuePatterns(result, '1214');
    expect(pred).not.toBeNull();
    const next = pred!.segment.nextSegmentCandidates.map((c) => c.value);
    expect(next.length).toBeGreaterThan(0);
    expect(next.every((v) => v === 1)).toBe(false);
  });

  it('uses master only for pattern transition hints not digit copy', () => {
    const runLengths = [1, 3, 4, 1, 2, 3];
    const hints = buildPatternTransitionHints(runLengths, 'low');
    expect(hints.transitions.size).toBeGreaterThanOrEqual(0);

    const pred = predictFromCodeValuePatterns(
      analyzeMasterValue('00', '1123411234'),
      '11',
    );
    expect(pred!.bestMatch?.digitIndex).toBe(-1);
    expect(pred!.digitCandidates[0]!.patternLabel).toMatch(/반복|전환/);
  });
});
