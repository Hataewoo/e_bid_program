import { describe, expect, it } from 'vitest';
import { analyzeMasterValue, buildCodeValueStats } from '@/shared/utils/analysisEngine';
import { buildProbabilityProfile } from '@/shared/utils/probabilityEngine';
import {
  BID_RATE_HIGH_BAND_MIN,
  BID_RATE_INTEGER_MAX,
  BID_RATE_INTEGER_MIN,
  BID_RATE_LOW_BAND_MAX,
  buildRateRecommendations,
  listBandIntegerParts,
} from '@/shared/utils/rateRecommendEngine';

const DEFAULT_OPTS = {
  count: 10,
  mode: 'auto' as const,
  minInteger: BID_RATE_INTEGER_MIN,
  maxInteger: BID_RATE_INTEGER_MAX,
  topDigitsPerPosition: 4,
};

describe('probabilityEngine', () => {
  it('builds digit probabilities that sum to ~100', () => {
    const result = analyzeMasterValue('01', '00112233445566778899');
    const profile = buildProbabilityProfile(result, []);

    const sum = Object.values(profile.digitProbability).reduce((a, b) => a + b, 0);
    expect(profile.totalDigits).toBe(20);
    expect(sum).toBeGreaterThan(99);
    expect(sum).toBeLessThan(101);
    expect(profile.segments.some((s) => s.segmentKey === 'band:low')).toBe(true);
  });

  it('returns empty profile for no digits', () => {
    const result = analyzeMasterValue('00', '');
    const profile = buildProbabilityProfile(result, []);
    expect(profile.totalDigits).toBe(0);
    expect(profile.segments).toHaveLength(0);
  });
});

describe('rateRecommendEngine', () => {
  it('returns ranked bid rates in XX.XXXX format', () => {
    const result = analyzeMasterValue('02', '0123456789'.repeat(20));
    const stats = buildCodeValueStats(result, [
      { id: 1, code: '234', type: 'A', description: 'test' },
    ]);
    const profile = buildProbabilityProfile(result, stats);
    const rec = buildRateRecommendations(profile, { count: 5 });

    expect(rec.recommendations.length).toBeGreaterThan(0);
    expect(rec.recommendations.length).toBeLessThanOrEqual(5);
    expect(rec.recommendations[0]?.rate).toMatch(/^\d{2,3}\.\d{4}$/);
    expect(rec.recommendations[0]?.rank).toBe(1);
    expect(rec.recommendations[0]?.probability).toBeGreaterThan(0);
    expect(rec.recommendations[0]?.band).toMatch(/^(low|high|middle)$/);
  });

  it('respects requested count', () => {
    const result = analyzeMasterValue('03', '9876543210'.repeat(15));
    const profile = buildProbabilityProfile(result, []);
    const rec = buildRateRecommendations(profile, { count: 15 });
    expect(rec.recommendations.length).toBeLessThanOrEqual(15);
  });

  it('filters integer part to 97-103', () => {
    const result = analyzeMasterValue('04', '0123456789'.repeat(10));
    const profile = buildProbabilityProfile(result, []);
    const rec = buildRateRecommendations(profile, { count: 30 });
    for (const row of rec.recommendations) {
      const intPart = Number(row.rate.split('.')[0]);
      expect(intPart).toBeGreaterThanOrEqual(BID_RATE_INTEGER_MIN);
      expect(intPart).toBeLessThanOrEqual(BID_RATE_INTEGER_MAX);
    }
  });

  it('lists low band integers 97-100 and high band 100-103', () => {
    expect(listBandIntegerParts('low', DEFAULT_OPTS)).toEqual([97, 98, 99, 100]);
    expect(listBandIntegerParts('high', DEFAULT_OPTS)).toEqual([100, 101, 102, 103]);
  });

  it('low mode only recommends low band integers', () => {
    const result = analyzeMasterValue('08', '5566778899000011223344'.repeat(25));
    const profile = buildProbabilityProfile(result, []);
    const rec = buildRateRecommendations(profile, { count: 30, mode: 'low' });

    expect(rec.recommendations.length).toBeGreaterThan(0);
    expect(rec.options.mode).toBe('low');
    for (const row of rec.recommendations) {
      expect(row.band).toBe('low');
      const intPart = Number(row.rate.split('.')[0]);
      expect(intPart).toBeLessThanOrEqual(BID_RATE_LOW_BAND_MAX);
    }
  });

  it('high mode only recommends high band integers', () => {
    const result = analyzeMasterValue('09', '5566778899000011223344'.repeat(25));
    const profile = buildProbabilityProfile(result, []);
    const rec = buildRateRecommendations(profile, { count: 30, mode: 'high' });

    expect(rec.recommendations.length).toBeGreaterThan(0);
    expect(rec.options.mode).toBe('high');
    for (const row of rec.recommendations) {
      expect(row.band).toBe('high');
      const intPart = Number(row.rate.split('.')[0]);
      expect(intPart).toBeGreaterThanOrEqual(BID_RATE_HIGH_BAND_MIN);
    }
  });

  it('middle mode only recommends rates between 99.5 and 100.5', () => {
    const result = analyzeMasterValue('10', '0123456789'.repeat(20));
    const profile = buildProbabilityProfile(result, []);
    const rec = buildRateRecommendations(profile, { count: 30, mode: 'middle' });

    expect(rec.recommendations.length).toBeGreaterThan(0);
    expect(rec.options.mode).toBe('middle');
    for (const row of rec.recommendations) {
      expect(row.band).toBe('middle');
      const [intStr, decStr] = row.rate.split('.');
      const value = Number(intStr) + Number(decStr) / 10_000;
      expect(value).toBeGreaterThanOrEqual(99.5);
      expect(value).toBeLessThan(100.5);
    }
  });

  it('auto mode sorts merged pools by probability descending', () => {
    const result = analyzeMasterValue('05', '5566778899000011223344'.repeat(25));
    const profile = buildProbabilityProfile(result, []);
    const rec = buildRateRecommendations(profile, { count: 50, mode: 'auto' });

    expect(rec.options.mode).toBe('auto');
    for (let i = 1; i < rec.recommendations.length; i += 1) {
      expect(rec.recommendations[i - 1]!.probability).toBeGreaterThanOrEqual(
        rec.recommendations[i]!.probability,
      );
    }
  });

  it('keeps band integer rules on each recommendation', () => {
    const result = analyzeMasterValue('06', '0123456789'.repeat(20));
    const profile = buildProbabilityProfile(result, []);
    const rec = buildRateRecommendations(profile, { count: 40 });

    for (const row of rec.recommendations) {
      const intPart = Number(row.rate.split('.')[0]);
      if (row.band === 'low') {
        expect(intPart).toBeGreaterThanOrEqual(BID_RATE_INTEGER_MIN);
        expect(intPart).toBeLessThanOrEqual(BID_RATE_LOW_BAND_MAX);
      } else {
        expect(intPart).toBeGreaterThanOrEqual(BID_RATE_HIGH_BAND_MIN);
        expect(intPart).toBeLessThanOrEqual(BID_RATE_INTEGER_MAX);
      }
    }
  });
});
