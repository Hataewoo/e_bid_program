import { describe, expect, it } from 'vitest';
import { analyzeMasterValue } from '@/shared/utils/analysisEngine';
import {
  aggregatePatternTransitions,
  toPivotBandSequence,
} from '@/shared/utils/digitPatternGraph';
import { predictNextDigitStep } from '@/shared/utils/nextDigitEngine';

describe('digitPatternGraph', () => {
  it('builds pivot band sequence', () => {
    expect(toPivotBandSequence('146')).toBe('LLH');
    expect(toPivotBandSequence('505')).toBe('MLM');
  });

  it('matches band pattern even when digits differ within band', () => {
    const result = analyzeMasterValue('00', '1213141516');
    const pattern = aggregatePatternTransitions(result.digits, '1', 2, 'high');

    expect(pattern.bandPatternMatches).toBeGreaterThan(0);
    expect(pattern.totalMatches).toBeGreaterThan(0);
    expect([...pattern.counts.keys()].every((d) => d > 5)).toBe(true);
  });

  it('uses position cycle for same decimal slot', () => {
    const result = analyzeMasterValue('00', '123456789012');
    const pattern = aggregatePatternTransitions(result.digits, '1', 1, 'high');

    expect(pattern.positionMatches).toBeGreaterThan(0);
  });

  it('surfaces pattern source in prediction step', () => {
    const result = analyzeMasterValue('00', '1213141516');
    const step = predictNextDigitStep(result, [], '1');

    expect(step?.source).toBe('pattern');
  });
});
