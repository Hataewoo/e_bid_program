import { extractLowPart, extractHighPart, parseDigitArray } from '@/shared/utils/digitSequence';

export class GroupingService {
  extractLowPart(value: string): string {
    return extractLowPart(value);
  }

  extractHighPart(value: string): string {
    return extractHighPart(value);
  }

  findConsecutiveGroups(value: string): string[] {
    const digits = parseDigitArray(value).map(String);

    if (digits.length === 0) return [];

    const groups: string[] = [];
    let current = digits[0];

    for (let i = 1; i < digits.length; i++) {
      if (digits[i] === current[0]) {
        current += digits[i];
      } else {
        groups.push(current);
        current = digits[i];
      }
    }
    groups.push(current);

    return groups;
  }
}

export const groupingService = new GroupingService();
