/** 레거시 마스터 화면처럼 숫자 사이 공백 없이 화면 너비에 맞춰 줄바꿈만 적용 */

export const DIGIT_DISPLAY_FONT_PX = 20;

const MIN_CHARS_PER_LINE = 24;

/** 모노스페이스(Consolas) 기준 대략적인 문자 폭 (px) */
function charWidthPx(fontSizePx: number): number {
  return fontSizePx * 0.6;
}

/** 컨테이너 너비에 맞는 한 줄 자릿수 — 전체화면 시 상한 없이 너비만큼 사용 */
export function charsPerLine(
  containerWidthPx: number,
  fontSizePx = DIGIT_DISPLAY_FONT_PX,
  paddingPx = 24,
): number {
  if (containerWidthPx <= 0) return 42;
  const available = Math.max(0, containerWidthPx - paddingPx);
  const count = Math.floor(available / charWidthPx(fontSizePx));
  return Math.max(MIN_CHARS_PER_LINE, count);
}

/** 공백·줄바꿈 없이 연속 숫자 — 화면 너비마다 줄만 나눔 */
export function formatDigitsForDisplay(
  digits: string,
  containerWidthPx: number,
  fontSizePx = DIGIT_DISPLAY_FONT_PX,
): string {
  if (!digits) return '';
  const lineLen = charsPerLine(containerWidthPx, fontSizePx);
  const lines: string[] = [];
  for (let i = 0; i < digits.length; i += lineLen) {
    lines.push(digits.slice(i, i + lineLen));
  }
  return lines.join('\n');
}

export interface DigitDisplayLine {
  text: string;
  startIndex: number;
}

/** 하이라이트 등 문자 단위 렌더링용 — 줄 단위 연속 문자열 */
export function buildDigitDisplayLines(
  digits: string,
  containerWidthPx: number,
  fontSizePx = DIGIT_DISPLAY_FONT_PX,
): DigitDisplayLine[] {
  if (!digits) return [];
  const lineLen = charsPerLine(containerWidthPx, fontSizePx);
  const lines: DigitDisplayLine[] = [];
  for (let i = 0; i < digits.length; i += lineLen) {
    lines.push({ text: digits.slice(i, i + lineLen), startIndex: i });
  }
  return lines;
}
