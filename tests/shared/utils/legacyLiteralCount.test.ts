import { describe, it } from 'vitest';
import { analyzeMasterValue, filterDigitsByClass } from '@/shared/utils/analysisEngine';
import { findDigitPatternStarts } from '@/shared/utils/legacyCodeContentEngine';
import { expectedGapCount } from '@/shared/fixtures/legacy-code-content-expected';
import { LEGACY_MASTER_00_VALUE } from '@/shared/fixtures/legacy-master-00-value';
import { LEGACY_STEP2_CODE_ORDER } from '@/shared/fixtures/legacy-step-code-catalog';

describe('literal pattern counts', () => {
  it('logs literal digit pattern match counts', () => {
    const pv = filterDigitsByClass(analyzeMasterValue('00', LEGACY_MASTER_00_VALUE).digits, 'low');
    for (const code of LEGACY_STEP2_CODE_ORDER) {
      const n = findDigitPatternStarts(pv, code).length;
      const need = expectedGapCount(code)! + 1;
      console.log(`${code} literal=${n} need=${need} ${n === need ? 'HIT' : ''}`);
    }
  });
});
