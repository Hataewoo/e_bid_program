import { electronService } from '@/services';
import type { Master, MasterInput, MasterSaveInput, DataValidationResult } from '@/types/electron';

export class MasterRepository {
  async findAll(): Promise<Master[]> {
    return electronService.getAllMasters();
  }

  async findByMasterNo(masterNo: string): Promise<Master | null> {
    return electronService.getMasterByNo(masterNo);
  }

  async save(input: MasterSaveInput) {
    return electronService.saveMaster(input);
  }

  async delete(masterNo: string) {
    return electronService.deleteMaster(masterNo);
  }

  async validateData(input: MasterInput): Promise<DataValidationResult> {
    return electronService.validateMasterData(input);
  }
}

export const masterRepository = new MasterRepository();
