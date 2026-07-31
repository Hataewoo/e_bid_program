import { describe, expect, it } from 'vitest';
import { analyzeMasterValue } from '@/shared/utils/analysisEngine';
import {
  indexMasterPatternSnapshots,
  masterDigitBandProfile,
  pickDigitFromMasterPatterns,
} from '@/shared/utils/masterPatternDigitEngine';
import { getLiveSegmentState } from '@/shared/utils/runSegmentEngine';
import {
  pickMultipleBatchNextDigits,
  predictFromCodeValuePatterns,
} from '@/shared/utils/codeValuePatternPredictor';

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
    const pick = pickDigitFromMasterPatterns(result, live, '0', 'low');
    expect(pick).not.toBeNull();
    expect(pick!.digit).toBeGreaterThanOrEqual(0);
    expect(pick!.digit).toBeLessThanOrEqual(4);
    expect(pick!.reason).toContain('Master 패턴');
  });

  it('batch 4 digits follows pattern flow not forced 2:2 balance', () => {
    const result = analyzeMasterValue('00', '012345678901234567890');
    const pred = predictFromCodeValuePatterns(result, '');
    expect(pred!.batchDigitPick).not.toBeNull();
    const digits = pred!.batchDigitPick!.digits;
    expect(digits).toHaveLength(4);
    for (const step of pred!.batchDigitPick!.steps) {
      expect(step.reason.length).toBeGreaterThan(0);
      expect(step.patternLabel.length).toBeGreaterThan(0);
    }
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
    }
  });

  it('pickMultipleBatchNextDigits low-only uses digits 0~4 only', () => {
    const result = analyzeMasterValue('00', '012345678901234567890');
    const batches = pickMultipleBatchNextDigits(result, '', 4, 4, 'low');
    expect(batches.length).toBeGreaterThanOrEqual(1);
    for (const batch of batches) {
      expect(batch.digits).toHaveLength(4);
      expect(batch.digits.every((d) => d >= 0 && d <= 4)).toBe(true);
      expect(batch.steps[0]!.reason).toMatch(/저점|반복|전환/);
    }
  });

  it('low-only analyzes low-side patterns when master ends on high', () => {
    const result = analyzeMasterValue('00', '0123456789');
    const batches = pickMultipleBatchNextDigits(result, '', 4, 2, 'low');
    expect(batches.length).toBeGreaterThanOrEqual(1);
    expect(batches[0]!.digits.every((d) => d <= 4)).toBe(true);
    expect(batches[0]!.steps.some((s) => s.reason.includes('저점 run 전용'))).toBe(true);
  });

  it('pickMultipleBatchNextDigits high-only uses digits 5~9 only', () => {
    const result = analyzeMasterValue('00', '012345678901234567890');
    const batches = pickMultipleBatchNextDigits(result, '', 4, 4, 'high');
    expect(batches.length).toBeGreaterThanOrEqual(1);
    for (const batch of batches) {
      expect(batch.digits).toHaveLength(4);
      expect(batch.digits.every((d) => d >= 5 && d <= 9)).toBe(true);
    }
  });

  it('masterDigitBandProfile counts low vs high', () => {
    const profile = masterDigitBandProfile('0123456789');
    expect(profile.low).toBe(5);
    expect(profile.high).toBe(5);
  });
});
