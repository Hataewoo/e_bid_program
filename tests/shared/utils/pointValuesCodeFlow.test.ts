import { describe, expect, it } from 'vitest';
import { analyzeMasterValue } from '@/shared/utils/analysisEngine';
import {
  analyzePointValuesPatterns,
  buildPointValueTokens,
  buildPointValuesSequence,
  buildSubBandPointValueCounts,
  buildStepSubBandLegacyDetails,
  filterPointValuesToSubBand,
  getSidePointValues,
  pointSequenceValueToDigitHints,
  pointSequenceValueToSubBandHints,
  resolveSourceDigitForPatternValue,
  resolveSubBandFromPointValues,
  scoreDigitsFromPointValues,
  verifyPointValuesSubBandAnalysis,
} from '@/shared/utils/pointValuesCodeFlow';
import { getPatternValuesMatchCount } from '@/shared/utils/codeValueSubAnalysis';
import { resolvePatternRecommendPath } from '@/shared/utils/patternRecommendEngine';

describe('pointValuesCodeFlow — low band', () => {
  it('builds S′ from Low Point Values with singleton digits 0~4', () => {
    expect(buildPointValuesSequence('01234')).toEqual([0, 1, 2, 3, 4]);
    expect(buildPointValuesSequence('001')).toEqual([2, 1]);
  });

  it('maps run length to source digit for hints (777 → 7 not 3)', () => {
    const tokens = buildPointValueTokens('777');
    expect(tokens).toEqual([{ value: 3, sourceDigit: 7, isRun: true }]);
    expect(pointSequenceValueToDigitHints(3, 'highLow', 7)).toEqual([{ digit: 7, weight: 1 }]);
    expect(pointSequenceValueToSubBandHints(3, 'high', 7)).toEqual([
      { sub: 'highLow', weight: 1 },
    ]);
    expect(pointSequenceValueToDigitHints(3, 'highLow')).not.toEqual([{ digit: 3, weight: 1 }]);
  });

  it('maps low run 000 to source digit 0', () => {
    const tokens = buildPointValueTokens('000');
    expect(tokens[0]).toEqual({ value: 3, sourceDigit: 0, isRun: true });
    expect(pointSequenceValueToDigitHints(3, 'lowLow', 0)).toEqual([{ digit: 0, weight: 1 }]);
    expect(pointSequenceValueToSubBandHints(3, 'low', 0)).toEqual([{ sub: 'lowLow', weight: 1 }]);
  });

  it('maps S′ source digits to sub-bands for low band', () => {
    expect(pointSequenceValueToSubBandHints(0, 'low', 0)).toEqual([{ sub: 'lowLow', weight: 1 }]);
    expect(pointSequenceValueToSubBandHints(1, 'low', 1)).toEqual([{ sub: 'lowLow', weight: 1 }]);
    expect(pointSequenceValueToSubBandHints(3, 'low', 3)).toEqual([{ sub: 'lowHigh', weight: 1 }]);
    expect(pointSequenceValueToSubBandHints(0, 'low')).toEqual([]);
    expect(pointSequenceValueToSubBandHints(1, 'low')).toEqual([]);
    expect(pointSequenceValueToSubBandHints(3, 'low')).toEqual([]);
    expect(pointSequenceValueToSubBandHints(3, 'low', 0, { isRun: true })).toEqual([
      { sub: 'lowLow', weight: 1 },
    ]);
  });

  it('resolves lowLow vs lowHigh from Low Point Values', () => {
    const result = analyzeMasterValue('00', '5001234000');
    const { sub, reasons } = resolveSubBandFromPointValues(result, '', 'low');

    expect(['lowLow', 'lowHigh']).toContain(sub);
    expect(reasons.some((r) => r.includes('Low Point Values'))).toBe(true);
  });

  it('scores 0 vs 1 within lowLow', () => {
    const result = analyzeMasterValue('00', '010101');
    const { scores, digitReasons } = scoreDigitsFromPointValues(result, '', 'lowLow');

    expect(scores[0]).toBeGreaterThan(0.1);
    expect(scores[1]).toBeGreaterThan(0.1);
    expect(digitReasons.some((r) => r.includes('Low Point Values'))).toBe(true);
  });

  it('supports lowHigh (2~4) pipeline', () => {
    const verification = verifyPointValuesSubBandAnalysis('low');
    const lowHigh = verification.details.find((d) => d.subBand === 'lowHigh');

    expect(verification.allSupported).toBe(true);
    expect(lowHigh?.samplePointValues).toBe('23423');
    expect(lowHigh?.digitHints).toEqual(expect.arrayContaining([2, 3, 4]));
  });

  it('scores 2 vs 3 vs 4 within lowHigh', () => {
    const result = analyzeMasterValue('00', '5234234');
    const filtered = filterPointValuesToSubBand(getSidePointValues(result, '', 'low'), 'lowHigh');
    const { baseSequence, rows } = analyzePointValuesPatterns(filtered, 'low');

    expect(filtered).toMatch(/^[234]+$/);
    expect(baseSequence.length).toBeGreaterThan(0);
    expect(rows.some((r) => r.values.length > 0)).toBe(true);

    const { scores } = scoreDigitsFromPointValues(result, '', 'lowHigh');
    expect(scores[2]).toBeGreaterThan(0.1);
    expect(scores[3]).toBeGreaterThan(0.1);
    expect(scores[4]).toBeGreaterThan(0.1);
  });
});

