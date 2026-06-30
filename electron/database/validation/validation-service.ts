import { AppErrorCode } from '../../../src/shared/errors/app-error-codes';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface MasterInput {
  masterNo: string;
  masterValue: string;
  memo?: string | null;
}

export interface DataValidationResult {
  valid: boolean;
  checks: {
    isNumeric: boolean;
    lengthValid: boolean;
    notEmpty: boolean;
  };
  errors: string[];
}

export const MASTER_NO_MIN = 0;
export const MASTER_NO_MAX = 99;
export const MASTER_VALUE_MAX_LENGTH = 1000;
/** 일괄 가져오기 전용 상한 (대량 숫자 시퀀스) */
export const MASTER_VALUE_BULK_MAX_LENGTH = 10_000_000;

export function formatMasterNo(value: number | string): string {
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  return String(num).padStart(2, '0');
}

export function isValidMasterNo(value: string): boolean {
  if (!/^\d{1,2}$/.test(value) && !/^\d{2}$/.test(value)) {
    const padded = value.padStart(2, '0');
    if (!/^\d{2}$/.test(padded)) return false;
    const num = parseInt(padded, 10);
    return num >= MASTER_NO_MIN && num <= MASTER_NO_MAX;
  }
  const normalized = value.padStart(2, '0');
  const num = parseInt(normalized, 10);
  return num >= MASTER_NO_MIN && num <= MASTER_NO_MAX;
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
  isValidMasterNo(value: string): boolean {
    return isValidMasterNo(value);
  }

  normalizeInput(input: MasterInput): MasterInput {
    return {
      masterNo: input.masterNo.padStart(2, '0'),
      masterValue: normalizeMasterValue(input.masterValue),
      memo: input.memo?.trim() || null,
    };
  }

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

  validateMasterInputBulk(input: MasterInput): ValidationResult {
    const errors: string[] = [];

    if (!isValidMasterNo(input.masterNo)) {
      errors.push(AppErrorCode.VAL_MASTER_NO);
    }

    const normalizedValue = normalizeMasterValue(input.masterValue);
    if (normalizedValue.length === 0) {
      errors.push(AppErrorCode.VAL_MASTER_VALUE_REQUIRED);
    } else if (!isNumericMasterValue(normalizedValue)) {
      errors.push(AppErrorCode.VAL_MASTER_VALUE);
    } else if (normalizedValue.length > MASTER_VALUE_BULK_MAX_LENGTH) {
      errors.push(AppErrorCode.VAL_MASTER_VALUE_LENGTH_BULK);
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

    return {
      valid: errors.length === 0,
      checks,
      errors,
    };
  }
}
