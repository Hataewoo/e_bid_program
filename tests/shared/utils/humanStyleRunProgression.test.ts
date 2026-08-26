import { describe, expect, it } from 'vitest';
import {
  analyzeRunProgression,
  collectHistoricalRunsForTrailingMarker,
  determineRunProgressionPhase,
} from '../../../src/shared/utils/humanStyleRunProgression';
import {
  tryRunProgressionStructuralDecision,
} from '../../../src/shared/utils/humanStyleTieResolution';
import { runHumanStyleV2 } from '../../../src/shared/utils/humanStyleCounterfactualPredictor';
import { HUMAN_DIAGNOSTIC_FIXTURE_MASTER } from '../../../src/shared/utils/humanStyleCounterfactualPredictor';

describe('humanStyleRunProgression', () => {
  it('collects historical runs for trailing marker (run shape, not frequency)', () => {
    const seq = [1, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1];
    const { activeRun, historicalRuns } = collectHistoricalRunsForTrailingMarker(seq);
    expect(activeRun).toBe(5);
    expect(historicalRuns).toEqual([3, 4]);
  });

  it('determines phase from structural bounds without hardcoded digits', () => {
    expect(determineRunProgressionPhase(2, 4, 5)).toBe('progressing');
    expect(determineRunProgressionPhase(4, 4, 5)).toBe('approaching_termination');
    expect(determineRunProgressionPhase(5, 4, 5)).toBe('at_termination_zone');
    expect(determineRunProgressionPhase(7, 4, 5)).toBe('beyond_typical_shape');
  });

  it('returns insufficient_evidence when fewer than 2 historical runs', () => {
    const rp = analyzeRunProgression({
      sequence: [1, 1, 1],
      sequenceLabel: 'short',
      side: 'low',
      sub: 'lowLow',
      liveRunLength: 3,
    });
    expect(rp.phase).toBe('insufficient_evidence');
    expect(rp.structuralPreference).toBe('neutral');
  });

  it('phase alone does not force structural decision', () => {
    const decision = tryRunProgressionStructuralDecision(
      [
        {
          id: 'LOW',
          label: 'low',
          recursivePath: {} as never,
          naturalness: { total: 1 } as never,
          childBehavior: 'extends',
          parentImplication: 'keep',
          candidateMatchesCurrent: true,
          stateKind: 'continuation',
          level: 'mainBand',
        },
        {
          id: 'HIGH',
          label: 'high',
          recursivePath: {} as never,
          naturalness: { total: 1 } as never,
          childBehavior: 'terminates',
          parentImplication: 'switch',
          candidateMatchesCurrent: false,
          stateKind: 'switch',
          level: 'mainBand',
        },
      ],
      {
        activeRun: 5,
        historicalRuns: [4, 5],
        selectedPattern: 'oneDuplicate',
        typicalCenter: 4.5,
        typicalUpperBoundary: 5,
        phase: 'at_termination_zone',
        continuationShape: { total: 2.5 } as never,
        terminationShape: { total: 2.4 } as never,
        structuralPreference: 'terminate',
        confidence: 0.8,
        reason: 'test',
      },
      [
        {
          candidateId: 'LOW',
          primaryChildBehavior: 'extends',
          primaryParentImplication: 'keep',
          deeperChildBehavior: 'extends',
          deeperParentImplication: 'keep',
          candidateMatchesCurrent: true,
          stateKind: 'continuation',
        },
        {
          candidateId: 'HIGH',
          primaryChildBehavior: 'terminates',
          primaryParentImplication: 'switch',
          deeperChildBehavior: 'terminates',
          deeperParentImplication: 'keep',
          candidateMatchesCurrent: false,
          stateKind: 'switch',
        },
      ],
    );
    expect(decision).toBeNull();
  });

  it('STEP1/STEP2 include runProgression trace in V2 output', () => {
    const v2 = runHumanStyleV2(HUMAN_DIAGNOSTIC_FIXTURE_MASTER);
    expect(v2.step1.tieResolution?.runProgression).toBeDefined();
    expect(v2.step2?.tieResolution?.runProgression).toBeDefined();
    expect(v2.step1.tieResolution?.runProgression?.activeRun).toBeGreaterThan(0);
  });
});
