import { describe, expect, it } from 'vitest';
import { analyzeMasterValue } from '@/shared/utils/analysisEngine';
import { buildCodeValueStats } from '@/shared/utils/analysisEngine';
import { buildPrediction, createEmptyPrediction } from '@/shared/utils/predictionEngine';

describe('predictionEngine', () => {
  it('returns empty prediction when no digits', () => {
    const result = analyzeMasterValue('00', '');
    const prediction = buildPrediction(result, []);

    expect(prediction.value).toBe('');
    expect(prediction.rationale[0]).toContain('데이터 없음');
  });

  it('builds prediction from top code and dominant side digit', () => {
    const result = analyzeMasterValue('01', '0011223344');
    const stats = buildCodeValueStats(result, [
      { id: 1, code: '12', type: 'A', description: 'test' },
    ]);
    const prediction = buildPrediction(result, stats);

    expect(prediction.topCode).toBe('12');
    expect(prediction.value.startsWith('12')).toBe(true);
    expect(prediction.confidence).toBeGreaterThan(0);
  });

  it('createEmptyPrediction uses master number', () => {
    expect(createEmptyPrediction('07').masterNo).toBe('07');
  });
});
