import { describe, it } from 'vitest';
import { analyzeMasterValue, filterDigitsByClass } from '@/shared/utils/analysisEngine';
import {
  descriptionToSubBandSequence,
  findDigitPatternStarts,
  findSubBandSequenceStarts,
  findTokenSubBandSequenceStarts,
  filterNonOverlappingMatchStarts,
} from '@/shared/utils/legacyCodeContentEngine';
import { filterPointValuesToSubBand } from '@/shared/utils/pointValuesCodeFlow';
import { expectedGapCount } from '@/shared/fixtures/legacy-code-content-expected';
import { LEGACY_MASTER_00_VALUE } from '@/shared/fixtures/legacy-master-00-value';
import { getLegacyStepCodeDefinition, LEGACY_STEP2_CODE_ORDER } from '@/shared/fixtures/legacy-step-code-catalog';

describe('legacy count-hit probe', () => {
  it('lists match strategies with exact start count', () => {
    const result = analyzeMasterValue('00', LEGACY_MASTER_00_VALUE);
    const pv = filterDigitsByClass(result.digits, 'low');
    const lowLow = filterPointValuesToSubBand(pv, 'lowLow');
    const lowHigh = filterPointValuesToSubBand(pv, 'lowHigh');

    for (const code of LEGACY_STEP2_CODE_ORDER) {
      const def = getLegacyStepCodeDefinition(code, 'low')!;
      const sub = descriptionToSubBandSequence(def.description, 'low')!;
      const need = expectedGapCount(code)! + 1;
      const hits: string[] = [];

      const tryAdd = (label: string, n: number) => {
        if (n === need) hits.push(`${label}=${n}`);
      };

      for (const [label, stream, plen] of [
        ['pv/digit', findSubBandSequenceStarts(pv, sub), sub.length],
        ['pv/tok', findTokenSubBandSequenceStarts(pv, sub), sub.length],
        ['pv/lit', findDigitPatternStarts(pv, code), code.length],
        ['ll/digit', findSubBandSequenceStarts(lowLow, sub), sub.length],
        ['lh/digit', findSubBandSequenceStarts(lowHigh, sub), sub.length],
        ['ll/lit', findDigitPatternStarts(lowLow, code), code.length],
        ['lh/lit', findDigitPatternStarts(lowHigh, code), code.length],
      ] as const) {
        tryAdd(`${label}/raw`, stream.length);
        tryAdd(`${label}/filt`, filterNonOverlappingMatchStarts(stream, plen).length);
      }

      console.log(`${code} need=${need}: ${hits.length ? hits.join(', ') : 'NONE'}`);
    }
  });
});
