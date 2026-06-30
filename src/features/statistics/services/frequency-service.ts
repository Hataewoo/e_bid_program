import { masterRepository } from '@/features/master/repositories/master-repository';
import { analyzeMasterStatistics, buildDigitFrequency } from '@/shared/utils/statisticsEngine';
import type { FrequencyData } from '../types/frequency.types';

export class FrequencyService {
  async load(masterNo?: string): Promise<FrequencyData> {
    if (!masterNo) {
      return { items: [], summary: { totalDigits: 0, uniqueDigits: 0 } };
    }

    const master = await masterRepository.findByMasterNo(masterNo);
    if (!master?.masterValue?.trim()) {
      return { items: [], summary: { totalDigits: 0, uniqueDigits: 0 } };
    }

    const result = analyzeMasterStatistics(master);
    return buildDigitFrequency(result.digits);
  }
}

export const frequencyService = new FrequencyService();
