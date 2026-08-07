import { describe, it } from 'vitest';
import { analyzeMasterValue, filterDigitsByClass } from '@/shared/utils/analysisEngine';
import { extractCodeValuesFromBaseSequence } from '@/shared/utils/codeValueSubAnalysis';
import { buildPointValueTokens, filterPointValuesToSubBand } from '@/shared/utils/pointValuesCodeFlow';
import { expectedGapCount } from '@/shared/fixtures/legacy-code-content-expected';
import { LEGACY_MASTER_00_VALUE } from '@/shared/fixtures/legacy-master-00-value';
import { LEGACY_STEP2_CODE_ORDER } from '@/shared/fixtures/legacy-step-code-catalog';

const FIELDS = [
  'oneDuplicate','commaAlpha_2_3','plusAlpha_3_2','plusAlpha_4_3','plusAlpha_4_4',
  'threeOrMore','fiveOrMore','oneBetween','alphaPlus_3_2','alphaPlus_4_3',
] as const;

describe('pattern array length vs expected gap count', () => {
  it('logs lengths for each code', () => {
    const r = analyzeMasterValue('00', LEGACY_MASTER_00_VALUE);
    const pv = filterDigitsByClass(r.digits, 'low');
    const streams: Record<string, number[]> = {
      yellowS: r.lowRunLengths,
      sPrime: buildPointValueTokens(pv).map((t) => t.value),
      srcDigit: buildPointValueTokens(pv).map((t) => t.sourceDigit),
      lowLow: buildPointValueTokens(filterPointValuesToSubBand(pv, 'lowLow')).map((t) => t.value),
      lowHigh: buildPointValueTokens(filterPointValuesToSubBand(pv, 'lowHigh')).map((t) => t.value),
    };

    for (const code of LEGACY_STEP2_CODE_ORDER) {
      const need = expectedGapCount(code)!;
      const hits: string[] = [];
      for (const [sName, seq] of Object.entries(streams)) {
        const p = extractCodeValuesFromBaseSequence(seq, 'low');
        for (const f of FIELDS) {
          const len = p[f].length;
          if (len === need) hits.push(`${sName}/${f}=${len}`);
        }
      }
      console.log(`${code} need=${need}: ${hits.join(' | ') || 'NONE'}`);
    }
  });
});
