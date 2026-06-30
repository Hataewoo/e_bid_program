import { AppErrorCode } from '@/shared/errors/app-error-codes';
import type { CodeInput } from '@/types/electron';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function normalizeCode(value: string): string {
  return value.replace(/\s/g, '');
}

export class ValidationService {
  normalizeInput(input: CodeInput): CodeInput {
    return {
      code: normalizeCode(input.code),
      type: input.type.trim(),
      description: input.description?.trim() ?? '',
    };
  }

  validateInput(input: CodeInput): ValidationResult {
    const errors: string[] = [];
    const normalized = this.normalizeInput(input);

    if (!normalized.code) {
      errors.push(AppErrorCode.VAL_CODE_REQUIRED);
    }

    if (!normalized.type) {
      errors.push(AppErrorCode.VAL_CODE_TYPE_REQUIRED);
    }

    return { valid: errors.length === 0, errors };
  }
}

export const validationService = new ValidationService();
