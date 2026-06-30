import { codeValueRepository } from '../repositories/code-value-repository';
import { validationService } from './validation-service';
import type { CodeValue } from '@/types/electron';
import type { CodeValueFormValues, CodeValueSearchParams } from '../types/code-value.types';

export class CodeValueService {
  async loadAll(): Promise<CodeValue[]> {
    return codeValueRepository.findAll();
  }

  filterItems(items: CodeValue[], search: CodeValueSearchParams): CodeValue[] {
    const query = search.query.trim().toLowerCase();
    if (!query) return items;

    return items.filter((item) => {
      const haystack = [item.code, item.value, item.description ?? '', item.memo ?? '']
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }

  toFormValues(item: CodeValue | null): CodeValueFormValues {
    if (item) {
      return {
        id: item.id,
        code: item.code,
        value: item.value,
        description: item.description ?? '',
        memo: item.memo ?? '',
      };
    }
    return {
      id: null,
      code: '',
      value: '',
      description: '',
      memo: '',
    };
  }

  createEmptyForm(): CodeValueFormValues {
    return {
      id: null,
      code: '',
      value: '',
      description: '',
      memo: '',
    };
  }

  async save(form: CodeValueFormValues) {
    const input = validationService.normalizeInput({
      code: form.code,
      value: form.value,
      description: form.description || null,
      memo: form.memo || null,
    });

    const clientValidation = validationService.validateInput(input);
    if (!clientValidation.valid) {
      return { success: false as const, errors: clientValidation.errors };
    }

    return codeValueRepository.save({
      id: form.id,
      ...input,
    });
  }

  async delete(id: number) {
    return codeValueRepository.delete(id);
  }
}

export const codeValueService = new CodeValueService();
