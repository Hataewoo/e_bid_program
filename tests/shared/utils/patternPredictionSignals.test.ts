import { describe, expect, it } from 'vitest';
import { analyzeMasterValue } from '../../../src/shared/utils/analysisEngine';
import {
  computePatternStateSignals,
  masterDigitsInSubBandSequence,
  patternStateSignalsToMasterDigitScores,
} from '../../../src/shared/utils/patternPredictionSignals';
import { resolvePatternRecommendPath } from '../../../src/shared/utils/patternRecommendEngine';
import {
  computeDigitPredictionScores,
  formatDigitScoreTrace,
} from '../../../src/shared/utils/digitCandidateScoring';
import { isBlockedPatternValueDigit } from '../../../src/shared/utils/patternFlowPick';
import {
  buildPointValueTokens,
  filterPointValuesToSubBand,
  getSidePointValues,
} from '../../../src/shared/utils/pointValuesCodeFlow';
import { sliceRecentDigitScoreTail } from '../../../src/shared/utils/recentCompare';
import { virtualMasterDigits } from '../../../src/shared/utils/subBandRepeatJudgment';
import { isMasterDigit } from '../../../src/shared/utils/digitTypes';

describe('pattern state vs master digit invariants', () => {
  const master = '5142716075797444702810858208';
  const history = master.slice(0, 20);

  it('invariant D — PatternStateSignal has no digit recommendation fields', () => {
    const result = analyzeMasterValue('00', history);
    const path = resolvePatternRecommendPath(result, '', []);
    const signals = computePatternStateSignals(result, '', path.targetSubBand);
    expect(signals.length).toBeGreaterThan(0);
    for (const sig of signals) {
      expect(sig).not.toHaveProperty('supportedDigits');
      expect(sig).not.toHaveProperty('predictedValue');
      expect(sig).not.toHaveProperty('predictedDigit');
      expect(['repeat', 'transition']).toContain(sig.predictedPhase);
    }
  });

  it('invariant E — masterDigitsInSubBandSequence source is result.digits', () => {
    const result = analyzeMasterValue('00', history);
    const path = resolvePatternRecommendPath(result, '', []);
    const seq = masterDigitsInSubBandSequence(result, '', path.targetSubBand);
    const context = virtualMasterDigits(result, '');
    const expected: number[] = [];
    for (const ch of context) {
      const d = Number(ch);
      if (d >= 0 && d <= 9) expected.push(d);
    }
    expect(seq.every((d) => expected.includes(d))).toBe(true);
    expect(context).toBe(result.digits);
  });

  it('invariant A — PatternCodeValue=3 does not penalize MasterDigit 3 in final scoring', () => {
    const result = analyzeMasterValue('00', history);
    const path = resolvePatternRecommendPath(result, '', []);
    const pv = getSidePointValues(result, '', path.activeSide);
    const filtered = filterPointValuesToSubBand(pv, path.targetSubBand);
    const tokens = sliceRecentDigitScoreTail(buildPointValueTokens(filtered));
    expect(tokens.some((t) => t.value === 3 && t.sourceDigit !== 3)).toBe(true);
    expect(isBlockedPatternValueDigit(3, tokens)).toBe(true);

    const breakdown = computeDigitPredictionScores(path, result, '', [], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const d3 = breakdown.scores.find((s) => s.digit === 3)!;
    expect(d3.penalty).toBe(0);
    expect(d3.penaltyReasons).not.toContain(expect.stringMatching(/pattern/i));
    expect(d3.totalScore).toBeGreaterThan(-12);
  });

  it('invariant B — coincident PatternCodeValue and MasterDigit do not auto-boost', () => {
    const result = analyzeMasterValue('00', history);
    const path = resolvePatternRecommendPath(result, '', []);
    const signals = computePatternStateSignals(result, '', path.targetSubBand);
    for (const sig of signals) {
      expect(sig.reason).not.toMatch(/digit \d 추천/);
    }
    const patScores = patternStateSignalsToMasterDigitScores(result, '', path.targetSubBand);
    const standalone4Token = sliceRecentDigitScoreTail(
      buildPointValueTokens(filterPointValuesToSubBand(getSidePointValues(result, '', path.activeSide), path.targetSubBand)),
    ).find((t) => t.value === 4 && t.sourceDigit === 4);
    expect(standalone4Token).toBeDefined();
    const d4Pat = patScores.get(4)?.score ?? 0;
    const d2Pat = patScores.get(2)?.score ?? 0;
    expect(d4Pat).toBeGreaterThan(0);
    expect(d2Pat).toBeGreaterThan(0);
  });

  it('invariant C — recommendation is always MasterDigit 0-9', () => {
    const result = analyzeMasterValue('00', history);
    const path = resolvePatternRecommendPath(result, '', []);
    const breakdown = computeDigitPredictionScores(path, result, '', [], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(isMasterDigit(breakdown.winningDigit)).toBe(true);
    for (const s of breakdown.scores) {
      expect(isMasterDigit(s.digit)).toBe(true);
    }
  });

  it('representative case — digit 3 has no pattern-value penalty', () => {
    const result = analyzeMasterValue('00', history);
    const path = resolvePatternRecommendPath(result, '', []);
    const breakdown = computeDigitPredictionScores(path, result, '', [], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const traces = breakdown.scores.map(formatDigitScoreTrace).join('\n\n');
    expect(traces).not.toMatch(/digit 3[\s\S]*Penalty -40/);
    const d3 = breakdown.scores.find((s) => s.digit === 3)!;
    expect(d3.penalty).toBe(0);
  });

  it('label invariance — sPrime numeric labels do not change PatternState phase', () => {
    const result = analyzeMasterValue('00', history);
    const path = resolvePatternRecommendPath(result, '', []);
    const signals = computePatternStateSignals(result, '', path.targetSubBand);
    const phases = signals.map((s) => `${s.patternKey}:${s.predictedPhase}`);
    expect(phases.length).toBeGreaterThan(0);
    for (const sig of signals) {
      expect(sig.reason).not.toMatch(/→\d$/);
    }
  });
});

describe('master digit scores from master sequence', () => {
  const master = '5142716075797444702810858208';
  const history = master.slice(0, 20);

  it('pattern state scores reference master sequence evidence', () => {
    const result = analyzeMasterValue('00', history);
    const path = resolvePatternRecommendPath(result, '', []);
    const masterSeq = masterDigitsInSubBandSequence(result, '', path.targetSubBand);
    const scores = patternStateSignalsToMasterDigitScores(result, '', path.targetSubBand);

    for (const [digit, entry] of scores) {
      if (entry.score > 0) {
        expect(masterSeq.includes(digit)).toBe(true);
        for (const reason of entry.reasons) {
          expect(reason).toMatch(/master \d/);
        }
      }
    }
  });
});
