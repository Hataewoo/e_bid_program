import { describe, expect, it } from 'vitest';
import {
  buildLegacyCodeContentRow,
  buildLegacyCodeContentRows,
  computeLegacyGapSequence,
  computeLegacyTokenGapSequence,
  descriptionToSubBandSequence,
  findDigitPatternStarts,
  findSubBandSequenceStarts,
  findTokenSubBandSequenceStarts,
} from '@/shared/utils/legacyCodeContentEngine';
import { LEGACY_STEP2_CODE_ORDER } from '@/shared/fixtures/legacy-step-code-catalog';
import { analyzeMasterValue } from '@/shared/utils/analysisEngine';
import type { CodeMatchInput } from '@/shared/utils/analysisEngine';

const code = (c: string, type: string, description: string): CodeMatchInput => ({
  id: 1,
  code: c,
  type,
  description,
});

describe('legacyCodeContentEngine', () => {
  it('maps description 저점/고점 to STEP2 sub-bands', () => {
    expect(descriptionToSubBandSequence('저점,고점,저점', 'low')).toEqual([
      'lowLow',
      'lowHigh',
      'lowLow',
    ]);
    expect(descriptionToSubBandSequence('고점,저점', 'low')).toEqual(['lowHigh', 'lowLow']);
  });

  it('maps description to STEP3 sub-bands', () => {
    expect(descriptionToSubBandSequence('저점,고점', 'high')).toEqual(['highLow', 'highHigh']);
  });

  it('finds sub-band sequence matches in low point values', () => {
    const starts = findSubBandSequenceStarts('031031', ['lowLow', 'lowHigh', 'lowLow']);
    expect(starts).toEqual([0, 3]);
  });

  it('finds digit pattern matches', () => {
    expect(findDigitPatternStarts('22342341234', '234')).toEqual([1, 4, 8]);
  });

  it('computes S′ token gaps between matches', () => {
    const gaps = computeLegacyGapSequence('22342341234', [2, 4, 7], 3);
    expect(gaps.length).toBe(2);
    expect(gaps.every((g) => g >= 1)).toBe(true);
  });

  it('builds DetailGrid content row for code 234', () => {
    const row = buildLegacyCodeContentRow(
      '2242423434',
      code('234', '저점', '저점,고점,저점'),
      'low',
    );
    expect(row.matchKind).toBe('detailGrid');
    expect(row.gaps.length).toBeGreaterThan(0);
    expect(row.content).toMatch(/^\d+(,\d+)*$/);
  });

  it('counts run tokens between overlapping S′ matches for gaps', () => {
    const pointValues = '040020314';
    const starts = findTokenSubBandSequenceStarts(pointValues, ['lowLow', 'lowHigh', 'lowLow']);
    expect(starts.length).toBeGreaterThanOrEqual(2);
    expect(computeLegacyTokenGapSequence(pointValues, starts, 3)[0]).toBe(1);
  });

  it('DetailGrid row uses remark suffix gate', () => {
    const row = buildLegacyCodeContentRow(
      '224242',
      code('234', '저점', '저점,고점,저점'),
      'low',
    );
    expect(row.matchKind).toBe('detailGrid');
    expect(row.gaps.length).toBeGreaterThan(0);
  });

  it('uses catalog description when DB code is missing', () => {
    const row = buildLegacyCodeContentRow('2242423434', code('234', '', ''), 'low');
    expect(row.matchKind).toBe('detailGrid');
    expect(row.gaps.length).toBeGreaterThan(0);
    expect(row.content).not.toBe('');
  });

  it('returns empty when remark suffix is not 저점/고점', () => {
    const row = buildLegacyCodeContentRow(
      '2242423434',
      code('234', '저점', '저점,고'),
      'low',
    );
    expect(row.content).toBe('');
    expect(row.gaps).toEqual([]);
  });

  it('STEP2 returns fixed 13 codes in legacy order', () => {
    const result = analyzeMasterValue('00', '0310234012');
    const rows = buildLegacyCodeContentRows(
      result,
      [code('234', '저점', '저점,고점,저점')],
      'low',
      { codeOrder: LEGACY_STEP2_CODE_ORDER },
    );
    expect(rows).toHaveLength(13);
    expect(rows.map((r) => r.code)).toEqual([...LEGACY_STEP2_CODE_ORDER]);
  });

  it('includes catalog-backed content rows when DB codes are empty', () => {
    const result = analyzeMasterValue('00', '0310234023');
    const rows = buildLegacyCodeContentRows(result, [], 'low', {
      codeOrder: LEGACY_STEP2_CODE_ORDER,
    });
    expect(rows).toHaveLength(13);
    const row234 = rows.find((r) => r.code === '234');
    expect(row234?.gaps.length).toBeGreaterThan(0);
    expect(row234?.content).not.toBe('');
  });
});