describe('pointValuesCodeFlow — high band (symmetric to low)', () => {
  it('builds S′ from High Point Values with singleton digits 5~9', () => {
    expect(buildPointValuesSequence('56789')).toEqual([5, 6, 7, 8, 9]);
    expect(buildPointValuesSequence('889')).toEqual([2, 9]);
  });

  it('maps S′ source digits to sub-bands for high band', () => {
    expect(pointSequenceValueToSubBandHints(6, 'high', 6)).toEqual([{ sub: 'highLow', weight: 1 }]);
    expect(pointSequenceValueToSubBandHints(8, 'high', 8)).toEqual([{ sub: 'highHigh', weight: 1 }]);
    expect(pointSequenceValueToSubBandHints(9, 'high', 9)).toEqual([{ sub: 'highHigh', weight: 1 }]);
    expect(pointSequenceValueToSubBandHints(6, 'high')).toEqual([]);
    expect(pointSequenceValueToSubBandHints(8, 'high')).toEqual([]);
    expect(pointSequenceValueToSubBandHints(9, 'high')).toEqual([]);
    expect(pointSequenceValueToSubBandHints(3, 'high', 9, { isRun: true })).toEqual([
      { sub: 'highHigh', weight: 1 },
    ]);
    expect(pointSequenceValueToSubBandHints(3, 'high', 9, { patternField: 'threeOrMore' })).toEqual([
      { sub: 'highHigh', weight: 1 },
    ]);
    expect(pointSequenceValueToSubBandHints(3, 'high', undefined, { patternField: 'threeOrMore' })).toEqual([]);
  });

  it('resolves highLow vs highHigh from High Point Values', () => {
    const result = analyzeMasterValue('00', '5678989');
    const { sub, reasons } = resolveSubBandFromPointValues(result, '', 'high');

    expect(['highLow', 'highHigh']).toContain(sub);
    expect(reasons.some((r) => r.includes('High Point Values'))).toBe(true);
  });

  it('supports highLow (5~7) pipeline', () => {
    const verification = verifyPointValuesSubBandAnalysis('high');
    const highLow = verification.details.find((d) => d.subBand === 'highLow');

    expect(verification.allSupported).toBe(true);
    expect(highLow?.samplePointValues).toBe('56765');
    expect(highLow?.baseSequence.length).toBeGreaterThan(0);
    expect(highLow?.activeRules.length).toBeGreaterThan(0);
    expect(highLow?.digitHints).toEqual(expect.arrayContaining([5, 6, 7]));
  });

  it('scores 5 vs 6 vs 7 within highLow', () => {
    const result = analyzeMasterValue('00', '25676567');
    const filtered = filterPointValuesToSubBand(getSidePointValues(result, '', 'high'), 'highLow');
    const { baseSequence, tokens, rows } = analyzePointValuesPatterns(filtered, 'high');

    expect(filtered).toMatch(/^[567]+$/);
    expect(baseSequence.length).toBeGreaterThan(0);
    expect(rows.some((r) => r.values.length > 0)).toBe(true);

    const hints = tokens.flatMap((token) =>
      pointSequenceValueToDigitHints(token.value, 'highLow', token.sourceDigit),
    );
    expect(hints.map((h) => h.digit)).toEqual(expect.arrayContaining([5, 6, 7]));

    const { scores, digitReasons } = scoreDigitsFromPointValues(result, '', 'highLow');
    expect(scores[5]).toBeGreaterThan(0.1);
    expect(scores[6]).toBeGreaterThan(0.1);
    expect(scores[7]).toBeGreaterThan(0.1);
    expect(digitReasons.some((r) => r.includes('High Point Values'))).toBe(true);
  });

  it('supports highHigh (8~9) pipeline', () => {
    const verification = verifyPointValuesSubBandAnalysis('high');
    const highHigh = verification.details.find((d) => d.subBand === 'highHigh');

    expect(verification.allSupported).toBe(true);
    expect(highHigh?.samplePointValues).toBe('898');
    expect(highHigh?.digitHints).toEqual(expect.arrayContaining([8, 9]));
  });

  it('scores 8 vs 9 within highHigh', () => {
    const result = analyzeMasterValue('00', '5898989');
    const filtered = filterPointValuesToSubBand(getSidePointValues(result, '', 'high'), 'highHigh');

    expect(filtered).toMatch(/^[89]+$/);

    const { scores, digitReasons } = scoreDigitsFromPointValues(result, '', 'highHigh');
    expect(scores[8]).toBeGreaterThan(0.1);
    expect(scores[9]).toBeGreaterThan(0.1);
    expect(digitReasons.some((r) => r.includes('High Point Values'))).toBe(true);
  });
});

