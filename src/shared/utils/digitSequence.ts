/** 공유 숫자열 유틸 — Analysis Engine · Reverse Engineering 공통 */

export function extractDigits(value: string): string {
  if (!value || typeof value !== 'string') return '';
  return value.replace(/\D/g, '');
}

export function extractLowPart(value: string): string {
  return extractDigits(value)
    .split('')
    .filter((ch) => {
      const digit = Number(ch);
      return Number.isInteger(digit) && digit >= 0 && digit <= 4;
    })
    .join('');
}

export function extractHighPart(value: string): string {
  return extractDigits(value)
    .split('')
    .filter((ch) => {
      const digit = Number(ch);
      return Number.isInteger(digit) && digit >= 5 && digit <= 9;
    })
    .join('');
}

export function parseDigitArray(value: string): number[] {
  return extractDigits(value)
    .split('')
    .map((ch) => Number(ch))
    .filter((digit) => Number.isInteger(digit) && digit >= 0 && digit <= 9);
}
