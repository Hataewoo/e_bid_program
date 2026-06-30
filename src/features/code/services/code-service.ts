import { codeRepository } from '../repositories/code-repository';
import { validationService } from './validation-service';
import type { Code } from '@/types/electron';
import type { CodeFormValues, CodeGridRow, CodeRecord } from '../types/code.types';

export class CodeService {
  async loadAll(): Promise<Code[]> {
    return codeRepository.findAll();
  }

  toCodeRecord(code: Code): CodeRecord {
    return {
      id: code.id,
      code: code.code,
      type: code.type,
      description: code.description,
    };
  }

  buildGridRows(codes: Code[]): CodeGridRow[] {
    const records = codes.map((c) => this.toCodeRecord(c));
    return records.map((item, index) => ({
      ...item,
      index: index + 1,
    }));
  }

  toFormValues(code: Code | null): CodeFormValues {
    if (code) {
      return {
        id: code.id,
        code: code.code,
        type: code.type,
        description: code.description,
      };
    }
    return {
      id: null,
      code: '',
      type: '',
      description: '',
    };
  }

  createEmptyForm(): CodeFormValues {
    return {
      id: null,
      code: '',
      type: '',
      description: '',
    };
  }

  async save(form: CodeFormValues) {
    const input = validationService.normalizeInput({
      code: form.code,
      type: form.type,
      description: form.description,
    });

    const clientValidation = validationService.validateInput(input);
    if (!clientValidation.valid) {
      return { success: false as const, errors: clientValidation.errors };
    }

    return codeRepository.save({
      id: form.id,
      ...input,
    });
  }

  async delete(id: number) {
    return codeRepository.delete(id);
  }
}

export const codeService = new CodeService();
