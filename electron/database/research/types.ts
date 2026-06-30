export const EXPERIMENT_STATUSES = ['Draft', 'Running', 'Verified', 'Failed'] as const;
export type ExperimentStatus = (typeof EXPERIMENT_STATUSES)[number];

export const OUTPUT_SOURCES = ['legacy', 'ours'] as const;
export type OutputSource = (typeof OUTPUT_SOURCES)[number];

export const SUGGESTED_INPUT_KEYS = ['masterNo', 'masterValue', 'code', 'codeValue'] as const;

export const SUGGESTED_OUTPUT_KEYS = [
  'step2',
  'step3',
  'statistics',
  'prediction',
  'memo',
] as const;

export const DIFF_TYPES = [
  'Match',
  'Digit Difference',
  'Length Difference',
  'Missing Value',
  'Unexpected Value',
  'Character Mismatch',
] as const;
