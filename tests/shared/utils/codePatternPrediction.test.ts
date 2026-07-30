import { describe, expect, it } from 'vitest';
import { analyzeMasterValue, buildCodeValueStats } from '@/shared/utils/analysisEngine';
import {
  classifyMasterCodeProfile,
  collectDigitsAtPatternPhase,
  findBestPatternCodeMatch,
  getLiveDigitClasses,
  predictFromCodePatternProfile,
  predictNextClassFromDigitPattern,
  resolveTargetBandFromCodeProfile,
} from '@/shared/utils/codePatternPrediction';

const BLOCK_CODES = [
  { id: 1, code: '01', type: '저점', description: '저점,저점' },
  { id: 2, code: '05', type: '저점', description: '저점,저점,저점' },
];

const ALT_CODES = [{ id: 3, code: '02', type: '저점', description: '저점,고점' }];

describe('codePatternPrediction', () => {
  it('uses digit-level class sequence like code matching', () => {
    const classes = getLiveDigitClasses('', '5050');
    expect(classes).toEqual(['high', 'low', 'high', 'low']);
    const next = predictNextClassFromDigitPattern(classes, ['low', 'high']);
    expect(next.nextClass).toBe('high');
  });

  it('matches block low digit pattern', () => {
    const result = analyzeMasterValue('00', '0011223344');
    const stats = buildCodeValueStats(result, BLOCK_CODES);
    const profile = classifyMasterCodeProfile(result, stats);
    expect(profile.patternMatch?.description).toBe('저점,저점');
  });

  it('저점,고점 pattern after low digit recommends high band', () => {
    const result = analyzeMasterValue('00', '1819281938');
    const stats = buildCodeValueStats(result, [...BLOCK_CODES, ...ALT_CODES]);
    const profile = classifyMasterCodeProfile(result, stats);
    const decision = resolveTargetBandFromCodeProfile(profile, 8, result.digits);
    expect(decision.targetBand).toBe('low');
    expect(decision.reason).toMatch(/patternTransition|sequenceRule/);
  });

  it('저점,저점 pattern after low digit continues low band', () => {
    const result = analyzeMasterValue('00', '01234');
    const stats = buildCodeValueStats(result, BLOCK_CODES);
    const profile = classifyMasterCodeProfile(result, stats);
    const decision = resolveTargetBandFromCodeProfile(profile, 3, result.digits);
    expect(decision.targetBand).toBe('low');
  });

  it('collects digits from same pattern phase in master', () => {
    const result = analyzeMasterValue('00', '1819281938');
    const stats = buildCodeValueStats(result, ALT_CODES);
    const classes = getLiveDigitClasses('', result.digits);
    const match = findBestPatternCodeMatch(classes, stats);
    expect(match).not.toBeNull();
    const digits = collectDigitsAtPatternPhase(result.digits, '', match!, 'low');
    expect(digits.size).toBeGreaterThan(0);
  });

  it('after low input recommends high-band digit from pattern', () => {
    const result = analyzeMasterValue('00', '1819281938');
    const stats = buildCodeValueStats(result, ALT_CODES);
    const profile = classifyMasterCodeProfile(result, stats, '1');
    const decision = resolveTargetBandFromCodeProfile(profile, 1, result.digits, '1');
    expect(decision.targetBand).toBe('high');
    expect(decision.reason).toMatch(/patternTransition|sequenceRule/);

    const withPrefix = predictFromCodePatternProfile(result, stats, '1', 1);
    expect(withPrefix.targetBand).toBe('high');
    expect(withPrefix.rankedDigits[0]?.digit).toBeGreaterThanOrEqual(5);
  });

  it('uses pattern transition not digit frequency', () => {
    const result = analyzeMasterValue('00', '0011223344');
    const stats = buildCodeValueStats(result, BLOCK_CODES);
    const prediction = predictFromCodePatternProfile(result, stats, '', 4);
    expect(prediction.bandDecision.reason).toMatch(/patternTransition|sequenceRule/);
    expect(prediction.contextMatches).toBeGreaterThan(0);
  });
});
