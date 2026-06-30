import type { Code } from '@/types/electron';
import {
  getCodeValueVerificationSummary,
  getPredictionVerificationSummary,
} from './algorithmVerificationStatus';
import { runRegressionDualRunCheck } from './analysisDualRun';
import { runBuiltInRegressionSuite } from './regressionSuite';

export interface HealthCheckItem {
  id: string;
  label: string;
  ok: boolean;
  detail?: string;
}

export interface HealthCheckReport {
  ok: boolean;
  items: HealthCheckItem[];
  passRate: number;
}

export function runAppHealthCheck(codes: Code[] = []): HealthCheckReport {
  const items: HealthCheckItem[] = [];

  const regression = runBuiltInRegressionSuite(codes);
  items.push({
    id: 'engine-regression',
    label: 'Analysis Engine Regression',
    ok: regression.passRate >= 95,
    detail: `${regression.passed}/${regression.total} (${regression.passRate}%)`,
  });

  const stepRows = regression.results.filter(
    (row) => row.field === 'step2' || row.field === 'step3',
  );
  const stepPassed = stepRows.filter((row) => row.passed).length;
  items.push({
    id: 'step2-step3',
    label: 'STEP2/STEP3 checks',
    ok: stepRows.length > 0 && stepRows.every((row) => row.passed),
    detail: `${stepPassed}/${stepRows.length} passed`,
  });

  const codeValue = getCodeValueVerificationSummary();
  items.push({
    id: 'codevalue-baseline',
    label: 'CodeValue baseline',
    ok: codeValue.passRate >= 95,
    detail: `${codeValue.passed}/${codeValue.total} (${codeValue.passRate}%) | legacy: ${codeValue.verificationState}`,
  });

  const prediction = getPredictionVerificationSummary();
  items.push({
    id: 'prediction-baseline',
    label: 'Prediction heuristic baseline',
    ok: prediction.passRate >= 95,
    detail: `${prediction.passed}/${prediction.total} (${prediction.passRate}%) | legacy: ${prediction.verificationState}`,
  });

  const dualRun = runRegressionDualRunCheck(codes);
  items.push({
    id: 'engine-dual-run',
    label: 'Engine dual-run (legacy vs pipeline)',
    ok: dualRun.ok,
    detail: dualRun.ok
      ? `${dualRun.totalCases}/${dualRun.totalCases} builtin cases match`
      : `${dualRun.mismatches.length} mismatch(es)`,
  });

  return {
    ok: items.every((item) => item.ok),
    items,
    passRate: regression.passRate,
  };
}
