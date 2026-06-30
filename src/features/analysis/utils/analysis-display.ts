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
  return values.join(', ');
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
