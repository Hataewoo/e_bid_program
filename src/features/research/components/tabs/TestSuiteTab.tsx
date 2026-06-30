import { useCallback, useMemo, useRef, useState } from 'react';
import { electronService } from '@/services';
import { saveTextFileWithDialog, saveBinaryFileWithDialog } from '@/features/admin';
import { useI18n } from '@/i18n/use-i18n';
import { formatAppErrors } from '@/i18n/format-app-errors';
import sampleVerificationCases from '@/shared/fixtures/sample-verification-cases.json';
import { suiteResultsToXlsxBase64 } from '@/shared/utils/xlsxImport';
import {
  formatFailureDiagnostics,
  summarizeSuiteFailures,
  buildSuiteDiagnosisReport,
  formatSuiteDiagnosisMarkdown,
} from '@/shared/utils/suiteDiagnostics';
import type { SuiteRunSummary } from '@/shared/utils/verificationSuite';
import {
  applyVerificationImportPlan,
  buildVerificationExportBundle,
  catalogBundleToCsv,
  catalogBundleToJson,
  parseVerificationImportFile,
  parseVerificationImportJson,
  planVerificationImport,
  type DuplicatePolicy,
} from '@/shared/utils/verificationImport';
import { useResearchStore } from '../../stores/research-store';

