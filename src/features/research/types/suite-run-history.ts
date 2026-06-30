export type SuiteRunKind = 'full' | 'builtin';

export interface SuiteRunHistoryEntry {
  id: string;
  runAt: string;
  kind: SuiteRunKind;
  total: number;
  passed: number;
  failed: number;
  passRate: number;
}
