import { masterRepository } from '../repositories/master-repository';
import { validationService } from './validation-service';
import type { Master } from '@/types/electron';
import type { MasterFormValues, MasterGridRow } from '../types/master.types';
import { formatMasterNo } from './validation-service';

export class MasterService {
  async loadAll(): Promise<Master[]> {
    return masterRepository.findAll();
  }

  buildGridRows(masters: Master[]): MasterGridRow[] {
    const masterMap = new Map(masters.map((m) => [m.masterNo, m]));

    return Array.from({ length: 100 }, (_, i) => {
      const masterNo = formatMasterNo(i);
      const existing = masterMap.get(masterNo);
      return {
        index: i + 1,
        masterNo,
        memo: existing?.memo ?? '',
        id: existing?.id ?? null,
        hasData: !!existing,
      };
    });
  }

  toFormValues(master: Master | null, masterNo: string): MasterFormValues {
    if (master) {
      return {
        id: master.id,
        masterNo: master.masterNo,
        masterValue: master.masterValue,
        memo: master.memo ?? '',
      };
    }
    return {
      id: null,
      masterNo,
      masterValue: '',
      memo: '',
    };
  }

  async save(form: MasterFormValues) {
    const input = validationService.normalizeInput({
      masterNo: form.masterNo,
      masterValue: form.masterValue,
      memo: form.memo,
    });

    const clientValidation = validationService.validateMasterInput(input);
    if (!clientValidation.valid) {
      return { success: false as const, errors: clientValidation.errors };
    }

    return masterRepository.save({
      id: form.id,
      ...input,
    });
  }

  async delete(masterNo: string) {
    return masterRepository.delete(masterNo);
  }

  async validateData(form: MasterFormValues) {
    const input = validationService.normalizeInput({
      masterNo: form.masterNo,
      masterValue: form.masterValue,
      memo: form.memo,
    });
    return masterRepository.validateData(input);
  }
}

export const masterService = new MasterService();
