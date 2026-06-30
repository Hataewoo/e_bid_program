import { AppErrorCode } from '../../../src/shared/errors/app-error-codes';

export interface CodeValueInput {
  code: string;
  value: string;
  description?: string | null;
  memo?: string | null;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function normalizeCode(value: string): string {
  return value.replace(/\s/g, '');
}

export class CodeValueValidationService {
  normalizeInput(input: CodeValueInput): CodeValueInput {
    return {
      code: normalizeCode(input.code),
      value: input.value.trim(),
      description: input.description?.trim() || null,
      memo: input.memo?.trim() || null,
    };
  }

  validateInput(input: CodeValueInput): ValidationResult {
    const errors: string[] = [];
    const normalized = this.normalizeInput(input);

    if (!normalized.code) {
      errors.push(AppErrorCode.VAL_CODE_VALUE_CODE_REQUIRED);
    }

    if (!normalized.value) {
      errors.push(AppErrorCode.VAL_CODE_VALUE_VALUE_REQUIRED);
    } else if (normalized.value.length > 5000) {
      errors.push(AppErrorCode.VAL_CODE_VALUE_LENGTH);
    }

    return { valid: errors.length === 0, errors };
  }
}
