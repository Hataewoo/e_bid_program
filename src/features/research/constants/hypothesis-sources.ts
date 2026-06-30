import { SUGGESTED_OUTPUT_KEYS } from '../types';

/** Output / input field keys a hypothesis can reference as its source. */
export const HYPOTHESIS_SOURCE_KEYS = ['masterValue', ...SUGGESTED_OUTPUT_KEYS] as const;

export type HypothesisSourceKey = (typeof HYPOTHESIS_SOURCE_KEYS)[number];

export const HYPOTHESIS_SOURCE_I18N_KEYS = {
  masterValue: 'research.hypotheses.source.masterValue',
  step2: 'research.hypotheses.source.step2',
  step3: 'research.hypotheses.source.step3',
  statistics: 'research.hypotheses.source.statistics',
  prediction: 'research.hypotheses.source.prediction',
  memo: 'research.hypotheses.source.memo',
} as const satisfies Record<HypothesisSourceKey, string>;
