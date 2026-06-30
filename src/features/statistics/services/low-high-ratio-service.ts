import { masterRepository } from '@/features/master/repositories/master-repository';
import {
  analyzeMasterStatistics,
  buildLowHighRatioFromResult,
} from '@/shared/utils/statisticsEngine';
import type { LowHighRatio } from '../types/low-high-ratio.types';

export class LowHighRatioService {
  async load(masterNo?: string): Promise<LowHighRatio | null> {
    if (!masterNo) return null;

    const master = await masterRepository.findByMasterNo(masterNo);
    if (!master?.masterValue?.trim()) return null;

    const result = analyzeMasterStatistics(master);
    if (result.totalCount === 0) return null;

    return buildLowHighRatioFromResult(result);
  }
}

export const lowHighRatioService = new LowHighRatioService();
