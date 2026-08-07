import { describe, expect, it } from 'vitest';
import {
  buildLegacyPatternValueGrid,
  buildLegacyPointBandContent,
  buildLegacyStepPanelBands,
  legacyRemarkSuffix,
  parseLegacyCommaArray,
  resolveLegacyCodeObjectBase,
  searchValueResultDetailGrid,
  searchValueResultDuplicatArray,
  searchValueResultLH,
  shouldComputeLegacyCodeContent,
} from '@/shared/utils/legacyEmyoungAlgorithms';

describe('legacyEmyoungAlgorithms', () => {
  it('SearchValue_Result_LH — LOW digit < 5', () => {
    expect(searchValueResultLH('LOW', '5140', '5')).toBe('140');
    expect(searchValueResultLH('HIGH', '5140', '4')).toBe('5');
  });

  it('DetailGrid — object/base scan', () => {
    expect(searchValueResultDetailGrid('224242', '2', '4')).toEqual([2, 1, 1]);
  });

  it('resolveLegacyCodeObjectBase — 5-char specials', () => {
    expect(resolveLegacyCodeObjectBase('01234')).toEqual({ objectDigits: '01', baseDigits: '234' });
    expect(resolveLegacyCodeObjectBase('56789')).toEqual({ objectDigits: '567', baseDigits: '89' });
    expect(resolveLegacyCodeObjectBase('89657')).toEqual({ objectDigits: '89', baseDigits: '657' });
  });

  it('legacyRemarkSuffix + shouldComputeLegacyCodeContent', () => {
    expect(legacyRemarkSuffix('고점,저점')).toBe('저점');
    expect(legacyRemarkSuffix('고점,저점,고점')).toBe('고점');
    expect(shouldComputeLegacyCodeContent('고점,저점')).toBe(true);
    expect(shouldComputeLegacyCodeContent('고점,고점,고점,저점')).toBe(true);
  });

  it('parseLegacyCommaArray', () => {
    expect(parseLegacyCommaArray('1,2,3')).toEqual(['1', '2', '3']);
  });

  it('Duplicat first mode — 1 중복 row', () => {
    const out = searchValueResultDuplicatArray('first', '1,1,2,1,3', '1 중복', '');
    expect(out).toBe('2,1');
  });

  it('buildLegacyPatternValueGrid — 10 rows', () => {
    const grid = buildLegacyPatternValueGrid('1,2,1,3,2,1');
    expect(grid).toHaveLength(10);
    expect(grid[0]!.label).toBe('1 중복');
  });

  it('buildLegacyPointBandContent — STEP2 lowLow split (03441 → 1,1)', () => {
    const band = buildLegacyPointBandContent('03441', '01', '234');
    expect(band.content).toBe('1,1');
    expect(band.patternGrid).toHaveLength(10);
  });

  it('buildLegacyStepPanelBands — STEP2 primary/secondary', () => {
    const bands = buildLegacyStepPanelBands('03441', 'low');
    expect(bands.primaryBand.content).toBe('1,1');
    expect(bands.secondaryBand.content.length).toBeGreaterThan(0);
  });
});
