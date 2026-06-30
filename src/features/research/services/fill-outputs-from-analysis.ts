import { electronService } from '@/services';
import type { ExperimentInputRow } from '@/types/electron';
import { formatAppErrors } from '@/i18n/format-app-errors';
import { translate } from '@/i18n/translate';
import { rememberAnalysisResult } from '@/shared/utils/analysisCache';
import { buildOursOutputDraft, type OursOutputDraft } from '../constants/outputFillPolicy';

function resolveMasterNo(inputs: ExperimentInputRow[]): string {
  const keys = ['masterNo', 'master', 'master_no', 'bidNumber'];
  for (const key of keys) {
    const value = inputs.find(
      (row) => row.fieldKey.toLowerCase() === key.toLowerCase(),
    )?.fieldValue;
    if (value?.trim()) return value.trim().padStart(2, '0');
  }
  return '00';
}

function fieldsFromResearch(research: {
  step2: string;
  step3: string;
  statistics: string;
  prediction: string;
  memo: string;
}): Record<string, string> {
  return {
    step2: research.step2,
    step3: research.step3,
    statistics: research.statistics,
    prediction: research.prediction,
    memo: research.memo,
  };
}

/** Policy B draft — uses Main `analysis:run` when Electron is available. */
export async function buildOursOutputsDraftFromAnalysis(
  inputs: ExperimentInputRow[],
): Promise<OursOutputDraft> {
  const masterNo = resolveMasterNo(inputs);

  if (electronService.isAvailable()) {
    const op = await electronService.runAnalysis({ masterNo });
    if (!op.success || !op.data) {
      throw new Error(formatAppErrors(op.errors, 'IPC_ANALYSIS_FAILED'));
    }
    const rawValue = op.data.master?.masterValue ?? '';
    rememberAnalysisResult(masterNo, rawValue, op.data.result);
    return buildOursOutputDraft(fieldsFromResearch(op.data.researchFields));
  }

  const [master, codes] = await Promise.all([
    electronService.getMasterByNo(masterNo),
    electronService.getAllCodes(),
  ]);

  if (!master?.masterValue?.trim()) {
    throw new Error(translate('research.fillOutputs.masterNoData', { no: masterNo }));
  }

  const local = electronService.runAnalysisLocal(
    { masterNo, masterValue: master.masterValue },
    master,
    codes,
  );
  return buildOursOutputDraft(fieldsFromResearch(local.researchFields));
}
