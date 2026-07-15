import { AppErrorCode } from '@/shared/errors/app-error-codes';
import type { MasterInput, DataValidationResult } from '@/types/electron';

/** 레거시 이명전기 마스터값은 수만~수십만 자리 숫자 시퀀스 */
export const MASTER_VALUE_MAX_LENGTH = 10_000_000;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function formatMasterNo(value: number | string): string {
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  return String(num).padStart(2, '0');
}

export function isValidMasterNo(value: string): boolean {
  const normalized = value.padStart(2, '0');
  if (!/^\d{2}$/.test(normalized)) return false;
  const num = parseInt(normalized, 10);
  return num >= 0 && num <= 99;
}

export function normalizeMasterValue(value: string): string {
  if (!value) return '';
  return value.replace(/[\s,\r\n\t;|]+/g, '').replace(/\D/g, '');
}

export function isNumericMasterValue(value: string): boolean {
  const normalized = normalizeMasterValue(value);
  if (normalized.length === 0) return false;
  return /^\d+$/.test(normalized);
}

export class ValidationService {
  validateMasterInput(input: MasterInput): ValidationResult {
    const errors: string[] = [];

    if (!isValidMasterNo(input.masterNo)) {
      errors.push(AppErrorCode.VAL_MASTER_NO);
    }

    const normalizedValue = normalizeMasterValue(input.masterValue);
    if (normalizedValue.length === 0) {
      errors.push(AppErrorCode.VAL_MASTER_VALUE_REQUIRED);
    } else if (!isNumericMasterValue(normalizedValue)) {
      errors.push(AppErrorCode.VAL_MASTER_VALUE);
    } else if (normalizedValue.length > MASTER_VALUE_MAX_LENGTH) {
      errors.push(AppErrorCode.VAL_MASTER_VALUE_LENGTH);
    }

    return { valid: errors.length === 0, errors };
  }

  validateMasterData(input: MasterInput): DataValidationResult {
    const normalizedValue = normalizeMasterValue(input.masterValue);
    const checks = {
      isNumeric: isNumericMasterValue(normalizedValue),
      lengthValid: normalizedValue.length <= MASTER_VALUE_MAX_LENGTH,
      notEmpty: normalizedValue.length > 0,
    };

    const errors: string[] = [];
    if (!checks.notEmpty) errors.push(AppErrorCode.VAL_MASTER_VALUE_EMPTY);
    if (!checks.isNumeric) errors.push(AppErrorCode.VAL_MASTER_VALUE);
    if (!checks.lengthValid) {
      errors.push(AppErrorCode.VAL_MASTER_VALUE_LENGTH);
    }

    return { valid: errors.length === 0, checks, errors };
  }

  normalizeInput(input: MasterInput): MasterInput {
    return {
      masterNo: formatMasterNo(input.masterNo),
      masterValue: normalizeMasterValue(input.masterValue),
      memo: input.memo?.trim() || null,
    };
  }
}

export const validationService = new ValidationService();
