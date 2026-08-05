/** UI·reasons용 S′/S″ 꼬리 표시 길이 */
export const RECENT_DISPLAY_TAIL = 12;

/** 추천층 digit 점수 — Point Values S″ 최근 N토큰만 (판단층은 Master 전체) */
export const RECENT_DIGIT_SCORE_TAIL = 12;

export function sliceRecentDigitScoreTail<T>(
  arr: readonly T[],
  tail = RECENT_DIGIT_SCORE_TAIL,
): T[] {
  if (arr.length <= tail) return [...arr];
  return arr.slice(-tail);
}

/** run suffix 패턴 길이 상한 (연속 run 구간) */
export const RUN_SUFFIX_MATCH_MAX = 8;

/** 선택 Master Value 전체 시퀀스 — lookback 잘라내지 않음 */
export function fullMasterSequence<T>(arr: readonly T[]): T[] {
  return [...arr];
}

/** @deprecated fullMasterSequence — Master 전체 사용 */
export function sliceRecentTail<T>(arr: readonly T[], lookback?: number): T[] {
  void lookback;
  return fullMasterSequence(arr);
}

/** @deprecated Master 전체 사용 — tailSize 제한 없음 */
export function clampRecentLookback(lookback?: number): number {
  void lookback;
  return Number.MAX_SAFE_INTEGER;
}

/** @deprecated fullMasterSequence */
export const useFullMasterSequence = fullMasterSequence;
