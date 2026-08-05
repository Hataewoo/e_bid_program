import { describe, expect, it } from 'vitest';
import {
  analyzeCodeValueSubDetail,
  analyzePatternSubDetailFromValues,
  countBetweenMarkerRule,
  extractCodeValuesFromBaseSequence,
  formatSubAnalysisValues,
  getPatternValuesMatchCount,
} from '@/shared/utils/codeValueSubAnalysis';

describe('codeValueSubAnalysis', () => {
  it('returns 10 rule rows for re-analysis', () => {
    const detail = analyzePatternSubDetailFromValues([1, 3, 3, 2, 3, 2, 1, 1, 1, 1], 'high');
    expect(detail.rules).toHaveLength(10);
    expect(detail.rows).toHaveLength(10);
    expect(detail.baseSequence).toEqual([1, 3, 3, 2, 3, 2, 1, 1, 1, 1]);
  });

  it('extracts 1 중복 as consecutive-1 run lengths in S', () => {
    const patterns = extractCodeValuesFromBaseSequence([1, 1, 1, 3, 2, 1], 'low');
    expect(patterns.oneDuplicate).toEqual([3, 1]);
  });

  it('counts 2 between 3~9 markers (2, 3+α)', () => {
    const patterns = extractCodeValuesFromBaseSequence([3, 2, 2, 4, 2, 5], 'low');
    expect(patterns.commaAlpha_2_3).toEqual([2, 1]);
  });

  it('collects 3 이상 / 5 이상 arrays', () => {
    const patterns = extractCodeValuesFromBaseSequence([1, 2, 3, 4, 5, 3], 'low');
    expect(patterns.threeOrMore).toEqual([3, 4, 5, 3]);
    expect(patterns.fiveOrMore).toEqual([5]);
    expect(getPatternValuesMatchCount(patterns.threeOrMore)).toBe(4);
    expect(getPatternValuesMatchCount(patterns.threeOrMore)).not.toBe(
      patterns.threeOrMore.reduce((a, b) => a + b, 0),
    );
  });

  it('counts values ≥2 between pairs of 1 (1 사이)', () => {
    const result = countBetweenMarkerRule([1, 3, 2, 1, 1, 4, 1], {
      countMin: 2,
      markerExact: 1,
      pairsOnly: true,
    });
    expect(result).toEqual([2, 1]);
  });

  it('formats empty values as dash', () => {
    expect(formatSubAnalysisValues([])).toBe('-');
    expect(formatSubAnalysisValues([1, 2, 3])).toBe('1, 2, 3');
  });

  it('returns empty patterns for empty sequence', () => {
    const detail = analyzeCodeValueSubDetail([], 'low');
    expect(detail.rows.every((row) => row.values.length === 0)).toBe(true);
  });

  it('세부정보 — 클릭한 1 중복 행 값을 재분석한다', () => {
    const input = [
      1, 3, 3, 2, 3, 2, 1, 1, 1, 1, 1, 3, 1, 1, 1, 2, 3, 3, 1, 2, 1, 1, 3, 1, 1, 1, 1, 2, 3, 3,
      1, 2, 1, 1, 1, 1, 2, 3, 3, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 3, 2, 2, 3, 1, 2, 1,
      2, 3, 1, 3, 1, 2, 2, 1, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 5, 4, 3, 3, 3, 1, 4, 1, 1, 2, 3, 2,
    ];
    const detail = analyzePatternSubDetailFromValues(input, 'high');
    expect(detail.baseSequence).toEqual(input);
    expect(detail.patterns.threeOrMore.length).toBeGreaterThan(0);
    expect(detail.patterns.oneDuplicate.length).toBeGreaterThan(0);
  });
});
