import { describe, expect, it } from 'vitest';
import {
  evaluateVerificationMatch,
  runAnalysisEngineVerification,
} from '@/shared/utils/engineVerification';

describe('engineVerification', () => {
  it('runs analysis engine on masterValue input', () => {
    const output = runAnalysisEngineVerification({ masterNo: '01', masterValue: '012345' }, [
      { id: 1, code: 'C01', type: 'T', description: '', createdAt: '', updatedAt: '' },
    ]);

    expect(output.step2).toBe('01234');
    expect(output.step3).toBe('5');
    expect(output.prediction.length).toBeGreaterThan(0);
  });

  it('evaluates json field subset match', () => {
    const expected = JSON.stringify({ step2: '012', step3: '5' });
    const actual = JSON.stringify({ step2: '012', step3: '5', prediction: 'C015' });
    expect(evaluateVerificationMatch(expected, actual)).toBe(true);
  });
});
