import { describe, expect, it } from 'vitest';
import { runExperimentLegacySuite, runVerificationRecord } from '@/shared/utils/verificationSuite';
import type { Code, Experiment, Verification } from '@/types/electron';

const codes: Code[] = [
  {
    id: 1,
    code: '01',
    type: 'low',
    description: 'test',
    createdAt: '',
    updatedAt: '',
  },
];

describe('verificationSuite', () => {
  it('passes when legacy step2 matches engine output', () => {
    const experiment: Experiment = {
      id: 1,
      name: 'Sample',
      date: new Date().toISOString(),
      version: '1.0.0',
      description: '',
      status: 'Draft',
      createdAt: '',
      updatedAt: '',
      inputs: [
        { id: 1, experimentId: 1, fieldKey: 'masterNo', fieldValue: '01' },
        { id: 2, experimentId: 1, fieldKey: 'masterValue', fieldValue: '012345' },
      ],
      outputs: [
        {
          id: 1,
          experimentId: 1,
          source: 'legacy',
          fieldKey: 'step2',
          fieldValue: '01234',
          memo: null,
        },
      ],
    };

    const results = runExperimentLegacySuite(experiment, codes);
    expect(results).toHaveLength(1);
    expect(results[0]?.passed).toBe(true);
  });

  it('evaluates verification json expected against engine actual', () => {
    const verification: Verification = {
      id: 1,
      experimentId: null,
      hypothesisId: null,
      name: 'Step2 check',
      inputData: JSON.stringify({ masterNo: '01', masterValue: '012345' }),
      expectedResult: JSON.stringify({ step2: '01234', step3: '5' }),
      actualResult: null,
      passed: null,
      createdAt: '',
      updatedAt: '',
    };

    const results = runVerificationRecord(verification, codes);
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results.every((row) => row.passed)).toBe(true);
  });

  it('returns empty when experiment has no masterValue', () => {
    const experiment: Experiment = {
      id: 2,
      name: 'Broken',
      date: new Date().toISOString(),
      version: '1.0.0',
      description: '',
      status: 'Draft',
      createdAt: '',
      updatedAt: '',
      inputs: [{ id: 1, experimentId: 2, fieldKey: 'masterNo', fieldValue: '01' }],
      outputs: [
        {
          id: 2,
          experimentId: 2,
          source: 'legacy',
          fieldKey: 'step2',
          fieldValue: '01234',
          memo: null,
        },
      ],
    };

    const results = runExperimentLegacySuite(experiment, codes);
    expect(results).toHaveLength(0);
  });
});
