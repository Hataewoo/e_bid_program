import { describe, expect, it } from 'vitest';
import { runAnalysisPipeline } from '@/shared/services/analysisRunService';
import type { Code } from '@/types/electron';

const sampleCodes: Code[] = [
  { id: 1, code: 'C01', type: 'T', description: '', createdAt: '', updatedAt: '' },
];

describe('analysisRunService', () => {
  it('runs shared pipeline with step2/step3 and research fields', () => {
    const output = runAnalysisPipeline({
      masterNo: '00',
      masterValue: '0123456789',
      master: null,
      codes: sampleCodes,
    });

    expect(output.result.digits).toBe('0123456789');
    expect(output.researchFields.step2).toBe('01234');
    expect(output.researchFields.step3).toBe('56789');
    expect(output.codeValueStats.length).toBeGreaterThan(0);
    expect(output.prediction.value).toBeTruthy();
    expect(output.probabilityProfile.totalDigits).toBe(10);
    expect(output.rateRecommendations.recommendations.length).toBeGreaterThan(0);
    expect(output.rateRecommendations.recommendations[0]?.rate).toMatch(/^\d{2,3}\.\d{4}$/);
  });
});
