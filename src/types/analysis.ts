import type { Master } from './electron';
import type { AnalysisResult, CodeValueStatRow } from '@/shared/utils/analysisEngine';
import type { PredictionResult } from '@/shared/utils/predictionEngine';
import type { ProbabilityProfile } from '@/shared/utils/probabilityEngine';
import type { RateRecommendResult } from '@/shared/utils/rateRecommendEngine';
import type { EngineVerificationOutput } from '@/shared/utils/engineVerification';

/** IPC `analysis:run` input (PRD AnalysisInput). */
export interface AnalysisRunInput {
  masterNo: string;
  /** If omitted, Main loads `masterValue` from the Master table. */
  masterValue?: string;
}

/** IPC `analysis:run` output payload (PRD AnalysisOutput + UI fields). */
export interface AnalysisRunOutput {
  result: AnalysisResult;
  codeValueStats: CodeValueStatRow[];
  prediction: PredictionResult;
  probabilityProfile: ProbabilityProfile;
  rateRecommendations: RateRecommendResult;
  researchFields: EngineVerificationOutput;
  fromCache: boolean;
  master: Master | null;
  /** Renderer-only: digit engine ran in a Web Worker. */
  usedWorker?: boolean;
}
