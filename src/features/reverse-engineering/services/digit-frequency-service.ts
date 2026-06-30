import type { DigitFrequency, Step1Result } from '../types/analysis.types';
import { parseDigitArray } from '@/shared/utils/digitSequence';

function emptyFrequency(): DigitFrequency {
  return { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0, '8': 0, '9': 0 };
}

function ratio(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 10000) / 10000;
}

export class DigitFrequencyService {
  analyze(value: string): Step1Result {
    const digits = parseDigitArray(value);
    const length = digits.length;
    const frequency = emptyFrequency();

    let evenCount = 0;
    let oddCount = 0;
    let lowCount = 0;
    let highCount = 0;

    for (const d of digits) {
      frequency[String(d) as keyof DigitFrequency]++;
      if (d % 2 === 0) evenCount++;
      else oddCount++;
      if (d <= 4) lowCount++;
      else highCount++;
    }

    const duplicateCount = Object.values(frequency).reduce(
      (sum, count) => sum + (count > 1 ? count - 1 : 0),
      0,
    );

    let consecutiveCount = 0;
    for (let i = 0; i < digits.length - 1; i++) {
      if (digits[i + 1] === digits[i] + 1) {
        consecutiveCount++;
      }
    }

    return {
      length,
      frequency,
      evenCount,
      oddCount,
      lowCount,
      highCount,
      evenRatio: ratio(evenCount, length),
      oddRatio: ratio(oddCount, length),
      lowRatio: ratio(lowCount, length),
      highRatio: ratio(highCount, length),
      duplicateCount,
      consecutiveCount,
    };
  }
}

export const digitFrequencyService = new DigitFrequencyService();
