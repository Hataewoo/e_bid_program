import { useMemo } from 'react';
import { useI18n } from '@/i18n/use-i18n';
import { REGRESSION_GATE_MIN_PASS_RATE } from '@/shared/utils/regressionGate';
import { useResearchStore } from '../../stores/research-store';
import { EXPERIMENT_STATUS_KEYS } from '../../types';
import { PassRateTrendChart } from '../dashboard/PassRateTrendChart';
import {
  buildRecentFailRows,
  computeVerificationPassStats,
  countVerificationsForExperiment,
  sortExperimentsByUpdated,
  trendChartEntries,
} from '../../utils/dashboard-metrics';

export function DashboardTab() {
  const { t } = useI18n();
  const experiments = useResearchStore((s) => s.experiments);
  const verifications = useResearchStore((s) => s.verifications);
  const suiteRunHistory = useResearchStore((s) => s.suiteRunHistory);
  const lastSuiteSummary = useResearchStore((s) => s.lastSuiteSummary);
  const setActiveTab = useResearchStore((s) => s.setActiveTab);
  const selectExperiment = useResearchStore((s) => s.selectExperiment);

  const verificationStats = useMemo(
    () => computeVerificationPassStats(verifications),
    [verifications],
  );

  const trendEntries = useMemo(() => trendChartEntries(suiteRunHistory), [suiteRunHistory]);

  const sortedExperiments = useMemo(
    () => sortExperimentsByUpdated(experiments).slice(0, 12),
    [experiments],
  );

  const recentFails = useMemo(
    () =>
      buildRecentFailRows(verifications, lastSuiteSummary?.results.filter((r) => !r.passed) ?? []),
    [verifications, lastSuiteSummary],
  );

  const displayPassRate = lastSuiteSummary?.passRate ?? verificationStats.passRate ?? null;
  const passRateClass =
    displayPassRate !== null && displayPassRate >= REGRESSION_GATE_MIN_PASS_RATE
      ? 'text-green-700'
      : displayPassRate !== null
        ? 'text-red-700'
        : 'text-content';

  const openExperiment = (id: number) => {
    void selectExperiment(id);
    setActiveTab('experiments');
  };

  return (
    <div className="flex h-full flex-col overflow-auto p-4">
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded border border-border bg-surface-elevated p-3 text-sm">
          <div className="text-content-muted">{t('research.dashboard.experiments')}</div>
          <div className="text-lg font-semibold">{experiments.length}</div>
        </div>
        <div className="rounded border border-border bg-surface-elevated p-3 text-sm">
          <div className="text-content-muted">{t('research.dashboard.verifications')}</div>
          <div className="text-lg font-semibold">{verifications.length}</div>
          <div className="text-xs text-content-muted">
            {t('research.dashboard.verificationEvaluated', { count: verificationStats.evaluated })}
          </div>
        </div>
        <div className="rounded border border-border bg-surface-elevated p-3 text-sm">
          <div className="text-content-muted">{t('research.suite.failed')}</div>
          <div className="text-lg font-semibold text-red-700">
            {lastSuiteSummary?.failed ?? verificationStats.failed}
          </div>
        </div>
        <div className="rounded border border-border bg-surface-elevated p-3 text-sm">
          <div className="text-content-muted">{t('research.suite.passRate')}</div>
          <div className={`text-lg font-semibold ${passRateClass}`}>
            {displayPassRate !== null ? `${displayPassRate}%` : '—'}
          </div>
          <div className="text-xs text-content-muted">{t('research.suite.target')}</div>
        </div>
      </div>

      <div className="mb-4 grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        <PassRateTrendChart entries={trendEntries} />

        <div className="flex min-h-[12rem] flex-col rounded border border-border bg-surface-elevated">
          <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-content-muted">
            {t('research.dashboard.experimentList')}
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {sortedExperiments.length === 0 ? (
              <p className="p-4 text-sm text-content-muted">
                {t('research.dashboard.noExperiments')}
              </p>
            ) : (
              sortedExperiments.map((exp) => {
                const counts = countVerificationsForExperiment(verifications, exp.id);
                const statusKey =
                  EXPERIMENT_STATUS_KEYS[exp.status as keyof typeof EXPERIMENT_STATUS_KEYS];
                return (
                  <button
                    key={exp.id}
                    type="button"
                    className="block w-full border-b border-border px-3 py-2 text-left text-sm hover:bg-surface-muted"
                    onClick={() => openExperiment(exp.id)}
                  >
                    <div className="font-medium">{exp.name}</div>
                    <div className="text-xs text-content-muted">
                      {statusKey ? t(statusKey) : exp.status} · {exp.date.slice(0, 10)}
                      {counts.pass + counts.fail + counts.pending > 0 && (
                        <>
                          {' '}
                          ·{' '}
                          {t('research.dashboard.verificationCounts', {
                            pass: counts.pass,
                            fail: counts.fail,
                            pending: counts.pending,
                          })}
                        </>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="rounded border border-border bg-surface-elevated">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-content-muted">
            {t('research.dashboard.recentFail')}
          </span>
          <button
            type="button"
            className="win-button text-xs"
            onClick={() => setActiveTab('testSuite')}
          >
            {t('research.dashboard.openTestSuite')}
          </button>
        </div>
        {recentFails.length === 0 ? (
          <p className="p-4 text-sm text-content-muted">{t('research.dashboard.noRecentFail')}</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-[#ece9d8]">
                  <th className="border border-border px-2 py-1">{t('research.suite.col.name')}</th>
                  <th className="border border-border px-2 py-1">
                    {t('research.dashboard.col.detail')}
                  </th>
                  <th className="border border-border px-2 py-1">
                    {t('research.dashboard.col.source')}
                  </th>
                  <th className="border border-border px-2 py-1">
                    {t('research.dashboard.col.time')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentFails.map((row) => (
                  <tr key={row.id} className="bg-white">
                    <td className="border border-border px-2 py-1 font-medium">{row.name}</td>
                    <td className="max-w-md truncate border border-border px-2 py-1 font-mono text-[10px]">
                      {row.detail}
                    </td>
                    <td className="border border-border px-2 py-1">
                      {row.source === 'verification'
                        ? t('research.dashboard.sourceVerification')
                        : t('research.dashboard.sourceSuite')}
                    </td>
                    <td className="whitespace-nowrap border border-border px-2 py-1 text-content-muted">
                      {new Date(row.at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
