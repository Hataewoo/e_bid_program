import { AppErrorCode } from '@/shared/errors/app-error-codes';
import type { CodeValueInput } from '@/types/electron';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function normalizeCode(value: string): string {
  return value.replace(/\s/g, '');
}

export class ValidationService {
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

export const validationService = new ValidationService();
