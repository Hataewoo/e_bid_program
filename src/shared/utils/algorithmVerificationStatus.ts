import { BUILTIN_CODE_VALUE_VERIFICATION_CASES } from '@/shared/fixtures/code-value-verification-cases';
import { BUILTIN_PREDICTION_VERIFICATION_CASES } from '@/shared/fixtures/prediction-verification-cases';
import { runCodeValueVerificationSuite, type CodeValueSuiteSummary } from './codeValueVerification';
import {
  runPredictionVerificationSuite,
  type PredictionSuiteSummary,
} from './predictionVerification';

export type AlgorithmVerificationState = 'verified' | 'unverified' | 'partial';

/** When false, hide legacy-unverified banners, inline labels, and settings status. */
export const SHOW_LEGACY_UNVERIFIED_UI = false;

export function shouldShowLegacyUnverifiedUi(): boolean {
  return SHOW_LEGACY_UNVERIFIED_UI;
}

export interface AlgorithmVerificationStatus {
  codeValue: AlgorithmVerificationState;
  prediction: AlgorithmVerificationState;
  codeValueBaselinePassRate: number;
  codeValueLegacyCaseCount: number;
  predictionBaselinePassRate: number;
  predictionLegacyCaseCount: number;
  predictionHeuristic: boolean;
  codeValueDetail: string;
  predictionDetail: string;
}

let cachedCodeValueSummary: CodeValueSuiteSummary | null = null;
let cachedPredictionSummary: PredictionSuiteSummary | null = null;

export function getCodeValueVerificationSummary(): CodeValueSuiteSummary {
  if (!cachedCodeValueSummary) {
    cachedCodeValueSummary = runCodeValueVerificationSuite(BUILTIN_CODE_VALUE_VERIFICATION_CASES);
  }
  return cachedCodeValueSummary;
}

export function getPredictionVerificationSummary(): PredictionSuiteSummary {
  if (!cachedPredictionSummary) {
    cachedPredictionSummary = runPredictionVerificationSuite(BUILTIN_PREDICTION_VERIFICATION_CASES);
  }
  return cachedPredictionSummary;
}

/** Reset cache (tests). */
export function resetAlgorithmVerificationCache(): void {
  cachedCodeValueSummary = null;
  cachedPredictionSummary = null;
}

export function getAlgorithmVerificationStatus(): AlgorithmVerificationStatus {
  const cv = getCodeValueVerificationSummary();
  const pred = getPredictionVerificationSummary();

  return {
    codeValue: cv.verificationState,
    prediction: pred.verificationState,
    codeValueBaselinePassRate: cv.passRate,
    codeValueLegacyCaseCount: cv.legacyCaseCount,
    predictionBaselinePassRate: pred.passRate,
    predictionLegacyCaseCount: pred.legacyCaseCount,
    predictionHeuristic: pred.heuristic,
    codeValueDetail:
      cv.verificationState === 'verified'
        ? `Legacy ${cv.legacyPassRate}% (${cv.legacyCaseCount} cases)`
        : `Baseline ${cv.passRate}% — legacy ${cv.legacyCaseCount}/10 cases`,
    predictionDetail:
      pred.verificationState === 'verified'
        ? `Legacy ${pred.legacyPassRate}% (${pred.legacyCaseCount} cases)`
        : `Heuristic baseline ${pred.passRate}% — legacy ${pred.legacyCaseCount}/10 cases`,
  };
}

export function isCodeValueLegacyVerified(): boolean {
  return getAlgorithmVerificationStatus().codeValue === 'verified';
}

export function isPredictionLegacyVerified(): boolean {
  return getAlgorithmVerificationStatus().prediction === 'verified';
}

export function isPredictionHeuristic(): boolean {
  return getPredictionVerificationSummary().heuristic;
}
