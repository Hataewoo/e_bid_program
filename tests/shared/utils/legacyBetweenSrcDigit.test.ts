/**
 * E-Myoung SearchValue_Result_Between 가설:
 * 「내용」= srcDigit(S′ source digit) 열에 Code Values Between 규칙 적용 결과
 */
import { describe, it, expect } from 'vitest';
import { analyzeMasterValue, filterDigitsByClass } from '@/shared/utils/analysisEngine';
import { extractCodeValuesFromBaseSequence } from '@/shared/utils/codeValueSubAnalysis';
import { buildPointValueTokens, filterPointValuesToSubBand } from '@/shared/utils/pointValuesCodeFlow';
import {
  LEGACY_MASTER_00_CODE_CONTENT,
} from '@/shared/fixtures/legacy-code-content-expected';
import { LEGACY_MASTER_00_VALUE } from '@/shared/fixtures/legacy-master-00-value';
import { getLegacyStepCodeDefinition, LEGACY_STEP2_CODE_ORDER } from '@/shared/fixtures/legacy-step-code-catalog';

const FIELDS = [
  'oneDuplicate',
  'commaAlpha_2_3',
  'plusAlpha_3_2',
  'plusAlpha_4_3',
  'plusAlpha_4_4',
  'threeOrMore',
  'fiveOrMore',
  'oneBetween',
  'alphaPlus_3_2',
  'alphaPlus_4_3',
] as const;

function score(_code: string, expected: number[], got: number[]) {
  void _code;
  if (expected.length !== got.length) return { match: 0, exact: false };
  let m = 0;
  for (let i = 0; i < expected.length; i++) if (expected[i] === got[i]) m++;
  return { match: m, exact: m === expected.length };
}

describe('SearchValue_Result_Between srcDigit hypothesis', () => {
  it('finds best stream×field per code and reports parity', () => {
    const r = analyzeMasterValue('00', LEGACY_MASTER_00_VALUE);
    const pv = filterDigitsByClass(r.digits, 'low');
    const streams: Record<string, number[]> = {
      srcDigit: buildPointValueTokens(pv).map((t) => t.sourceDigit),
      sPrime: buildPointValueTokens(pv).map((t) => t.value),
      yellowS: r.lowRunLengths,
      lowHigh: buildPointValueTokens(filterPointValuesToSubBand(pv, 'lowHigh')).map((t) => t.sourceDigit),
      lowLow: buildPointValueTokens(filterPointValuesToSubBand(pv, 'lowLow')).map((t) => t.sourceDigit),
    };

    let exactCount = 0;
    const recipes: string[] = [];

    for (const code of LEGACY_STEP2_CODE_ORDER) {
      const exp = LEGACY_MASTER_00_CODE_CONTENT[code]!.split(',').map(Number);
      const def = getLegacyStepCodeDefinition(code, 'low')!;
      let best = { label: '', match: -1, lenHit: false };

      for (const [sName, seq] of Object.entries(streams)) {
        const p = extractCodeValuesFromBaseSequence(seq, 'low');
        for (const f of FIELDS) {
          const got = p[f];
          const s = score(code, exp, got);
          const lenHit = got.length === exp.length;
          if (s.match > best.match || (s.match === best.match && lenHit && !best.lenHit)) {
            best = { label: `${sName}/${f}`, match: s.match, lenHit };
          }
          if (s.exact) {
            exactCount++;
            recipes.push(`${code}=${sName}/${f}`);
          }
        }
      }

      console.log(
        `${code} type=${def.type} ${best.match}/${exp.length} lenHit=${best.lenHit} ${best.match === exp.length ? 'EXACT' : ''} [${best.label}]`,
      );
    }

    console.log('\nExact:', exactCount, recipes.join(', '));
    expect(exactCount).toBeGreaterThanOrEqual(0);
  });
});
