import type { MessageKey } from '@/i18n/messages';

export type ResearchTab =
  | 'dashboard'
  | 'experiments'
  | 'screenshots'
  | 'inputs'
  | 'outputs'
  | 'differences'
  | 'hypotheses'
  | 'verification'
  | 'testSuite';

export const RESEARCH_TABS: { id: ResearchTab; labelKey: MessageKey }[] = [
  { id: 'dashboard', labelKey: 'research.tab.dashboard' },
  { id: 'experiments', labelKey: 'research.tab.experiments' },
  { id: 'screenshots', labelKey: 'research.tab.screenshots' },
  { id: 'inputs', labelKey: 'research.tab.inputs' },
  { id: 'outputs', labelKey: 'research.tab.outputs' },
  { id: 'differences', labelKey: 'research.tab.differences' },
  { id: 'hypotheses', labelKey: 'research.tab.hypotheses' },
  { id: 'verification', labelKey: 'research.tab.verification' },
  { id: 'testSuite', labelKey: 'research.tab.testSuite' },
];

export const EXPERIMENT_STATUSES = ['Draft', 'Running', 'Verified', 'Failed'] as const;

export const EXPERIMENT_STATUS_KEYS: Record<(typeof EXPERIMENT_STATUSES)[number], MessageKey> = {
  Draft: 'research.experiment.status.draft',
  Running: 'research.experiment.status.running',
  Verified: 'research.experiment.status.verified',
  Failed: 'research.experiment.status.failed',
};

export const SUGGESTED_INPUT_KEYS = ['masterNo', 'masterValue', 'code', 'codeValue'] as const;

export const SUGGESTED_OUTPUT_KEYS = [
  'step2',
  'step3',
  'statistics',
  'prediction',
  'memo',
] as const;

export const DIFF_TYPE_COLORS: Record<string, string> = {
  Match: 'text-green-700 bg-green-50',
  'Digit Difference': 'text-orange-700 bg-orange-50',
  'Length Difference': 'text-yellow-700 bg-yellow-50',
  'Missing Value': 'text-red-700 bg-red-50',
  'Unexpected Value': 'text-purple-700 bg-purple-50',
  'Character Mismatch': 'text-red-700 bg-red-50',
};
