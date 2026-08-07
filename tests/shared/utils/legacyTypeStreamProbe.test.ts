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

describe('legacy type-based stream count probe', () => {
  it('match counts when stream = type 저점→lowLow, 고점→lowHigh', () => {
    const pv = filterDigitsByClass(analyzeMasterValue('00', LEGACY_MASTER_00_VALUE).digits, 'low');
    const ll = filterPointValuesToSubBand(pv, 'lowLow');
    const lh = filterPointValuesToSubBand(pv, 'lowHigh');

    for (const code of LEGACY_STEP2_CODE_ORDER) {
      const def = getLegacyStepCodeDefinition(code, 'low')!;
      const stream = def.type === '저점' ? ll : lh;
      const sub = descriptionToSubBandSequence(def.description, 'low')!;
      const need = expectedGapCount(code)! + 1;
      const hits: string[] = [];
      const check = (label: string, n: number) => { if (n === need) hits.push(`${label}=${n}`) };
      check('digit/raw', findSubBandSequenceStarts(stream, sub).length);
      check('tok/raw', findTokenSubBandSequenceStarts(stream, sub).length);
      check('lit/raw', findDigitPatternStarts(stream, code).length);
      check('digit/filt', filterNonOverlappingMatchStarts(findSubBandSequenceStarts(stream, sub), sub.length).length);
      console.log(`${code} type=${def.type} streamLen=${stream.length} need=${need}: ${hits.join(' | ') || 'NONE'}`);
    }
  });
});
