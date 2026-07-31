import { describe, expect, it } from 'vitest';
import { analyzeMasterValue } from '@/shared/utils/analysisEngine';
import {
  indexMasterPatternSnapshots,
  masterDigitBandProfile,
  pickDigitFromMasterPatterns,
} from '@/shared/utils/masterPatternDigitEngine';
import { getLiveSegmentState } from '@/shared/utils/runSegmentEngine';
import { predictFromCodeValuePatterns } from '@/shared/utils/codeValuePatternPredictor';

describe('masterPatternDigitEngine', () => {
  it('indexes full master with Code Value pattern counts', () => {
    const master = '112345678901234567890';
    const snaps = indexMasterPatternSnapshots(master);
    expect(snaps.length).toBeGreaterThan(10);
    expect(snaps.some((s) => s.patternCounts.threeOrMore !== undefined)).toBe(true);
    expect(snaps.some((s) => s.nextDigit !== null)).toBe(true);
  });

  it('pickDigitFromMasterPatterns prefers pattern context not fixed digit', () => {
    const result = analyzeMasterValue('00', '012345678901234567890');
    const live = getLiveSegmentState('0')!;
    const pick = pickDigitFromMasterPatterns(result, live, '0', 0, 4, { low: 0, high: 0 });
    expect(pick).not.toBeNull();
    expect(pick!.digit).toBeGreaterThanOrEqual(0);
    expect(pick!.digit).toBeLessThanOrEqual(9);
    expect(pick!.reason).toContain('Master 패턴');
  });

  it('batch 4 digits balances low and high bands', () => {
    const result = analyzeMasterValue('00', '012345678901234567890');
    const pred = predictFromCodeValuePatterns(result, '');
    expect(pred!.batchDigitPick).not.toBeNull();
    const digits = pred!.batchDigitPick!.digits;
    expect(digits).toHaveLength(4);
    const low = digits.filter((d) => d <= 4).length;
    const high = digits.filter((d) => d >= 5).length;
    expect(low).toBe(2);
    expect(high).toBe(2);
  });

  it('pickMultipleBatchNextDigits returns up to 4 distinct chains', () => {
    const result = analyzeMasterValue('00', '012345678901234567890');
    const pred = predictFromCodeValuePatterns(result, '');
    expect(pred!.batchDigitPicks.length).toBeGreaterThanOrEqual(2);
    expect(pred!.batchDigitPicks.length).toBeLessThanOrEqual(4);
    const chains = pred!.batchDigitPicks.map((b) => b.chain);
    expect(new Set(chains).size).toBe(chains.length);
    for (const batch of pred!.batchDigitPicks) {
      expect(batch.chain).toMatch(/^\d{4}$/);
      expect(batch.digits.filter((d) => d <= 4).length).toBe(2);
      expect(batch.digits.filter((d) => d >= 5).length).toBe(2);
    }
  });

  it('masterDigitBandProfile counts low vs high', () => {
    const profile = masterDigitBandProfile('0123456789');
    expect(profile.low).toBe(5);
    expect(profile.high).toBe(5);
  });
});
