import { describe, expect, it } from 'vitest';
import type { Experiment, Hypothesis, Verification } from '@/types/electron';
import {
  countVerificationsForHypothesis,
  experimentNameById,
  filterHypotheses,
  hypothesesForExperiment,
  hypothesisTitleById,
  verificationsForHypothesis,
} from '@/features/research/utils/hypothesis-links';

const experiments: Experiment[] = [
  {
    id: 1,
    name: 'Exp A',
    date: '2026-01-01',
    version: '1.0.0',
    description: '',
    status: 'Draft',
    createdAt: '',
    updatedAt: '',
    inputs: [],
    outputs: [],
  },
  {
    id: 2,
    name: 'Exp B',
    date: '2026-01-02',
    version: '1.0.0',
    description: '',
    status: 'Draft',
    createdAt: '',
    updatedAt: '',
    inputs: [],
    outputs: [],
  },
];

const hypotheses: Hypothesis[] = [
  {
    id: 10,
    experimentId: 1,
    sourceField: 'step2',
    title: 'H1',
    description: '',
    confidence: 50,
    verified: false,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 11,
    experimentId: null,
    sourceField: null,
    title: 'H2',
    description: '',
    confidence: 30,
    verified: false,
    createdAt: '',
    updatedAt: '',
  },
];

const verifications: Verification[] = [
  {
    id: 100,
    experimentId: 1,
    hypothesisId: 10,
    name: 'V1',
    inputData: '{}',
    expectedResult: 'a',
    actualResult: 'a',
    passed: true,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 101,
    experimentId: 1,
    hypothesisId: 10,
    name: 'V2',
    inputData: '{}',
    expectedResult: 'a',
    actualResult: 'b',
    passed: false,
    createdAt: '',
    updatedAt: '',
  },
];

describe('hypothesis-links', () => {
  it('resolves experiment and hypothesis names by id', () => {
    expect(experimentNameById(experiments, 1)).toBe('Exp A');
    expect(experimentNameById(experiments, 99)).toBeNull();
    expect(hypothesisTitleById(hypotheses, 10)).toBe('H1');
    expect(hypothesisTitleById(hypotheses, null)).toBeNull();
  });

  it('filters hypotheses by experiment', () => {
    expect(hypothesesForExperiment(hypotheses, 1)).toHaveLength(1);
    expect(filterHypotheses(hypotheses, null)).toHaveLength(2);
    expect(filterHypotheses(hypotheses, 2)).toHaveLength(0);
  });

  it('counts verifications linked to a hypothesis', () => {
    expect(verificationsForHypothesis(verifications, 10)).toHaveLength(2);
    expect(countVerificationsForHypothesis(verifications, 10)).toEqual({
      total: 2,
      passed: 1,
      failed: 1,
    });
  });
});
