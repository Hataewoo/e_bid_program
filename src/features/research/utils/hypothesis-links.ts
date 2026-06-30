import type { Experiment, Hypothesis, Verification } from '@/types/electron';

export function experimentNameById(
  experiments: Experiment[],
  experimentId: number | null | undefined,
): string | null {
  if (experimentId == null) return null;
  return experiments.find((e) => e.id === experimentId)?.name ?? null;
}

export function hypothesesForExperiment(
  hypotheses: Hypothesis[],
  experimentId: number,
): Hypothesis[] {
  return hypotheses.filter((h) => h.experimentId === experimentId);
}

export function verificationsForHypothesis(
  verifications: Verification[],
  hypothesisId: number,
): Verification[] {
  return verifications.filter((v) => v.hypothesisId === hypothesisId);
}

export function hypothesisTitleById(
  hypotheses: Hypothesis[],
  hypothesisId: number | null | undefined,
): string | null {
  if (hypothesisId == null) return null;
  return hypotheses.find((h) => h.id === hypothesisId)?.title ?? null;
}

export function filterHypotheses(
  hypotheses: Hypothesis[],
  experimentFilter: number | null,
): Hypothesis[] {
  if (experimentFilter == null) return hypotheses;
  return hypotheses.filter((h) => h.experimentId === experimentFilter);
}

export function countVerificationsForHypothesis(
  verifications: Verification[],
  hypothesisId: number,
): { total: number; passed: number; failed: number } {
  const linked = verificationsForHypothesis(verifications, hypothesisId);
  return {
    total: linked.length,
    passed: linked.filter((v) => v.passed === true).length,
    failed: linked.filter((v) => v.passed === false).length,
  };
}