export function TestSuiteTab() {
  const { t } = useI18n();
  const verifications = useResearchStore((s) => s.verifications);
  const experiments = useResearchStore((s) => s.experiments);
  const saveVerification = useResearchStore((s) => s.saveVerification);
  const loadAll = useResearchStore((s) => s.loadAll);
  const recordSuiteRun = useResearchStore((s) => s.recordSuiteRun);

  const [running, setRunning] = useState(false);
  const [duplicatePolicy, setDuplicatePolicy] = useState<DuplicatePolicy>('skip');
  const runLockRef = useRef(false);
  const [summary, setSummary] = useState<SuiteRunSummary | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const failureDiagnostics = useMemo(() => {
    if (!summary || summary.failed === 0) return null;
    return formatFailureDiagnostics(summarizeSuiteFailures(summary.results));
  }, [summary]);

  const diagnosisMarkdown = useMemo(() => {
    if (!summary) return null;
    return formatSuiteDiagnosisMarkdown(buildSuiteDiagnosisReport(summary));
  }, [summary]);

  const importCatalogCases = useCallback(
    async (cases: ReturnType<typeof parseVerificationImportJson>) => {
      const plan = planVerificationImport(verifications, cases, duplicatePolicy);
      if (plan.errors.length > 0) {
        setMessage(`${t('research.suite.importDuplicateError')}: ${plan.errors.join('; ')}`);
        return;
      }
      if (duplicatePolicy === 'skip' && plan.toCreate.length === 0 && plan.skipped.length > 0) {
        setMessage(t('research.suite.sampleAlreadyLoaded'));
        return;
      }

      const result = await applyVerificationImportPlan(plan, saveVerification);
      await loadAll();
      setMessage(
        t('research.suite.importResult', {
          created: String(result.created),
          updated: String(result.updated),
          skipped: String(result.skipped),
        }),
      );
    },
    [verifications, duplicatePolicy, saveVerification, loadAll, t],
  );

  const handleRunAll = useCallback(async () => {
    if (runLockRef.current) return;
    runLockRef.current = true;
    setRunning(true);
    setMessage(null);
    try {
      let result: SuiteRunSummary;
      if (electronService.isAvailable()) {
        const op = await electronService.runFullVerificationSuite();
        if (!op.success || !op.data) {
          throw new Error(formatAppErrors(op.errors, 'research.suite.error'));
        }
        result = op.data;
      } else {
        const codes = await electronService.getAllCodes();
        result = electronService.runFullVerificationSuiteLocal(verifications, experiments, codes);
      }
      setSummary(result);
      recordSuiteRun(result, 'full');
      setMessage(t('research.suite.completed', { rate: String(result.passRate) }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('research.suite.error'));
    } finally {
      runLockRef.current = false;
      setRunning(false);
    }
  }, [verifications, experiments, recordSuiteRun, t]);

  const handleRunBuiltIn = useCallback(async () => {
    if (runLockRef.current) return;
    runLockRef.current = true;
    setRunning(true);
    setMessage(null);
    try {
      let result: SuiteRunSummary;
      if (electronService.isAvailable()) {
        const op = await electronService.runRegressionSuite();
        if (!op.success || !op.data) {
          throw new Error(formatAppErrors(op.errors, 'research.suite.error'));
        }
        result = op.data;
      } else {
        const codes = await electronService.getAllCodes();
        result = electronService.runRegressionSuiteLocal(codes);
      }
      setSummary(result);
      recordSuiteRun(result, 'builtin');
      setMessage(t('research.suite.regressionDone', { rate: String(result.passRate) }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('research.suite.error'));
    } finally {
      runLockRef.current = false;
      setRunning(false);
    }
  }, [recordSuiteRun, t]);

  const handleLoadSampleCases = useCallback(async () => {
    if (running) return;
    try {
      const cases = parseVerificationImportJson(JSON.stringify(sampleVerificationCases));
      await importCatalogCases(cases);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('research.suite.importError'));
    }
  }, [importCatalogCases, t, running]);

  const handleImportCatalog = useCallback(() => {
    if (running) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.csv,application/json,text/csv';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const cases = parseVerificationImportFile(text, file.name);
        await importCatalogCases(cases);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : t('research.suite.importError'));
      }
    };
    input.click();
  }, [importCatalogCases, t, running]);

  const handleExportCatalogJson = useCallback(async () => {
    const bundle = buildVerificationExportBundle(verifications);
    const stamp = new Date().toISOString().slice(0, 10);
    await saveTextFileWithDialog(
      `verification-catalog-${stamp}.json`,
      catalogBundleToJson(bundle),
      t('research.suite.exportCatalogJson'),
    );
  }, [verifications, t]);

  const handleExportCatalogCsv = useCallback(async () => {
    const bundle = buildVerificationExportBundle(verifications);
    const stamp = new Date().toISOString().slice(0, 10);
    await saveTextFileWithDialog(
      `verification-catalog-${stamp}.csv`,
      catalogBundleToCsv(bundle),
      t('research.suite.exportCatalogCsv'),
    );
  }, [verifications, t]);

  const handleExportXlsx = useCallback(async () => {
    if (!summary) return;
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      const base64 = await suiteResultsToXlsxBase64(summary.results);
      const result = await saveBinaryFileWithDialog(
        `test-suite-${stamp}.xlsx`,
        base64,
        t('research.suite.exportTitle'),
      );
      if (!result.success && !result.cancelled) {
        setMessage(result.errors?.[0] ?? t('research.suite.exportError'));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('research.suite.exportError'));
    }
  }, [summary, t]);

  const handleExportDiagnosis = useCallback(async () => {
    if (!diagnosisMarkdown) return;
    const stamp = new Date().toISOString().slice(0, 10);
    await saveTextFileWithDialog(
      `test-suite-diagnosis-${stamp}.md`,
      diagnosisMarkdown,
      t('research.suite.exportDiagnosis'),
    );
  }, [diagnosisMarkdown, t]);

  const handleExportCsv = useCallback(async () => {
    if (!summary) return;
    const header = 'name,field,expected,actual,passed';
    const lines = summary.results.map((row) =>
      [row.name, row.field, row.expected, row.actual, row.passed ? 'PASS' : 'FAIL']
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(','),
    );
    const stamp = new Date().toISOString().slice(0, 10);
    await saveTextFileWithDialog(
      `test-suite-${stamp}.csv`,
      [header, ...lines].join('\n'),
      t('research.suite.exportTitle'),
    );
  }, [summary, t]);

  const passRateClass =
    summary && summary.passRate >= 95
      ? 'text-green-700'
      : summary && summary.total > 0
        ? 'text-red-700'
        : 'text-content';

  return (
    <div className="flex h-full flex-col overflow-auto p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1 text-xs text-content-muted">
          {t('research.suite.duplicatePolicy')}
          <select
            className="win-input text-xs"
            value={duplicatePolicy}
            onChange={(e) => setDuplicatePolicy(e.target.value as DuplicatePolicy)}
            disabled={running}
          >
            <option value="skip">{t('research.suite.policySkip')}</option>
            <option value="update">{t('research.suite.policyUpdate')}</option>
          </select>
        </label>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="win-button win-button-primary"
          onClick={() => void handleRunAll()}
          disabled={running}
        >
          {t('research.suite.runAll')}
        </button>
        <button
          type="button"
          className="win-button"
          onClick={() => void handleRunBuiltIn()}
          disabled={running}
        >
          {t('research.suite.runBuiltIn')}
        </button>
        <button
          type="button"
          className="win-button"
          onClick={() => void handleLoadSampleCases()}
          disabled={running}
        >
          {t('research.suite.loadSample')}
        </button>
        <button
          type="button"
          className="win-button"
          onClick={handleImportCatalog}
          disabled={running}
        >
          {t('research.suite.importCatalog')}
        </button>
        <button
          type="button"
          className="win-button"
          onClick={() => void handleExportCatalogJson()}
          disabled={verifications.length === 0}
        >
          {t('research.suite.exportCatalogJson')}
        </button>
        <button
          type="button"
          className="win-button"
          onClick={() => void handleExportCatalogCsv()}
          disabled={verifications.length === 0}
        >
          {t('research.suite.exportCatalogCsv')}
        </button>
        <button
          type="button"
          className="win-button"
          onClick={() => void handleExportDiagnosis()}
          disabled={!summary || summary.total === 0}
        >
          {t('research.suite.exportDiagnosis')}
        </button>
        <button
          type="button"
          className="win-button"
          onClick={() => void handleExportCsv()}
          disabled={!summary || summary.total === 0}
        >
          {t('research.suite.exportCsv')}
        </button>
        <button
          type="button"
          className="win-button"
          onClick={() => void handleExportXlsx()}
          disabled={!summary || summary.total === 0}
        >
          {t('research.suite.exportXlsx')}
        </button>
      </div>

      {message ? <p className="mb-3 text-sm text-content-muted">{message}</p> : null}

      {summary ? (
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded border border-border bg-surface-elevated p-3 text-sm">
            <div className="text-content-muted">{t('research.suite.total')}</div>
            <div className="text-lg font-semibold">{summary.total}</div>
          </div>
          <div className="rounded border border-border bg-surface-elevated p-3 text-sm">
            <div className="text-content-muted">{t('research.suite.passed')}</div>
            <div className="text-lg font-semibold text-green-700">{summary.passed}</div>
          </div>
          <div className="rounded border border-border bg-surface-elevated p-3 text-sm">
            <div className="text-content-muted">{t('research.suite.failed')}</div>
            <div className="text-lg font-semibold text-red-700">{summary.failed}</div>
          </div>
          <div className="rounded border border-border bg-surface-elevated p-3 text-sm">
            <div className="text-content-muted">{t('research.suite.passRate')}</div>
            <div className={`text-lg font-semibold ${passRateClass}`}>{summary.passRate}%</div>
            <div className="text-xs text-content-muted">{t('research.suite.target')}</div>
          </div>
        </div>
      ) : (
        <p className="mb-4 text-sm text-content-muted">{t('research.suite.hint')}</p>
      )}

      {failureDiagnostics ? (
        <pre className="mb-4 max-h-40 overflow-auto rounded border border-border bg-[#fff8f0] p-3 text-[10px] text-[#663300]">
          {failureDiagnostics}
        </pre>
      ) : null}

      {summary && summary.results.length > 0 ? (
        <div className="overflow-auto rounded border border-border">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-[#ece9d8]">
                <th className="border border-border px-2 py-1">{t('research.suite.col.name')}</th>
                <th className="border border-border px-2 py-1">{t('research.suite.col.field')}</th>
                <th className="border border-border px-2 py-1">{t('research.suite.col.result')}</th>
                <th className="border border-border px-2 py-1">
                  {t('research.suite.col.expected')}
                </th>
                <th className="border border-border px-2 py-1">{t('research.suite.col.actual')}</th>
              </tr>
            </thead>
            <tbody>
              {summary.results.map((row) => (
                <tr key={row.id} className="bg-white">
                  <td className="border border-border px-2 py-1">{row.name}</td>
                  <td className="border border-border px-2 py-1 font-mono">{row.field}</td>
                  <td
                    className={`border border-border px-2 py-1 font-semibold ${
                      row.passed ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {row.passed ? t('research.suite.resultPass') : t('research.suite.resultFail')}
                  </td>
                  <td className="max-w-[200px] truncate border border-border px-2 py-1 font-mono">
                    {row.expected}
                  </td>
                  <td className="max-w-[200px] truncate border border-border px-2 py-1 font-mono">
                    {row.actual}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