describe('pointValuesCodeFlow — integration', () => {
  it('buildSubBandPointValueCounts returns all 4 sub-band rule counts', () => {
    const master =
      '4901755008349411600466845711739664278210457455698714508283704651927' +
      '63359554428422214959275089154370873911038370854604626534097377';
    const result = analyzeMasterValue('00', master);
    const report = buildSubBandPointValueCounts(result, '');

    expect(report.details).toHaveLength(4);
    expect(report.details.every((d) => d.activeRules.length > 0)).toBe(true);
    for (const detail of report.details) {
      for (const rule of detail.activeRules) {
        expect(rule.count).toBe(rule.values.length);
        expect(rule.count).toBe(getPatternValuesMatchCount(rule.values));
      }
    }
    expect(report.lowComparison.scores.lowLow).toBeGreaterThan(0);
    expect(report.lowComparison.scores.lowHigh).toBeGreaterThan(0);
    expect(report.highComparison.scores.highLow).toBeGreaterThan(0);
    expect(report.highComparison.scores.highHigh).toBeGreaterThan(0);
    expect(['highLow', 'highHigh']).toContain(report.highComparison.selected);
  });

  it('buildStepSubBandLegacyDetails splits STEP2 into 0~1 and 2~4 with S′', () => {
    const result = analyzeMasterValue('00', '0012340123');
    const details = buildStepSubBandLegacyDetails(result, '', 'low');

    expect(details).toHaveLength(2);
    expect(details[0]?.subBand).toBe('lowLow');
    expect(details[1]?.subBand).toBe('lowHigh');
    expect(details[0]?.filteredPointValues).toMatch(/^[01]+$/);
    expect(details[1]?.filteredPointValues).toMatch(/^[234]+$/);
    expect(details[0]?.sPrimeSequence.length).toBeGreaterThan(0);
    expect(details[1]?.sPrimeSequence.length).toBeGreaterThan(0);
    expect(details[0]?.patterns.oneDuplicate.length + details[1]?.patterns.threeOrMore.length).toBeGreaterThanOrEqual(0);
  });

  it('buildStepSubBandLegacyDetails splits STEP3 into 5~7 and 8~9 with S′', () => {
    const result = analyzeMasterValue('00', '567898765');
    const details = buildStepSubBandLegacyDetails(result, '', 'high');

    expect(details).toHaveLength(2);
    expect(details[0]?.subBand).toBe('highLow');
    expect(details[1]?.subBand).toBe('highHigh');
    expect(details[0]?.filteredPointValues).toMatch(/^[567]+$/);
    expect(details[1]?.filteredPointValues).toMatch(/^[89]+$/);
  });

  it('uses Low Point Values when main band is low', () => {
    const result = analyzeMasterValue('00', '001234');
    const path = resolvePatternRecommendPath(result, '');

    expect(path.subBandReasons.some((r) => r.includes('②'))).toBe(true);
    expect(path.candidatePool.every((d) => d >= 0 && d <= 4)).toBe(true);
  });

  it('uses High Point Values when main band is high', () => {
    const result = analyzeMasterValue('00', '567898');
    const path = resolvePatternRecommendPath(result, '');

    if (path.targetMainBand === 'high') {
      expect(path.subBandReasons.some((r) => r.includes('②'))).toBe(true);
      expect(path.candidatePool.every((d) => d >= 5 && d <= 9)).toBe(true);
      expect(path.digitReasons.some((r) => r.includes('S″'))).toBe(true);
    }
  });
});

