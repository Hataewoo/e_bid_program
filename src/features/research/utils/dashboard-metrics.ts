import type { Experiment, Verification } from '@/types/electron';
import type { SuiteCaseResult } from '@/shared/utils/verificationSuite';
import type { SuiteRunHistoryEntry } from '../types/suite-run-history';

export interface VerificationPassStats {
  evaluated: number;
  passed: number;
  failed: number;
  pending: number;
  passRate: number | null;
}

export interface RecentFailRow {
  id: string;
  name: string;
  detail: string;
  source: 'verification' | 'suite';
  at: string;
}

export function computeVerificationPassStats(verifications: Verification[]): VerificationPassStats {
  const evaluated = verifications.filter((v) => v.passed !== null);
  const passed = evaluated.filter((v) => v.passed === true).length;
  const failed = evaluated.filter((v) => v.passed === false).length;
  const pending = verifications.length - evaluated.length;
  const passRate =
    evaluated.length > 0 ? Math.round((passed / evaluated.length) * 1000) / 10 : null;
  return { evaluated: evaluated.length, passed, failed, pending, passRate };
}

export function sortExperimentsByUpdated(experiments: Experiment[]): Experiment[] {
  return [...experiments].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function countVerificationsForExperiment(
  verifications: Verification[],
  experimentId: number,
): { pass: number; fail: number; pending: number } {
  const rows = verifications.filter((v) => v.experimentId === experimentId);
  return {
    pass: rows.filter((v) => v.passed === true).length,
    fail: rows.filter((v) => v.passed === false).length,
    pending: rows.filter((v) => v.passed === null).length,
  };
}

export function buildRecentFailRows(
  verifications: Verification[],
  suiteFailures: SuiteCaseResult[],
  limit = 12,
): RecentFailRow[] {
  const fromVerifications: RecentFailRow[] = verifications
    .filter((v) => v.passed === false)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((v) => ({
      id: `v-${v.id}`,
      name: v.name,
      detail: `${v.expectedResult} → ${v.actualResult ?? '(empty)'}`,
      source: 'verification' as const,
      at: v.updatedAt,
    }));

  const fromSuite: RecentFailRow[] = suiteFailures.map((row) => ({
    id: `s-${row.id}`,
    name: row.name,
    detail: `${row.field}: ${row.expected} → ${row.actual}`,
    source: 'suite' as const,
    at: new Date().toISOString(),
  }));

  return [...fromVerifications, ...fromSuite]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
}

export function trendChartEntries(
  history: SuiteRunHistoryEntry[],
  max = 15,
): SuiteRunHistoryEntry[] {
  if (history.length <= max) return history;
  return history.slice(history.length - max);
}

export function formatTrendLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
