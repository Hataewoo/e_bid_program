import { describe, expect, it } from 'vitest';
import { analyzeMasterValue } from '@/shared/utils/analysisEngine';
import {
  aggregatePatternTransitions,
  toPivotBandSequence,
} from '@/shared/utils/digitPatternGraph';

describe('digitPatternGraph', () => {
  it('builds pivot band sequence', () => {
    expect(toPivotBandSequence('146')).toBe('LLH');
    expect(toPivotBandSequence('505')).toBe('HLH');
  });

  it('matches band pattern even when digits differ within band', () => {
    const result = analyzeMasterValue('00', '1819281938');
    const pattern = aggregatePatternTransitions(result.digits, '1', 2, 'highHigh');

    expect(pattern.bandPatternMatches).toBeGreaterThan(0);
    expect(pattern.totalMatches).toBeGreaterThan(0);
    expect([...pattern.counts.keys()].every((d) => d >= 8 && d <= 9)).toBe(true);
  });

  it('uses position cycle for same decimal slot', () => {
    const result = analyzeMasterValue('00', '123456789012');
    const pattern = aggregatePatternTransitions(result.digits, '1', 1, 'highHigh');

    expect(pattern.positionMatches).toBeGreaterThan(0);
  });
});
