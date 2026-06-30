import { electronService } from '@/services';
import type { Code, CodeSaveInput } from '@/types/electron';

export class CodeRepository {
  async findAll(): Promise<Code[]> {
    return electronService.getAllCodes();
  }

  async findById(id: number): Promise<Code | null> {
    return electronService.getCodeById(id);
  }

  async save(input: CodeSaveInput) {
    return electronService.saveCode(input);
  }

  async delete(id: number) {
    return electronService.deleteCode(id);
  }
}

export const codeRepository = new CodeRepository();
