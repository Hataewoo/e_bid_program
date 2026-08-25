/**
 * Type-level separation: Master digits (0–9) vs Pattern Code Values (S′ run/marker counts).
 * PatternCodeValue must never be passed where MasterDigit is expected without explicit conversion.
 */

export type MasterDigit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** S′ sequence element — run length, marker index, repeat count (NOT a master digit). */
export type PatternCodeValue = number & { readonly __brand: 'PatternCodeValue' };

const MASTER_DIGITS = new Set<number>([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

export function isMasterDigit(n: number): n is MasterDigit {
  return Number.isInteger(n) && MASTER_DIGITS.has(n);
}

export function asMasterDigit(n: number): MasterDigit | null {
  return isMasterDigit(n) ? n : null;
}

export function asPatternCodeValue(n: number): PatternCodeValue {
  return n as PatternCodeValue;
}

export function masterDigitsZeroToNine(): readonly MasterDigit[] {
  return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
}
