import { describe, expect, it } from 'vitest';
import {
  analyzeRecursivePatternFlow,
  HUMAN_DIAGNOSTIC_FIXTURE_MASTER,
  HUMAN_FIXTURE_EXPECTED,
  resolveHierarchicalPhaseFromPath,
  runHumanStyleDiagnostic,
} from '../../../src/shared/utils/humanStyleDiagnosticPredictor';
import { analyzeMasterValue } from '../../../src/shared/utils/analysisEngine';
import { buildLegacyCodeContentRow } from '../../../src/shared/utils/legacyCodeContentEngine';
import { getSidePointValues } from '../../../src/shared/utils/pointValuesCodeFlow';

describe('humanStyleDiagnosticPredictor', () => {
  it('matches human fixture LOW → LOW_LOW → 0 on reference Master', () => {
    const diag = runHumanStyleDiagnostic(HUMAN_DIAGNOSTIC_FIXTURE_MASTER);
    expect(diag.step1.winnerId).toBe(HUMAN_FIXTURE_EXPECTED.step1);
    expect(diag.step2?.winnerId).toBe(HUMAN_FIXTURE_EXPECTED.step2);
    expect(diag.finalDigit).toBe(HUMAN_FIXTURE_EXPECTED.final);
    expect(diag.matchesHumanFixture).toBe(true);
    expect(diag.firstDivergence).toBeNull();
  });

  it('builds recursive drill-down path (S → oneBetween → …)', () => {
    const result = analyzeMasterValue('00', HUMAN_DIAGNOSTIC_FIXTURE_MASTER);
    const path = analyzeRecursivePatternFlow({
      sequence: result.lowRunLengths,
      sequenceLabel: 'S',
      side: 'low',
      currentSub: 'lowLow',
      liveRunLength: 1,
    });
    expect(path.selectedDrillDown).toBe('oneBetween');
    expect(path.child).not.toBeNull();
  });

  it('uses hierarchical 1중복 focus — not flat frequency', () => {
    const result = analyzeMasterValue('00', HUMAN_DIAGNOSTIC_FIXTURE_MASTER);
    const path = analyzeRecursivePatternFlow({
      sequence: result.lowRunLengths,
      sequenceLabel: 'S',
      side: 'low',
      currentSub: 'lowLow',
      liveRunLength: 1,
    });
    const phase = resolveHierarchicalPhaseFromPath(path, 1, 'low', 'lowLow');
    expect(phase.phase).toBe('repeat');
    expect(phase.source).toContain('1중복');
  });

  it('reproduces 01 code·content gap sequence from legacy engine', () => {
    const result = analyzeMasterValue('00', HUMAN_DIAGNOSTIC_FIXTURE_MASTER);
    const pv = getSidePointValues(result, '', 'low');
    const row = buildLegacyCodeContentRow(
      pv,
      { id: 1, code: '01', type: '저점', description: '저점,저점' },
      'low',
    );
    expect(row.gaps.length).toBeGreaterThan(40);
    expect(row.gaps.slice(0, 10)).toEqual([2, 1, 2, 2, 1, 1, 2, 1, 1, 5]);
  });
});