describe('pointValuesCodeFlow — pattern value must not become digit', () => {
  it('never maps pattern value 5 or 1 to digit without source digit', () => {
    expect(pointSequenceValueToDigitHints(5, 'highLow')).toEqual([]);
    expect(pointSequenceValueToDigitHints(1, 'lowLow')).toEqual([]);
    expect(pointSequenceValueToDigitHints(3, 'highLow')).toEqual([]);
  });

  it('never maps Code/Values pattern values to sub-band without source digit', () => {
    expect(pointSequenceValueToSubBandHints(3, 'high', undefined, { patternField: 'threeOrMore' })).toEqual([]);
    expect(pointSequenceValueToSubBandHints(5, 'high', undefined, { patternField: 'fiveOrMore' })).toEqual([]);
    expect(pointSequenceValueToSubBandHints(2, 'low', undefined, { patternField: 'commaAlpha_2_3' })).toEqual([]);
    expect(pointSequenceValueToSubBandHints(4, 'high', undefined, { patternField: 'plusAlpha_4_3' })).toEqual([]);
  });

  it('maps sub-band only via source digit for all pattern fields', () => {
    expect(pointSequenceValueToSubBandHints(3, 'high', 9, { patternField: 'threeOrMore' })).toEqual([
      { sub: 'highHigh', weight: 1 },
    ]);
    expect(pointSequenceValueToSubBandHints(2, 'low', 3, { patternField: 'commaAlpha_2_3' })).toEqual([
      { sub: 'lowHigh', weight: 1 },
    ]);
  });

  it('does not score threeOrMore/fiveOrMore/oneDuplicate values as digits', () => {
    const result = analyzeMasterValue('00', '567656567');
    const { digitReasons } = scoreDigitsFromPointValues(result, '', 'highLow');

    expect(digitReasons.some((r) => r.includes('3 이상 5 → digit 5'))).toBe(false);
    expect(digitReasons.some((r) => r.includes('5 이상 5 → digit 5'))).toBe(false);
    expect(digitReasons.some((r) => r.includes('1 중복') && r.includes('→ digit'))).toBe(false);
    expect(digitReasons.every((r) => r.includes('S″'))).toBe(true);
  });

  it('scores count fields on S″ only from run tokens (not singleton digits)', () => {
    const result = analyzeMasterValue('00', '5566775617');
    const { reasons, rows: _rows } = resolveSubBandFromPointValues(result, '6', 'high');

    expect(reasons.some((r) => r.includes('3 이상 5 판단'))).toBe(false);
    expect(reasons.some((r) => r.includes('5 이상 6 판단'))).toBe(false);
    expect(reasons.some((r) => r.includes('필터 S′'))).toBe(true);
  });

  it('still scores threeOrMore from run-length tokens on S″', () => {
    const result = analyzeMasterValue('00', '5555666777');
    const { reasons } = resolveSubBandFromPointValues(result, '', 'high');
    const report = buildSubBandPointValueCounts(result, '');

    expect(report.highComparison.scores.highLow).toBeGreaterThan(0);
    expect(reasons.some((r) => r.includes('3 이상') && r.includes('판단'))).toBe(true);
  });

  it('resolves duplicate S′ values to distinct source digits by occurrence', () => {
    const tokens = buildPointValueTokens('5577');
    const baseSequence = tokens.map((t) => t.value);
    expect(resolveSourceDigitForPatternValue(baseSequence, tokens, 2, 0)).toBe(7);
    expect(resolveSourceDigitForPatternValue(baseSequence, tokens, 2, 1)).toBe(5);
  });
});
