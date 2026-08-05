import { describe, expect, it } from 'vitest';
import {
  getDigitSubBand,
  getDigitsInSubBand,
  getSubBandLabel,
} from '@/shared/utils/digitSubBand';

describe('digitSubBand', () => {
  it('classifies four sub-bands', () => {
    expect(getDigitSubBand(0)).toBe('lowLow');
    expect(getDigitSubBand(1)).toBe('lowLow');
    expect(getDigitSubBand(3)).toBe('lowHigh');
    expect(getDigitSubBand(6)).toBe('highLow');
    expect(getDigitSubBand(9)).toBe('highHigh');
  });

  it('lists digits per sub-band', () => {
    expect(getDigitsInSubBand('lowLow')).toEqual([0, 1]);
    expect(getDigitsInSubBand('highHigh')).toEqual([8, 9]);
  });

  it('provides Korean labels', () => {
    expect(getSubBandLabel('lowLow')).toContain('0~1');
    expect(getSubBandLabel('highHigh')).toContain('8~9');
  });
});
