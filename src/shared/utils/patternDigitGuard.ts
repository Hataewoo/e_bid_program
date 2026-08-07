import type { DigitBand, DigitSubBand } from './digitSubBand';
import { getDigitSubBand, getSubBandMainBand } from './digitSubBand';

/** run길이·1중복·3이상·5이상 — digit/가격 추천에 패턴 Values 직접 사용 금지 */
export const PATTERN_COUNT_FIELDS = new Set([
  'oneDuplicate',
  'threeOrMore',
  'fiveOrMore',
]);

/** Code/Values 10규칙 — Values는 S′ run·인덱스·마커 (digit 아님) */
export const CODE_VALUE_PATTERN_FIELDS = new Set([
  'oneDuplicate',
  'commaAlpha_2_3',
  'plusAlpha_3_2',
  'plusAlpha_4_3',
  'plusAlpha_4_4',
  'threeOrMore',
  'fiveOrMore',
  'oneBetween',
  'alphaPlus_3_2',
  'alphaPlus_4_3',
]);

export function isPatternCountField(field: string | undefined): boolean {
  return field !== undefined && PATTERN_COUNT_FIELDS.has(field);
}

export function isCodeValuePatternField(field: string | undefined): boolean {
  return field !== undefined && CODE_VALUE_PATTERN_FIELDS.has(field);
}

/** Master source digit만 digit 후보로 — 패턴 value(run길이·중복횟수)는 절대 반환하지 않음 */
export function digitHintsFromMasterSource(
  sourceDigit: number | undefined | null,
  pool: readonly number[],
): Array<{ digit: number; weight: number }> {
  if (sourceDigit === undefined || sourceDigit === null) return [];
  if (!Number.isInteger(sourceDigit)) return [];
  if (!pool.includes(sourceDigit)) return [];
  return [{ digit: sourceDigit, weight: 1 }];
}

/** Code/Values·S′ run 값 → 세부 구간 — source digit만 (패턴 value 직접 매핑 금지) */
export function subBandHintsFromSourceDigit(
  sourceDigit: number | undefined | null,
  mainBand: DigitBand,
): Array<{ sub: DigitSubBand; weight: number }> {
  if (sourceDigit === undefined || sourceDigit === null) return [];
  if (!Number.isInteger(sourceDigit)) return [];
  const sub = getDigitSubBand(sourceDigit);
  if (!sub || getSubBandMainBand(sub) !== mainBand) return [];
  return [{ sub, weight: 1 }];
}

/** S/run 패턴 값(0~9)을 digit으로 쓰지 않도록 차단 — legacy phase·predictor용 */
export function pickBalancedDigitAvoidingPatternValue(
  patternValue: number,
  slotIndex: number,
  prefix: string,
  used: ReadonlySet<number>,
  order: readonly number[],
  options: {
    maxStreak?: number;
    trailingSame: (prefix: string) => number;
    wouldRepeat: (prefix: string, digit: number) => boolean;
    isOverused: (prefix: string, digit: number) => boolean;
  },
): number | null {
  void patternValue;
  void slotIndex;
  const last = prefix.length > 0 ? Number(prefix[prefix.length - 1]) : null;
  const maxStreak = options.maxStreak ?? 1;

  for (const digit of order) {
    if (used.has(digit)) continue;
    if (options.wouldRepeat(prefix, digit)) continue;
    if (options.isOverused(prefix, digit)) continue;
    if (digit === last && options.trailingSame(prefix) >= maxStreak) continue;
    return digit;
  }

  return order.find((d) => !used.has(d)) ?? null;
}

/** Point Value 토큰 → digit (sourceDigit만) */
export function digitHintsFromPointValueToken(
  token: { sourceDigit: number; isRun?: boolean },
  pool: readonly number[],
): Array<{ digit: number; weight: number }> {
  return digitHintsFromMasterSource(token.sourceDigit, pool);
}
