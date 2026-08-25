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
    expect(reasons.some((r) => r.includes('1사이') || r.includes('run') || r.includes('종합'))).toBe(true);
  });

  it('master tail ending 89 transitions main band to low via 1사이 priority', () => {
    const master =
      '9456705235212950970536859288237179965826981710019811902821459134449697376041' +
      '8077260775060654963522551260245533227471898833730888862921545325856740790659' +
      '2637359098079795622228542313442222097919049403998819349470266994108517748137' +
      '9438089935034806968549391288706965343487108308454976603528522116173446793111' +
      '6719064979729969209586665726027718828843573686729452727897125046363335804062' +
      '5353308518506214547234918449418445094913982715547156228345735943866955173712' +
      '1972523985335869288795006524392808050734233478921342868598694932424423897045' +
      '7669506266670531745616285924673301239288555513450685015421811178582249028733' +
      '9707043862342105586589866914714160703408540639194553429900268652934318858021' +
      '3693258797893490030503617220160350291507694538230793883799932497983076633897' +
      '3284785347274213421880190134382962238844691608394182689966771150903095962270' +
      '4566958289545370736272899051973558525261290817596622552851015723306724134577' +
      '2860405431691923295041501101069315842141623712263647491018981361727102413315' +
      '312382159289';
    const result = analyzeMasterValue('00', master);
    const { band, reasons } = resolveMainBandFromPatternFlow(result, '');
    expect(band).toBe('low');
    expect(reasons.some((r) => r.includes('1사이'))).toBe(true);
    expect(reasons.some((r) => r.includes('전환'))).toBe(true);

    const path = resolvePatternRecommendPath(result, '');
    expect(path.targetMainBand).toBe('low');
    const pick = resolveFinalDigitPick(path, result, '');
    expect(pick?.digit).toBeLessThanOrEqual(4);
    expect(pick?.digit).not.toBe(9);
  });

  it('never maps CodeValues run lengths (1,1,2) to digits — picks source 3 for 32138733', () => {
    const result = analyzeMasterValue('00', '32138733');
    const path = resolvePatternRecommendPath(result, '');
    const pick = resolveFinalDigitPick(path, result, '');

    expect(pick).not.toBeNull();
    expect(pick!.digit).toBe(3);
    expect(pick!.digit).not.toBe(1);
    expect(pick!.reason).toMatch(/digit 3|코드 23/);

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
