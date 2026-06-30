import { electronService } from '@/services';
import type { CodeValue, CodeValueSaveInput } from '@/types/electron';

export class CodeValueRepository {
  async findAll(): Promise<CodeValue[]> {
    return electronService.getAllCodeValues();
  }

  async findById(id: number): Promise<CodeValue | null> {
    return electronService.getCodeValueById(id);
  }

  async save(input: CodeValueSaveInput) {
    return electronService.saveCodeValue(input);
  }

  async delete(id: number) {
    return electronService.deleteCodeValue(id);
  }
}

export const codeValueRepository = new CodeValueRepository();
