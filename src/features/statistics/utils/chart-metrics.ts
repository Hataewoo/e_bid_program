import type { FrequencyItem } from '../types/frequency.types';

export const LOW_DIGIT_MAX = 4;

export function isLowDigit(digit: number): boolean {
  return digit >= 0 && digit <= LOW_DIGIT_MAX;
}

export function barHeightPercent(count: number, maxCount: number, minPercent = 4): number {
  if (count <= 0 || maxCount <= 0) return 0;
  return Math.max(minPercent, Math.round((count / maxCount) * 100));
}

export function findModeItem(items: FrequencyItem[]): FrequencyItem | null {
  const ranked = [...items].sort((a, b) => b.count - a.count || a.digit - b.digit);
  return ranked[0]?.count > 0 ? ranked[0] : null;
}

export function maxFrequencyCount(items: FrequencyItem[]): number {
  return Math.max(...items.map((item) => item.count), 1);
}
