import { translate } from '@/i18n/translate';
import type { DataValidationResult } from '@/types/electron';

export function formatMasterValidationSummary(
  result: DataValidationResult,
  parsedLength?: number,
): string {
  const parts = [
    translate(result.checks.notEmpty ? 'master.check.valuePresent' : 'master.check.valueMissing'),
    translate(result.checks.isNumeric ? 'master.check.numeric' : 'master.check.notNumeric'),
    translate(result.checks.lengthValid ? 'master.check.lengthOk' : 'master.check.lengthOver'),
  ];
  if (parsedLength !== undefined) {
    parts.push(translate('master.check.parsedDigits', { count: parsedLength }));
  }
  return parts.join(' | ');
}

export function masterValidationTag(
  check: boolean,
  passKey:
    'master.check.tag.valueExists' | 'master.check.tag.numeric' | 'master.check.tag.lengthOk',
): string {
  return `${check ? '✔' : '✘'} ${translate(passKey)}`;
}
