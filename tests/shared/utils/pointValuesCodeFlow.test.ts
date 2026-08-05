import { describe, expect, it } from 'vitest';
import { analyzeMasterValue } from '@/shared/utils/analysisEngine';
import {
  analyzePointValuesPatterns,
  buildPointValuesSequence,
  filterPointValuesToSubBand,
  getSidePointValues,
  pointSequenceValueToDigitHints,
  pointSequenceValueToSubBandHints,
  resolveSubBandFromPointValues,
  scoreDigitsFromPointValues,
  verifyPointValuesSubBandAnalysis,
} from '@/shared/utils/pointValuesCodeFlow';
import { resolvePatternRecommendationPath } from '@/shared/utils/codeValueFlowEngine';

describe('pointValuesCodeFlow — low band', () => {
  it('builds S′ from Low Point Values with singleton digits 0~4', () => {
    expect(buildPointValuesSequence('01234')).toEqual([0, 1, 2, 3, 4]);
    expect(buildPointValuesSequence('001')).toEqual([2, 1]);
  });

  it('maps S′ digits to sub-bands for low band', () => {
    expect(pointSequenceValueToSubBandHints(0, 'low')).toEqual([{ sub: 'lowLow', weight: 1 }]);
    expect(pointSequenceValueToSubBandHints(1, 'low')).toEqual([{ sub: 'lowLow', weight: 1 }]);
    expect(pointSequenceValueToSubBandHints(3, 'low')).toEqual([{ sub: 'lowHigh', weight: 1 }]);
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

  it('maps S′ digits to sub-bands for high band', () => {
    expect(pointSequenceValueToSubBandHints(6, 'high')).toEqual([{ sub: 'highLow', weight: 1 }]);
    expect(pointSequenceValueToSubBandHints(8, 'high')).toEqual([{ sub: 'highHigh', weight: 1 }]);
    expect(pointSequenceValueToSubBandHints(9, 'high')).toEqual([{ sub: 'highHigh', weight: 1 }]);
  });

  it('resolves highLow vs highHigh from High Point Values', () => {
    const result = analyzeMasterValue('00', '5678989');
    const { sub, reasons } = resolveSubBandFromPointValues(result, '', 'high');

    expect(['highLow', 'highHigh']).toContain(sub);
    expect(reasons.some((r) => r.includes('High Point Values S′'))).toBe(true);
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
    const { baseSequence, rows } = analyzePointValuesPatterns(filtered, 'high');

    expect(filtered).toMatch(/^[567]+$/);
    expect(baseSequence.length).toBeGreaterThan(0);
    expect(rows.some((r) => r.values.length > 0)).toBe(true);

    const hints = baseSequence.flatMap((v) => pointSequenceValueToDigitHints(v, 'highLow'));
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
  it('uses Low Point Values when main band is low', () => {
    const result = analyzeMasterValue('00', '001234');
    const path = resolvePatternRecommendationPath(result, '', 'full');

    expect(path.subBandReasons.some((r) => r.includes('Low Point Values'))).toBe(true);
    expect(path.candidatePool.every((d) => d >= 0 && d <= 4)).toBe(true);
  });

  it('uses High Point Values when main band is high', () => {
    const result = analyzeMasterValue('00', '567898');
    const path = resolvePatternRecommendationPath(result, '', 'full');

    if (path.targetMainBand === 'high') {
      expect(path.subBandReasons.some((r) => r.includes('High Point Values'))).toBe(true);
      expect(path.candidatePool.every((d) => d >= 5 && d <= 9)).toBe(true);
      expect(path.digitReasons.some((r) => r.includes('High Point Values'))).toBe(true);
    }
  });
});
