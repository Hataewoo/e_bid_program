import { describe, expect, it } from 'vitest';
import {
  findMostRecentDigitInMainBand,
  findMostRecentDigitInSubBand,
  getDigitSubBand,
  getDigitsInSubBand,
  getOppositeSubBandInMain,
  resolveTargetDigitsInSubBand,
  resolveTargetMainBandForPosition,
  resolveTargetMainBandFromReference,
  resolveTargetSubBandForPosition,
  resolveTargetSubBandFromReference,
} from '@/shared/utils/digitSubBand';

describe('digitSubBand', () => {
  it('classifies four sub-bands', () => {
    expect(getDigitSubBand(0)).toBe('lowLow');
    expect(getDigitSubBand(1)).toBe('lowLow');
    expect(getDigitSubBand(3)).toBe('lowHigh');
    expect(getDigitSubBand(6)).toBe('highLow');
    expect(getDigitSubBand(9)).toBe('highHigh');
  });

  it('alternates within same main band', () => {
    expect(getOppositeSubBandInMain('lowLow')).toBe('lowHigh');
    expect(getOppositeSubBandInMain('lowHigh')).toBe('lowLow');
    expect(getOppositeSubBandInMain('highLow')).toBe('highHigh');
    expect(getOppositeSubBandInMain('highHigh')).toBe('highLow');
  });

  it('fixes main band by decimal position when input exists', () => {
    expect(resolveTargetMainBandForPosition(1)).toBe('low');
    expect(resolveTargetMainBandForPosition(2)).toBe('high');
    expect(resolveTargetMainBandForPosition(3)).toBe('low');
    expect(resolveTargetMainBandFromReference('0', '123456')).toBe('high');
    expect(resolveTargetMainBandFromReference('05', '123456')).toBe('low');
  });

  it('uses master last digit when input is empty', () => {
    expect(resolveTargetMainBandFromReference('', '123456')).toBe('low');
    expect(resolveTargetMainBandFromReference('', '123454')).toBe('high');
  });

  it('finds most recent digit in main band from prefix then master', () => {
    expect(findMostRecentDigitInMainBand('16', '123456', 'low')).toBe(1);
    expect(findMostRecentDigitInMainBand('6', '123456', 'low')).toBe(4);
    expect(findMostRecentDigitInMainBand('', '123456', 'high')).toBe(6);
  });

  it('empty input after high master tail targets low sub-band', () => {
    expect(resolveTargetSubBandFromReference('', '123456')).toBe('lowLow');
  });

  it('empty input after low master tail targets high sub-band', () => {
    expect(resolveTargetSubBandFromReference('', '123454')).toBe('highHigh');
  });

  it('position 2 with input targets high sub-band from recent high', () => {
    expect(resolveTargetSubBandForPosition(2, '0', '123456')).toBe('highHigh');
    expect(resolveTargetSubBandFromReference('0', '123456')).toBe('highHigh');
  });

  it('position 3 targets low after two digits entered', () => {
    expect(resolveTargetSubBandForPosition(3, '05', '123456')).toBe('lowHigh');
  });

  it('lists digits in sub-band', () => {
    expect(getDigitsInSubBand('lowLow')).toEqual([0, 1]);
    expect(getDigitsInSubBand('highLow')).toEqual([5, 6, 7]);
  });

  it('picks opposite digit in pair sub-band', () => {
    expect(resolveTargetDigitsInSubBand('lowLow', '', '101')).toEqual([0]);
    expect(resolveTargetDigitsInSubBand('lowLow', '', '100')).toEqual([1]);
    expect(resolveTargetDigitsInSubBand('highHigh', '8', '123456')).toEqual([9]);
  });

  it('excludes recent digit in triple sub-band', () => {
    expect(findMostRecentDigitInSubBand('', '123243', 'lowHigh')).toBe(3);
    expect(resolveTargetDigitsInSubBand('lowHigh', '', '123243')).toEqual([2, 4]);
    expect(resolveTargetDigitsInSubBand('highLow', '', '567657')).toEqual([5, 6]);
  });
});
