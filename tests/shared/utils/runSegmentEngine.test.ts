import { describe, expect, it } from 'vitest';
import { analyzeMasterValue } from '@/shared/utils/analysisEngine';
import {
  collectSegmentDigitTransitions,
  extractPrimaryRunCompletionEvents,
  getLiveSegmentState,
  predictRunSegment,
} from '@/shared/utils/runSegmentEngine';

describe('runSegmentEngine', () => {
  it('tracks live S prefix from digit prefix', () => {
    const state = getLiveSegmentState('11');
    expect(state).not.toBeNull();
    expect(state!.side).toBe('low');
    expect(state!.completedRunLengths).toEqual([]);
    expect(state!.currentRunProgress).toBe(2);
  });

  it('extracts primary run completion events for low side', () => {
    const events = extractPrimaryRunCompletionEvents('112345', 'low');
    expect(events.length).toBeGreaterThan(0);
    expect(events[0]).toMatchObject({
      sBefore: [],
      segmentValue: 5,
    });
  });

  it('predicts next segment from matching S prefix in master', () => {
    const result = analyzeMasterValue('00', '1123456789');
    const segment = predictRunSegment(result, '11');

    expect(segment).not.toBeNull();
    expect(segment!.live.completedRunLengths).toEqual([]);
    expect(segment!.live.currentRunProgress).toBe(2);
    expect(
      segment!.remainingInRunCandidates.length + segment!.nextSegmentCandidates.length,
    ).toBeGreaterThan(0);
  });

  it('uses full master state when prefix is empty', () => {
    const result = analyzeMasterValue('00', '11234');
    const segment = predictRunSegment(result, '');

    expect(segment).not.toBeNull();
    expect(segment!.live.sourceDigits).toBe('11234');
  });

  it('shows run-end hint when matched run length equals progress', () => {
    const result = analyzeMasterValue('00', '11234');
    const segment = predictRunSegment(result, '1');

    expect(segment).not.toBeNull();
    expect(segment!.live.currentRunProgress).toBe(1);
    if (segment!.sampleCount > 0) {
      expect(
        segment!.runEndsAfterNextDigit ||
          segment!.remainingInRunCandidates.length > 0 ||
          segment!.expectedRunLengthCandidates.length > 0,
      ).toBe(true);
    }
  });

  it('uses progress fallback when S prefix does not match', () => {
    const result = analyzeMasterValue('00', '11223344556677889900');
    const segment = predictRunSegment(result, '99');

    expect(segment).not.toBeNull();
    expect(segment!.matchTier).not.toBe('none');
    expect(
      segment!.expectedRunLengthCandidates.length +
        segment!.remainingInRunCandidates.length +
        segment!.nextSegmentCandidates.length,
    ).toBeGreaterThan(0);
  });

  it('collects contextual next digits from master snapshots', () => {
    const master = '1123411234';
    const result = analyzeMasterValue('00', master);
    const live = getLiveSegmentState('11');
    expect(live).not.toBeNull();

    const weights = collectSegmentDigitTransitions(master, live!);
    expect(weights.size).toBeGreaterThan(0);
  });
});
