/** 0~4 저점, 5~9 고점 */
export type DigitBand = 'low' | 'high';

/** 저점의 저점 0~1 · 저점의 고점 2~4 · 고점의 저점 5~7 · 고점의 고점 8~9 */
export type DigitSubBand = 'lowLow' | 'lowHigh' | 'highLow' | 'highHigh';

const SUB_BAND_DIGITS: Record<DigitSubBand, readonly number[]> = {
  lowLow: [0, 1],
  lowHigh: [2, 3, 4],
  highLow: [5, 6, 7],
  highHigh: [8, 9],
};

/** 같은 대역(저/고) 안에서 짝을 이루는 세부 구간 */
const OPPOSITE_SUB_IN_MAIN: Record<DigitSubBand, DigitSubBand> = {
  lowLow: 'lowHigh',
  lowHigh: 'lowLow',
  highLow: 'highHigh',
  highHigh: 'highLow',
};

const DEFAULT_SUB_IN_MAIN: Record<DigitBand, DigitSubBand> = {
  low: 'lowHigh',
  high: 'highLow',
};

export function getDigitBand(digit: number): DigitBand | null {
  if (!Number.isInteger(digit) || digit < 0 || digit > 9) return null;
  return digit <= 4 ? 'low' : 'high';
}

export function getOppositeBand(band: DigitBand): DigitBand {
  return band === 'low' ? 'high' : 'low';
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

export function getOppositeSubBandInMain(sub: DigitSubBand): DigitSubBand {
  return OPPOSITE_SUB_IN_MAIN[sub];
}

export function getDigitsInSubBand(sub: DigitSubBand): readonly number[] {
  return SUB_BAND_DIGITS[sub];
}

export function isDigitInSubBand(digit: number, sub: DigitSubBand): boolean {
  return SUB_BAND_DIGITS[sub].includes(digit);
}

/** prefix → master 순으로 거슬러 해당 세부 구간의 가장 최근 숫자 */
export function findMostRecentDigitInSubBand(
  prefix: string,
  masterDigits: string,
  sub: DigitSubBand,
): number | null {
  for (let i = prefix.length - 1; i >= 0; i -= 1) {
    const digit = Number(prefix[i]);
    if (!Number.isInteger(digit) || digit < 0 || digit > 9) continue;
    if (isDigitInSubBand(digit, sub)) return digit;
  }

  for (let i = masterDigits.length - 1; i >= 0; i -= 1) {
    const digit = Number(masterDigits[i]);
    if (!Number.isInteger(digit) || digit < 0 || digit > 9) continue;
    if (isDigitInSubBand(digit, sub)) return digit;
  }

  return null;
}

/**
 * 세부 구간 확정 후 최종 숫자 후보
 * - 2개 구간(0~1, 8~9): 최근 숫자의 반대 1개
 * - 3개 구간(2~4, 5~7): 최근 숫자 제외 후 남은 2개 (점수로 1순위 결정)
 */
export function resolveTargetDigitsInSubBand(
  sub: DigitSubBand,
  prefix: string,
  masterDigits: string,
): readonly number[] {
  const all = getDigitsInSubBand(sub);
  const recent = findMostRecentDigitInSubBand(prefix, masterDigits, sub);

  if (recent === null) return all;

  if (all.length === 2) {
    const opposite = all.find((d) => d !== recent);
    return opposite !== undefined ? [opposite] : all;
  }

  const remaining = all.filter((d) => d !== recent);
  return remaining.length > 0 ? remaining : all;
}

export function resolveTargetDigitsFromReference(
  prefix: string,
  masterDigits: string,
): readonly number[] | null {
  const sub = resolveTargetSubBandFromReference(prefix, masterDigits);
  if (sub === null) return null;
  return resolveTargetDigitsInSubBand(sub, prefix, masterDigits);
}

/** prefix → master 순으로 거슬러 해당 대역(저/고)의 가장 최근 숫자 */
export function findMostRecentDigitInMainBand(
  prefix: string,
  masterDigits: string,
  mainBand: DigitBand,
): number | null {
  for (let i = prefix.length - 1; i >= 0; i -= 1) {
    const digit = Number(prefix[i]);
    if (!Number.isInteger(digit) || digit < 0 || digit > 9) continue;
    if (getDigitBand(digit) === mainBand) return digit;
  }

  for (let i = masterDigits.length - 1; i >= 0; i -= 1) {
    const digit = Number(masterDigits[i]);
    if (!Number.isInteger(digit) || digit < 0 || digit > 9) continue;
    if (getDigitBand(digit) === mainBand) return digit;
  }

  return null;
}

export function resolveTargetMainBandForPosition(decimalPosition: number): DigitBand {
  return decimalPosition % 2 === 1 ? 'low' : 'high';
}

export function resolveTargetSubBandForMainBand(
  targetMainBand: DigitBand,
  prefix: string,
  masterDigits: string,
): DigitSubBand {
  const recentInTargetBand = findMostRecentDigitInMainBand(prefix, masterDigits, targetMainBand);

  if (recentInTargetBand !== null) {
    const recentSub = getDigitSubBand(recentInTargetBand);
    if (recentSub !== null && getSubBandMainBand(recentSub) === targetMainBand) {
      return getOppositeSubBandInMain(recentSub);
    }
  }

  return DEFAULT_SUB_IN_MAIN[targetMainBand];
}

/** 자리별 고정 대역 — 1·3·5… 저점, 2·4·6… 고점 + 최근 숫자 세부 구간 반대 */
export function resolveTargetSubBandForPosition(
  decimalPosition: number,
  prefix: string,
  masterDigits: string,
): DigitSubBand {
  const targetMainBand = resolveTargetMainBandForPosition(decimalPosition);
  return resolveTargetSubBandForMainBand(targetMainBand, prefix, masterDigits);
}

/**
 * 입력 없음 → Master 직전 숫자 기준 저↔고 교차
 * 입력 있음 → 자리 번호 기준 (홀수 저점 · 짝수 고점)
 */
export function resolveTargetMainBandFromReference(
  prefix: string,
  masterDigits: string,
): DigitBand {
  if (prefix.length === 0 && masterDigits.length > 0) {
    const last = Number(masterDigits[masterDigits.length - 1]);
    const lastBand = getDigitBand(last);
    if (lastBand === 'low') return 'high';
    if (lastBand === 'high') return 'low';
  }
  return resolveTargetMainBandForPosition(prefix.length + 1);
}

export function resolveTargetSubBandFromReference(
  prefix: string,
  masterDigits: string,
): DigitSubBand | null {
  const targetMainBand = resolveTargetMainBandFromReference(prefix, masterDigits);
  return resolveTargetSubBandForMainBand(targetMainBand, prefix, masterDigits);
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
