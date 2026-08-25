import { describe, expect, it } from 'vitest';
import { analyzeMasterValue } from '@/shared/utils/analysisEngine';
import {
  pickDigitByPatternFlow,
  resolveMainBandFromPatternFlow,
  resolveSubBandFromPatternFlow,
  isBlockedPatternValueDigit,
} from '@/shared/utils/patternFlowPick';
import { resolveFinalDigitPick, resolvePatternRecommendPath } from '@/shared/utils/patternRecommendEngine';
import { buildPointValueTokens, filterPointValuesToSubBand, getSidePointValues } from '@/shared/utils/pointValuesCodeFlow';

describe('patternFlowPick', () => {
  it('does not always pick lowHigh for low-dominant masters', () => {
    const result = analyzeMasterValue('00', '0011223344');
    const { sub, reasons } = resolveSubBandFromPatternFlow(result, '', 'low');
    expect(['lowLow', 'lowHigh']).toContain(sub);
    expect(reasons.some((r) => r.includes('1사이'))).toBe(true);
  });

  it('resolves sub-band from CodeValues flow', () => {
    const result = analyzeMasterValue('00', '0011223344');
    const path = resolvePatternRecommendPath(result, '');
    expect(path.subBandReasons.some((r) => r.includes('1사이') || r.includes('세분화'))).toBe(true);
    expect(['lowLow', 'lowHigh', 'highLow', 'highHigh']).toContain(path.targetSubBand);
  });

  it('different masters produce different next-digit picks', () => {
    const a = resolveFinalDigitPick(
      resolvePatternRecommendPath(analyzeMasterValue('00', '5566775617'), ''),
      analyzeMasterValue('00', '5566775617'),
      '',
    );
    const b = resolveFinalDigitPick(
      resolvePatternRecommendPath(analyzeMasterValue('00', '0123401234'), ''),
      analyzeMasterValue('00', '0123401234'),
      '',
    );
    expect(a?.digit).not.toBe(b?.digit);
  });

  it('pickDigitByPatternFlow uses repeat/transition not scores', () => {
    const result = analyzeMasterValue('00', '0123401234');
    const pick = pickDigitByPatternFlow([2, 3, 4], result, '', 'lowHigh');
    expect(pick.digit).toBeGreaterThanOrEqual(2);
    expect(pick.digit).toBeLessThanOrEqual(4);
    expect(['repeat', 'transition', 'pattern']).toContain(pick.mode);
    expect(pick.reason).toMatch(/이번 차례|전환|패턴 흐름/);
  });

  it('2nd+ main band uses S run flow without frequency sum', () => {
    const result = analyzeMasterValue('00', '5566775617');
    const { reasons } = resolveMainBandFromPatternFlow(result, '6');
    expect(reasons.some((r) => r.includes('S run') || r.includes('run'))).toBe(true);
    expect(reasons.some((r) => r.includes('빈도') || r.includes('점수 합산'))).toBe(true);
  });

  it('never maps CodeValues run lengths (1,1,2) to digits — picks source 3 for 32138733', () => {
    const result = analyzeMasterValue('00', '32138733');
    const path = resolvePatternRecommendPath(result, '');
    const pick = resolveFinalDigitPick(path, result, '');

    expect(pick).not.toBeNull();
    expect(pick!.digit).toBe(3);
    expect(pick!.digit).not.toBe(1);
    expect(pick!.reason).toContain('source digit 3');

    const tokens = buildPointValueTokens(
      filterPointValuesToSubBand(getSidePointValues(result, '', 'low'), path.targetSubBand),
    );
    for (const t of tokens) {
      if (t.value !== t.sourceDigit) {
        expect(isBlockedPatternValueDigit(t.value, tokens)).toBe(true);
      }
    }
  });
});
