import type { AnalysisResult } from '@/shared/utils/analysisEngine';
import { runHumanStyleV2 } from '@/shared/utils/humanStyleCounterfactualPredictor';

/** Mirrors Analysis UI display — runHumanStyleV2 on the same parsed master digits as V1. */
export function getAnalysisV2DisplayValue(result: AnalysisResult): {
  step1: string;
  step2: string | null;
  finalDigit: number | null;
} {
  const v2 = runHumanStyleV2(result.digits, result.masterNo);
  return {
    step1: v2.step1.winnerId,
    step2: v2.step2?.winnerId ?? null,
    finalDigit: v2.finalDigit,
  };
}
