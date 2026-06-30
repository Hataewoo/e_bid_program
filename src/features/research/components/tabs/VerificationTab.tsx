import { useEffect, useMemo, useState } from 'react';
import { electronService } from '@/services';
import {
  evaluateVerificationMatch,
  formatEngineVerificationResult,
  parseEngineVerificationInput,
  resolveEngineMasterNo,
  runAnalysisEngineVerification,
} from '@/shared/utils/engineVerification';
import { useI18n } from '@/i18n/use-i18n';
import { formatAppErrors } from '@/i18n/format-app-errors';
import { useResearchStore } from '../../stores/research-store';
import {
  experimentNameById,
  filterHypotheses,
  hypothesisTitleById,
} from '../../utils/hypothesis-links';

const EMPTY_FORM = {
  id: null as number | null,
  experimentId: null as number | null,
  hypothesisId: null as number | null,
  name: '',
  inputData: '{}',
  expectedResult: '',
  actualResult: '',
};

export function VerificationTab() {
  const { t } = useI18n();
  const verifications = useResearchStore((s) => s.verifications);
  const hypotheses = useResearchStore((s) => s.hypotheses);
  const experiments = useResearchStore((s) => s.experiments);
  const linkContext = useResearchStore((s) => s.linkContext);
  const clearLinkContext = useResearchStore((s) => s.clearLinkContext);
  const saveVerification = useResearchStore((s) => s.saveVerification);
  const deleteVerification = useResearchStore((s) => s.deleteVerification);
  const navigateToExperiment = useResearchStore((s) => s.navigateToExperiment);
  const navigateToHypotheses = useResearchStore((s) => s.navigateToHypotheses);

  const [form, setForm] = useState(EMPTY_FORM);
  const [engineBusy, setEngineBusy] = useState(false);
  const [engineMessage, setEngineMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!linkContext) return;
    setForm((prev) => ({
      ...prev,
      id: null,
      experimentId: linkContext.experimentId ?? prev.experimentId,
      hypothesisId: linkContext.hypothesisId ?? prev.hypothesisId,
      name:
        linkContext.hypothesisId != null
          ? (hypothesisTitleById(hypotheses, linkContext.hypothesisId) ?? prev.name)
          : prev.name,
    }));
    clearLinkContext();
  }, [linkContext, clearLinkContext, hypotheses]);

  const hypothesisOptions = useMemo(() => {
    if (form.experimentId == null) return hypotheses;
    return filterHypotheses(hypotheses, form.experimentId);
  }, [hypotheses, form.experimentId]);

  const handleSave = () => {
    if (!form.name.trim() || !form.expectedResult.trim()) return;
    void saveVerification({
      id: form.id,
      experimentId: form.experimentId,
      hypothesisId: form.hypothesisId,
      name: form.name,
      inputData: form.inputData,
      expectedResult: form.expectedResult,
      actualResult: form.actualResult || null,
    });
    setForm(EMPTY_FORM);
    setEngineMessage(null);
  };

  const handleRunEngine = async () => {
    setEngineBusy(true);
    setEngineMessage(null);
    try {
      const input = parseEngineVerificationInput(form.inputData);
      const masterValue = (input.masterValue ?? '').trim();
      if (!masterValue) {
        throw new Error(t('research.verification.masterValueRequired'));
      }

      let output;
      if (electronService.isAvailable()) {
        const op = await electronService.runAnalysis({
          masterNo: resolveEngineMasterNo(input),
          masterValue,
        });
        if (!op.success || !op.data) {
          throw new Error(formatAppErrors(op.errors, 'IPC_ANALYSIS_FAILED'));
        }
        output = op.data.researchFields;
      } else {
        const codes = await electronService.getAllCodes();
        output = runAnalysisEngineVerification(input, codes);
      }

      const actual = formatEngineVerificationResult(output);
      const passed = form.expectedResult.trim()
        ? evaluateVerificationMatch(form.expectedResult, actual)
        : null;

      setForm((prev) => ({ ...prev, actualResult: actual }));
      setEngineMessage(
        passed === null
          ? t('research.engineFilled')
          : passed
            ? t('research.enginePass')
            : t('research.engineFail'),
      );
    } catch (error) {
      setEngineMessage(error instanceof Error ? error.message : t('research.fillOutputsError'));
    } finally {
      setEngineBusy(false);
    }
  };

  const loadEdit = (id: number) => {
    const v = verifications.find((x) => x.id === id);
    if (!v) return;
    setForm({
      id: v.id,
      experimentId: v.experimentId,
      hypothesisId: v.hypothesisId,
      name: v.name,
      inputData: v.inputData,
      expectedResult: v.expectedResult,
      actualResult: v.actualResult ?? '',
    });
    setEngineMessage(null);
  };

  const passClass = (passed: boolean | null) => {
    if (passed === true) return 'text-green-700 bg-green-50';
    if (passed === false) return 'text-red-700 bg-red-50';
    return 'text-content-muted bg-surface-muted';
  };

  const passLabel = (passed: boolean | null) => {
    if (passed === true) return t('research.suite.resultPass');
    if (passed === false) return t('research.suite.resultFail');
    return t('research.verification.pending');
  };

  return (
    <div className="flex h-full overflow-auto p-4">
      <div className="w-72 shrink-0 border-r border-border pr-4">
        <h3 className="mb-3 text-sm font-semibold">{t('research.verification.listTitle')}</h3>
        {verifications.map((v) => {
          const expName = experimentNameById(experiments, v.experimentId);
          const hypTitle = hypothesisTitleById(hypotheses, v.hypothesisId);
          return (
            <button
              key={v.id}
              type="button"
              className={`mb-2 block w-full rounded border border-border p-2 text-left text-sm hover:bg-surface-muted ${
                form.id === v.id ? 'bg-surface-muted' : ''
              }`}
              onClick={() => loadEdit(v.id)}
            >
              <div className="font-medium">{v.name}</div>
              <div className="mt-1 flex flex-wrap gap-1 text-xs text-content-muted">
                {expName ? (
                  <span>{t('research.verification.linkedExperiment', { name: expName })}</span>
                ) : null}
                {hypTitle ? (
                  <span>{t('research.verification.linkedHypothesis', { title: hypTitle })}</span>
                ) : null}
              </div>
              <span
                className={`mt-1 inline-block rounded px-1.5 py-0.5 text-xs ${passClass(v.passed)}`}
              >
                {passLabel(v.passed)}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex-1 pl-4">
        <h3 className="mb-3 text-sm font-semibold">{t('research.verification.formTitle')}</h3>
        <div className="max-w-lg space-y-4">
          <div>
            <label className="text-xs font-medium">
              {t('research.verification.experimentLabel')}
            </label>
            <select
              className="win-input mt-1 w-full text-sm"
              value={form.experimentId ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                setForm({
                  ...form,
                  experimentId: val ? Number(val) : null,
                  hypothesisId: null,
                });
              }}
            >
              <option value="">{t('research.verification.experimentNone')}</option>
              {experiments.map((exp) => (
                <option key={exp.id} value={exp.id}>
                  {exp.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium">
              {t('research.verification.hypothesisLabel')}
            </label>
            <select
              className="win-input mt-1 w-full text-sm"
              value={form.hypothesisId ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                const hypothesisId = val ? Number(val) : null;
                const hyp = hypothesisId
                  ? hypotheses.find((h) => h.id === hypothesisId)
                  : undefined;
                setForm({
                  ...form,
                  hypothesisId,
                  experimentId: hyp?.experimentId ?? form.experimentId,
                  name: hyp?.title ?? form.name,
                });
              }}
            >
              <option value="">{t('research.verification.hypothesisNone')}</option>
              {hypothesisOptions.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium">{t('research.verification.name')}</label>
            <input
              className="win-input mt-1 w-full"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-medium">{t('research.verification.inputJson')}</label>
            <textarea
              className="win-input mt-1 w-full font-mono text-xs"
              rows={3}
              value={form.inputData}
              onChange={(e) => setForm({ ...form, inputData: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="win-button"
              onClick={() => void handleRunEngine()}
              disabled={engineBusy}
            >
              {t('research.runEngine')}
            </button>
            {engineMessage ? (
              <span className="self-center text-xs text-content-muted">{engineMessage}</span>
            ) : null}
          </div>
          <div className="flex items-center justify-center text-content-muted">↓</div>
          <div>
            <label className="text-xs font-medium">{t('research.verification.expected')}</label>
            <textarea
              className="win-input mt-1 w-full font-mono text-xs"
              rows={2}
              value={form.expectedResult}
              onChange={(e) => setForm({ ...form, expectedResult: e.target.value })}
            />
          </div>
          <div className="flex items-center justify-center text-content-muted">↓</div>
          <div>
            <label className="text-xs font-medium">{t('research.verification.actual')}</label>
            <textarea
              className="win-input mt-1 w-full font-mono text-xs"
              rows={4}
              value={form.actualResult}
              onChange={(e) => setForm({ ...form, actualResult: e.target.value })}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="win-button win-button-primary" onClick={handleSave}>
              {t('research.verification.saveEvaluate')}
            </button>
            {form.id && (
              <button
                type="button"
                className="win-button"
                onClick={() => void deleteVerification(form.id!)}
              >
                {t('research.common.delete')}
              </button>
            )}
            {form.experimentId != null && (
              <button
                type="button"
                className="win-button"
                onClick={() => void navigateToExperiment(form.experimentId!)}
              >
                {t('research.hypotheses.goExperiment')}
              </button>
            )}
            {form.hypothesisId != null && (
              <button
                type="button"
                className="win-button"
                onClick={() => navigateToHypotheses(form.experimentId)}
              >
                {t('research.verification.goHypothesis')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
