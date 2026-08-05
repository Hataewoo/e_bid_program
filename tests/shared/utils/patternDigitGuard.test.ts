import { describe, expect, it } from 'vitest';
import { analyzeMasterValue } from '@/shared/utils/analysisEngine';
import { resolvePatternRecommendationPath } from '@/shared/utils/codeValueFlowEngine';
import {
  buildPointValueTokens,
  pointSequenceValueToDigitHints,
  scoreDigitsFromPointValues,
} from '@/shared/utils/pointValuesCodeFlow';
import {
  digitHintsFromMasterSource,
  isPatternCountField,
  pickBalancedDigitAvoidingPatternValue,
} from '@/shared/utils/patternDigitGuard';
import { buildProbabilityProfile } from '@/shared/utils/probabilityEngine';
import { buildCodeValueStats } from '@/shared/utils/analysisEngine';

describe('patternDigitGuard', () => {
  it('rejects pattern values without master source digit', () => {
    expect(digitHintsFromMasterSource(null, [5, 6, 7])).toEqual([]);
    expect(pointSequenceValueToDigitHints(5, 'highLow')).toEqual([]);
    expect(pointSequenceValueToDigitHints(1, 'lowLow')).toEqual([]);
    expect(pointSequenceValueToDigitHints(3, 'highLow')).toEqual([]);
  });

  it('allows master source digit only', () => {
    expect(digitHintsFromMasterSource(7, [5, 6, 7])).toEqual([{ digit: 7, weight: 1 }]);
    const tokens = buildPointValueTokens('777');
    expect(pointSequenceValueToDigitHints(3, 'highLow', tokens[0]!.sourceDigit)).toEqual([
      { digit: 7, weight: 1 },
    ]);
  });

  it('never maps S pattern value to digit in balanced picker', () => {
    const digit = pickBalancedDigitAvoidingPatternValue(
      5,
      0,
      '',
      new Set(),
      [5, 6, 7],
      {
        trailingSame: () => 0,
        wouldRepeat: () => false,
        isOverused: () => false,
      },
    );
    expect(digit).toBe(5);
    const withUsed = pickBalancedDigitAvoidingPatternValue(
      5,
      0,
      '',
      new Set([5]),
      [5, 6, 7],
      {
        trailingSame: () => 0,
        wouldRepeat: () => false,
        isOverused: () => false,
      },
    );
    expect(withUsed).toBe(6);
  });

  it('flags pattern count fields', () => {
    expect(isPatternCountField('oneDuplicate')).toBe(true);
    expect(isPatternCountField('threeOrMore')).toBe(true);
    expect(isPatternCountField('commaAlpha_2_3')).toBe(false);
  });
});

describe('patternDigitGuard — integration', () => {
  it('resolvePatternRecommendationPath has no rule-row digit mapping reasons', () => {
    const master =
      '4901755008349411600466845711739664278210457455698714508283704651927' +
      '63359554428422214959275089154370873911038370854604626534097377';
    const result = analyzeMasterValue('00', master);
    const path = resolvePatternRecommendationPath(result, '');

    expect(path.digitReasons.some((r) => /3 이상.*→ digit/.test(r))).toBe(false);
    expect(path.digitReasons.some((r) => /5 이상.*→ digit/.test(r))).toBe(false);
    expect(path.digitReasons.some((r) => /1 중복.*→ digit/.test(r))).toBe(false);
  });

  it('scoreDigitsFromPointValues only uses S″ token source digits', () => {
    const result = analyzeMasterValue('00', '567656567');
    const { digitReasons } = scoreDigitsFromPointValues(result, '', 'highLow');
    expect(digitReasons.every((r) => r.includes('S″'))).toBe(true);
  });

  it('limits digit scoring to recent S″ tail on long sequences', () => {
    const master = ('5676565656'.repeat(80)).slice(0, 800);
    const result = analyzeMasterValue('00', master);
    const { scores, digitReasons } = scoreDigitsFromPointValues(result, '1', 'highLow');

    expect(digitReasons.some((r) => r.includes('최근 12토큰'))).toBe(true);
    const maxScore = Math.max(...Object.values(scores));
    expect(maxScore).toBeLessThan(10);
  });

  it('buildProbabilityProfile does not boost digits from pattern code labels', () => {
    const result = analyzeMasterValue('00', '1212121212');
    const stats = buildCodeValueStats(result, [
      { id: 1, code: '1 중복', type: 'pattern', description: '1 dup' },
      { id: 2, code: '3 이상', type: 'pattern', description: '3+' },
    ]);
    const withStats = buildProbabilityProfile(result, stats);
    const withoutStats = buildProbabilityProfile(result, []);
    expect(withStats.digitProbability).toEqual(withoutStats.digitProbability);
  });
});
