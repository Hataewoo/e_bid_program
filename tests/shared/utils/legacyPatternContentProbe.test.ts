/**
 * E-Myoung.exe 단서: SearchValue_Result_Between / _Duplicat / _STEP2_Low
 * → Code Values 10규칙 배열이 「내용」인지 전수 대조
 */
import { describe, it } from 'vitest';
import { analyzeMasterValue, filterDigitsByClass } from '@/shared/utils/analysisEngine';
import {
  CODE_VALUE_MAIN_RULES,
  CODE_VALUE_SUB_DETAIL_RULES,
  extractCodeValuesFromBaseSequence,
  collectValueRunLengths,
  countBetweenMarkerRule,
  type CodeValueSubPatterns,
} from '@/shared/utils/codeValueSubAnalysis';
import {
  buildPointValueTokens,
  filterPointValuesToSubBand,
} from '@/shared/utils/pointValuesCodeFlow';
import {
  LEGACY_MASTER_00_CODE_CONTENT,
} from '@/shared/fixtures/legacy-code-content-expected';
import { LEGACY_MASTER_00_VALUE } from '@/shared/fixtures/legacy-master-00-value';
import { LEGACY_STEP2_CODE_ORDER } from '@/shared/fixtures/legacy-step-code-catalog';

const PATTERN_FIELDS = [
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

function score(expected: number[], got: number[]) {
  if (expected.length !== got.length) return 0;
  let m = 0;
  for (let i = 0; i < expected.length; i++) if (expected[i] === got[i]) m++;
  return m;
}

function gapsBetweenIndices(indices: number[]): number[] {
  const g: number[] = [];
  for (let i = 0; i < indices.length - 1; i++) {
    g.push(Math.max(1, indices[i + 1]! - indices[i]!));
  }
  return g;
}

function gapsBetweenValues(values: number[]): number[] {
  const g: number[] = [];
  for (let i = 0; i < values.length - 1; i++) {
    g.push(Math.max(1, Math.abs(values[i + 1]! - values[i]!)));
  }
  return g;
}

/** code digit → marker/count Between (Duplicat + Between 조합 가설) */
function betweenOnCodeDigits(seq: number[], code: string, mode: 'between' | 'duplicat'): number[] {
  const digits = code.split('').map(Number);
  if (mode === 'duplicat') {
    const out: number[] = [];
    for (const d of digits) {
      out.push(...collectValueRunLengths(seq, d));
    }
    return out;
  }
  // markers = code digits, count values >= min digit
  if (digits.length < 2) return [];
  const markers = new Set(digits);
  const markerIdx = seq.map((v, i) => (markers.has(v) ? i : -1)).filter((i) => i >= 0);
  const g: number[] = [];
  for (let i = 0; i < markerIdx.length - 1; i++) {
    const from = markerIdx[i]! + 1;
    const to = markerIdx[i + 1]!;
    let c = 0;
    for (let j = from; j < to; j++) if (seq[j]! >= Math.min(...digits)) c++;
    g.push(Math.max(1, c));
  }
  return g;
}

describe('legacy pattern-as-content probe (E-Myoung SearchValue hypothesis)', () => {
  it('matches expected content against Code Values rule outputs', () => {
    const result = analyzeMasterValue('00', LEGACY_MASTER_00_VALUE);
    const pv = filterDigitsByClass(result.digits, 'low');

    const streams: Array<[string, number[]]> = [
      ['yellowS', result.lowRunLengths],
      ['sPrime', buildPointValueTokens(pv).map((t) => t.value)],
      ['sPrimeLL', buildPointValueTokens(filterPointValuesToSubBand(pv, 'lowLow')).map((t) => t.value)],
      ['sPrimeLH', buildPointValueTokens(filterPointValuesToSubBand(pv, 'lowHigh')).map((t) => t.value)],
      ['srcDigit', buildPointValueTokens(pv).map((t) => t.sourceDigit)],
    ];

    for (const code of LEGACY_STEP2_CODE_ORDER) {
      const exp = LEGACY_MASTER_00_CODE_CONTENT[code]!.split(',').map(Number);
      let best = { label: '', match: -1 };

      for (const [sName, seq] of streams) {
        const patterns = extractCodeValuesFromBaseSequence(seq, 'low');

        for (const field of PATTERN_FIELDS) {
          const arr = patterns[field];
          const direct = score(exp, arr);
          if (direct > best.match) best = { label: `${sName}/${field}/direct`, match: direct };

          const idxGaps = gapsBetweenIndices(
            arr.map((v, i) => i).length >= 2
              ? seq
                  .map((v, i) => (arr.includes(v) ? i : -1))
                  .filter((i) => i >= 0)
              : [],
          );
          const ig = score(exp, idxGaps);
          if (ig > best.match) best = { label: `${sName}/${field}/idxGaps`, match: ig };

          const vGaps = gapsBetweenValues(arr);
          const vg = score(exp, vGaps);
          if (vg > best.match) best = { label: `${sName}/${field}/valGaps`, match: vg };
        }

        for (const mode of ['between', 'duplicat'] as const) {
          const arr = betweenOnCodeDigits(seq, code, mode);
          const m = score(exp, arr);
          if (m > best.match) best = { label: `${sName}/codeDigit_${mode}`, match: m };
        }

        // marker = each code digit, count exact next pattern
        for (const d of code.split('').map(Number)) {
          const arr = countBetweenMarkerRule(seq, { markerExact: d, countMin: 1, countMax: 9, pairsOnly: true });
          const m = score(exp, arr);
          if (m > best.match) best = { label: `${sName}/between_marker${d}`, match: m };
        }
      }

      console.log(
        `${code}: ${best.match}/${exp.length} ${best.match === exp.length ? '*** EXACT ***' : ''} [${best.label}]`,
      );
    }
  });
});
