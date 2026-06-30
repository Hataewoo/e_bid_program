import type { CodeValueRepository, CodeValueRecord } from './code-value-repository';
import { CodeValueValidationService, type CodeValueInput } from './code-value-validation-service';
import { AppErrorCode } from '../../../src/shared/errors/app-error-codes';

export class CodeValueService {
  constructor(
    private readonly repository: CodeValueRepository,
    private readonly validationService: CodeValueValidationService,
  ) {}

  async getAll(): Promise<CodeValueRecord[]> {
    return this.repository.findAll();
  }

  async getById(id: number): Promise<CodeValueRecord | null> {
    return this.repository.findById(id);
  }

  async create(
    input: CodeValueInput,
  ): Promise<{ success: true; data: CodeValueRecord } | { success: false; errors: string[] }> {
    const validation = this.validationService.validateInput(input);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    const normalized = this.validationService.normalizeInput(input);
    const data = await this.repository.create(normalized);
    return { success: true, data };
  }

  async update(
    id: number,
    input: CodeValueInput,
  ): Promise<{ success: true; data: CodeValueRecord } | { success: false; errors: string[] }> {
    const validation = this.validationService.validateInput(input);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    const normalized = this.validationService.normalizeInput(input);
    const data = await this.repository.update({ id, ...normalized });
    return { success: true, data };
  }

  async save(
    input: CodeValueInput & { id?: number | null },
  ): Promise<{ success: true; data: CodeValueRecord } | { success: false; errors: string[] }> {
    if (input.id) {
      return this.update(input.id, input);
    }
    return this.create(input);
  }

  async delete(id: number): Promise<{ success: true } | { success: false; errors: string[] }> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      return { success: false, errors: [AppErrorCode.VAL_CODE_VALUE_NOT_FOUND] };
    }

    await this.repository.deleteById(id);
    return { success: true };
  }

  async getCount(): Promise<number> {
    return this.repository.count();
  }
}
