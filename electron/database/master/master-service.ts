import type { MasterRepository, MasterRecord } from './master-repository';
import {
  ValidationService,
  type MasterInput,
  type ValidationResult,
  type DataValidationResult,
} from '../validation/validation-service';
import { AppErrorCode, contextError } from '../../../src/shared/errors/app-error-codes';

export interface BulkUpsertProgress {
  current: number;
  total: number;
}

export interface BulkUpsertResult {
  success: boolean;
  processed: number;
  upserted: number;
  failed: number;
  errors: string[];
}

export class MasterService {
  constructor(
    private readonly repository: MasterRepository,
    private readonly validationService: ValidationService,
  ) {}

  async getAll(): Promise<MasterRecord[]> {
    return this.repository.findAll();
  }

  async getByMasterNo(masterNo: string): Promise<MasterRecord | null> {
    return this.repository.findByMasterNo(masterNo);
  }

  async create(
    input: MasterInput,
  ): Promise<{ success: true; data: MasterRecord } | { success: false; errors: string[] }> {
    const validation = this.validationService.validateMasterInput(input);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    const normalized = this.validationService.normalizeInput(input);
    const exists = await this.repository.existsByMasterNo(normalized.masterNo);
    if (exists) {
      return { success: false, errors: [AppErrorCode.VAL_MASTER_DUP] };
    }

    const data = await this.repository.create(normalized);
    return { success: true, data };
  }

  async update(
    id: number,
    input: MasterInput,
  ): Promise<{ success: true; data: MasterRecord } | { success: false; errors: string[] }> {
    const validation = this.validationService.validateMasterInput(input);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    const normalized = this.validationService.normalizeInput(input);
    const exists = await this.repository.existsByMasterNo(normalized.masterNo, id);
    if (exists) {
      return { success: false, errors: [AppErrorCode.VAL_MASTER_DUP] };
    }

    const data = await this.repository.update({ id, ...normalized });
    return { success: true, data };
  }

  async save(
    input: MasterInput & { id?: number | null },
  ): Promise<{ success: true; data: MasterRecord } | { success: false; errors: string[] }> {
    const normalized = this.validationService.normalizeInput(input);

    if (input.id) {
      return this.update(input.id, normalized);
    }

    const existing = await this.repository.findByMasterNo(normalized.masterNo);
    if (existing) {
      return this.update(existing.id, normalized);
    }

    return this.create(normalized);
  }

  async delete(
    masterNo: string,
  ): Promise<{ success: true } | { success: false; errors: string[] }> {
    if (!this.validationService.isValidMasterNo(masterNo)) {
      return { success: false, errors: [AppErrorCode.VAL_MASTER_NO_INVALID] };
    }

    const existing = await this.repository.findByMasterNo(masterNo);
    if (!existing) {
      return { success: false, errors: [AppErrorCode.VAL_MASTER_NOT_FOUND] };
    }

    await this.repository.deleteByMasterNo(masterNo);
    return { success: true };
  }

  validateData(input: MasterInput): DataValidationResult {
    return this.validationService.validateMasterData(input);
  }

  validateInput(input: MasterInput): ValidationResult {
    return this.validationService.validateMasterInput(input);
  }

  async getCount(): Promise<number> {
    return this.repository.count();
  }

  async bulkUpsert(
    inputs: MasterInput[],
    onProgress?: (progress: BulkUpsertProgress) => void,
  ): Promise<BulkUpsertResult> {
    const total = inputs.length;
    let processed = 0;
    let upserted = 0;
    let failed = 0;
    const errors: string[] = [];

    const normalizedRows = inputs.map((input) => this.validationService.normalizeInput(input));

    for (const input of normalizedRows) {
      const validation = this.validationService.validateMasterInputBulk(input);
      if (!validation.valid) {
        failed += 1;
        for (const code of validation.errors) {
          errors.push(
            contextError(
              `Master ${input.masterNo}`,
              code as (typeof AppErrorCode)[keyof typeof AppErrorCode],
            ),
          );
        }
        processed += 1;
        onProgress?.({ current: processed, total });
        continue;
      }

      try {
        await this.repository.upsertByMasterNo(input);
        upserted += 1;
      } catch {
        failed += 1;
        errors.push(contextError(`Master ${input.masterNo}`, AppErrorCode.DB_WRITE_FAILED));
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
