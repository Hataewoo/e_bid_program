import type { SuiteRunHistoryEntry, SuiteRunKind } from '../types/suite-run-history';
import type { SuiteRunSummary } from '@/shared/utils/verificationSuite';

const STORAGE_KEY = 'csebid-research-suite-history-v1';
const MAX_ENTRIES = 30;

function readRaw(): SuiteRunHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SuiteRunHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(entries: SuiteRunHistoryEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
}

export function loadSuiteRunHistory(): SuiteRunHistoryEntry[] {
  return readRaw().sort((a, b) => a.runAt.localeCompare(b.runAt));
}

export function appendSuiteRunHistory(
  summary: SuiteRunSummary,
  kind: SuiteRunKind,
): SuiteRunHistoryEntry[] {
  const entry: SuiteRunHistoryEntry = {
    id: `run-${Date.now()}`,
    runAt: new Date().toISOString(),
    kind,
    total: summary.total,
    passed: summary.passed,
    failed: summary.failed,
    passRate: summary.passRate,
  };
  const next = [entry, ...readRaw()].slice(0, MAX_ENTRIES);
  write(next);
  return loadSuiteRunHistory();
}

export function clearSuiteRunHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}
