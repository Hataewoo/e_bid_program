/** 0~4 저점, 5~9 고점 */
export type DigitBand = 'low' | 'high';

const MAIN_BAND_DIGITS: Record<DigitBand, readonly number[]> = {
  low: [0, 1, 2, 3, 4],
  high: [5, 6, 7, 8, 9],
};

/** 저점의 저점 0~1 · 저점의 고점 2~4 · 고점의 저점 5~7 · 고점의 고점 8~9 */
export type DigitSubBand = 'lowLow' | 'lowHigh' | 'highLow' | 'highHigh';

const SUB_BAND_DIGITS: Record<DigitSubBand, readonly number[]> = {
  lowLow: [0, 1],
  lowHigh: [2, 3, 4],
  highLow: [5, 6, 7],
  highHigh: [8, 9],
};

export function getDigitBand(digit: number): DigitBand | null {
  if (!Number.isInteger(digit) || digit < 0 || digit > 9) return null;
  return digit <= 4 ? 'low' : 'high';
}

export function getDigitSubBand(digit: number): DigitSubBand | null {
  if (!Number.isInteger(digit) || digit < 0 || digit > 9) return null;
  if (digit <= 1) return 'lowLow';
  if (digit <= 4) return 'lowHigh';
  if (digit <= 7) return 'highLow';
  return 'highHigh';
}

export function getSubBandMainBand(sub: DigitSubBand): DigitBand {
  return sub === 'lowLow' || sub === 'lowHigh' ? 'low' : 'high';
}

export function getDigitsInSubBand(sub: DigitSubBand): readonly number[] {
  return SUB_BAND_DIGITS[sub];
}

export function getDigitsInMainBand(band: DigitBand): readonly number[] {
  return MAIN_BAND_DIGITS[band];
}

export function isDigitInSubBand(digit: number, sub: DigitSubBand): boolean {
  return SUB_BAND_DIGITS[sub].includes(digit);
}

export function getMainBandLabel(band: DigitBand): string {
  return band === 'low' ? '저점(0~4)' : '고점(5~9)';
}

export function getSubBandLabel(sub: DigitSubBand): string {
  switch (sub) {
    case 'lowLow':
      return '저점의 저점(0~1)';
    case 'lowHigh':
      return '저점의 고점(2~4)';
    case 'highLow':
      return '고점의 저점(5~7)';
    case 'highHigh':
      return '고점의 고점(8~9)';
  }
}
