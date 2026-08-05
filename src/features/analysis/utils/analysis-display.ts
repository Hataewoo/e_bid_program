import { classifyChar } from '@/shared/utils/analysisEngine';
import { translate } from '@/i18n/translate';

/** UI textarea 렌더 상한 — 초과분은 Raw Data/Export로 확인 */
export const MASTER_VALUE_DISPLAY_CAP = 24_000;

export function chunkDigits(digits: string, size = 80): string {
  if (!digits) return '';
  const lines: string[] = [];
  for (let i = 0; i < digits.length; i += size) {
    lines.push(digits.slice(i, i + size));
  }
  return lines.join('\n');
}

export function filterDigitsByClass(digits: string, cls: 'low' | 'high'): string {
  let out = '';
  for (let i = 0; i < digits.length; i += 1) {
    const ch = digits[i] ?? '';
    if (classifyChar(ch) === cls) out += ch;
  }
  return out;
}

export function formatPatternValues(values: number[]): string {
  if (values.length === 0) return '-';
  return values.join(',');
}

/** Values 미리보기 — 건수는 항상 배열 길이, 화면에는 일부만 표시 */
export function formatPatternValuesPreview(
  values: readonly number[],
  maxVisible = 24,
): { text: string; matchCount: number } {
  const matchCount = values.length;
  if (matchCount === 0) return { text: '-', matchCount: 0 };
  if (matchCount <= maxVisible) {
    return { text: formatPatternValues([...values]), matchCount };
  }
  const head = values.slice(0, maxVisible).join(',');
  return { text: `${head} … (+${matchCount - maxVisible})`, matchCount };
}

/** UI에 표시할 run 시퀀스 — 한 줄당 숫자 개수 */
const RUN_LENGTH_DISPLAY_CHUNK = 36;

/** STEP2/3 — 저·고점 교차 run 연속 횟수 (Code Value 1단계) */
export function formatRunLengthSequence(lengths: number[]): string {
  if (lengths.length === 0) return '';
  const parts = lengths.map(String);
  const lines: string[] = [];
  for (let i = 0; i < parts.length; i += RUN_LENGTH_DISPLAY_CHUNK) {
    lines.push(parts.slice(i, i + RUN_LENGTH_DISPLAY_CHUNK).join(', '));
  }
  return lines.join('\n');
}

export function formatMasterValueForDisplay(
  digits: string,
  options: { chunkSize?: number; maxChars?: number; showFull?: boolean } = {},
): { text: string; truncated: boolean; totalLength: number } {
  const { chunkSize = 80, maxChars = MASTER_VALUE_DISPLAY_CAP, showFull = false } = options;
  const totalLength = digits.length;
  const source = showFull || totalLength <= maxChars ? digits : digits.slice(0, maxChars);
  const text = chunkDigits(source, chunkSize);
  const truncated = !showFull && totalLength > maxChars;
  return {
    text: truncated
      ? `${text}\n${translate('analysis.display.truncateHint', { count: totalLength.toLocaleString() })}`
      : text,
    truncated,
    totalLength,
  };
}
