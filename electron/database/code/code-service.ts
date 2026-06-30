import type { CodeRepository, CodeRecord } from './code-repository';
import { CodeValidationService, type CodeInput } from './code-validation-service';
import type { BulkUpsertProgress, BulkUpsertResult } from '../master/master-service';
import { AppErrorCode, contextError } from '../../../src/shared/errors/app-error-codes';

export class CodeService {
  constructor(
    private readonly repository: CodeRepository,
    private readonly validationService: CodeValidationService,
  ) {}

  async getAll(): Promise<CodeRecord[]> {
    return this.repository.findAll();
  }

  async getById(id: number): Promise<CodeRecord | null> {
    return this.repository.findById(id);
  }

  async create(
    input: CodeInput,
  ): Promise<{ success: true; data: CodeRecord } | { success: false; errors: string[] }> {
    const validation = this.validationService.validateInput(input);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    const normalized = this.validationService.normalizeInput(input);
    const exists = await this.repository.existsByCode(normalized.code);
    if (exists) {
      return { success: false, errors: [AppErrorCode.VAL_CODE_DUP] };
    }

    const data = await this.repository.create(normalized);
    return { success: true, data };
  }

  async update(
    id: number,
    input: CodeInput,
  ): Promise<{ success: true; data: CodeRecord } | { success: false; errors: string[] }> {
    const validation = this.validationService.validateInput(input);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    const normalized = this.validationService.normalizeInput(input);
    const exists = await this.repository.existsByCode(normalized.code, id);
    if (exists) {
      return { success: false, errors: [AppErrorCode.VAL_CODE_DUP] };
    }

    const data = await this.repository.update({ id, ...normalized });
    return { success: true, data };
  }

  async save(
    input: CodeInput & { id?: number | null },
  ): Promise<{ success: true; data: CodeRecord } | { success: false; errors: string[] }> {
    const normalized = this.validationService.normalizeInput(input);

    if (input.id) {
      return this.update(input.id, normalized);
    }

    const existing = await this.repository.findByCode(normalized.code);
    if (existing) {
      return this.update(existing.id, normalized);
    }

    return this.create(normalized);
  }

  async delete(id: number): Promise<{ success: true } | { success: false; errors: string[] }> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      return { success: false, errors: [AppErrorCode.VAL_CODE_NOT_FOUND] };
    }

    await this.repository.deleteById(id);
    return { success: true };
  }

  async getCount(): Promise<number> {
    return this.repository.count();
  }

  async bulkUpsert(
    inputs: CodeInput[],
    onProgress?: (progress: BulkUpsertProgress) => void,
  ): Promise<BulkUpsertResult> {
    const total = inputs.length;
    let processed = 0;
    let upserted = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const input of inputs) {
      const validation = this.validationService.validateInput(input);
      if (!validation.valid) {
        failed += 1;
        for (const code of validation.errors) {
          errors.push(
            contextError(
              `Code ${input.code}`,
              code as (typeof AppErrorCode)[keyof typeof AppErrorCode],
            ),
          );
        }
        processed += 1;
        onProgress?.({ current: processed, total });
        continue;
      }

      try {
        const normalized = this.validationService.normalizeInput(input);
        await this.repository.upsertByCode(normalized);
        upserted += 1;
      } catch {
        failed += 1;
        errors.push(contextError(`Code ${input.code}`, AppErrorCode.DB_WRITE_FAILED));
      }

      processed += 1;
      onProgress?.({ current: processed, total });
    }

    return {
      success: failed === 0,
      processed,
      upserted,
      failed,
      errors,
    };
  }
}
