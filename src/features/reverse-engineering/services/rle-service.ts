import type { RLEEntry } from '../types/analysis.types';

export class RLEService {
  encode(value: string): RLEEntry[] {
    const digits = value
      .replace(/\s/g, '')
      .split('')
      .filter((c) => /\d/.test(c))
      .map((c) => parseInt(c, 10));

    if (digits.length === 0) return [];

    const result: RLEEntry[] = [];
    let currentDigit = digits[0];
    let count = 1;

    for (let i = 1; i < digits.length; i++) {
      if (digits[i] === currentDigit) {
        count++;
      } else {
        result.push({ digit: currentDigit, count });
        currentDigit = digits[i];
        count = 1;
      }
    }
    result.push({ digit: currentDigit, count });

    return result;
  }

  toCounts(rle: RLEEntry[]): number[] {
    return rle.map((entry) => entry.count);
  }
}

export const rleService = new RLEService();
