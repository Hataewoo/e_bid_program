import { describe, it } from 'vitest';
import { analyzeMasterValue, filterDigitsByClass } from '@/shared/utils/analysisEngine';
import {
  descriptionToSubBandSequence,
  findDigitPatternStarts,
  findSubBandSequenceStarts,
  findTokenSubBandSequenceStarts,
  filterNonOverlappingMatchStarts,
} from '@/shared/utils/legacyCodeContentEngine';
import {
  buildPointValueTokens,
  buildPointValuesSequence,
  filterPointValuesToSubBand,
} from '@/shared/utils/pointValuesCodeFlow';
import { getDigitSubBand, type DigitSubBand } from '@/shared/utils/digitSubBand';
import { expectedGapCount } from '@/shared/fixtures/legacy-code-content-expected';
import { LEGACY_MASTER_00_VALUE } from '@/shared/fixtures/legacy-master-00-value';
import { getLegacyStepCodeDefinition, LEGACY_STEP2_CODE_ORDER } from '@/shared/fixtures/legacy-step-code-catalog';

function findSeqStarts<T>(arr: readonly T[], seq: readonly T[]): number[] {
  const starts: number[] = [];
  for (let i = 0; i <= arr.length - seq.length; i++) {
    let ok = true;
    for (let j = 0; j < seq.length; j++) {
      if (arr[i + j] !== seq[j]) {
        ok = false;
        break;
      }
    }
    if (ok) starts.push(i);
  }
  return starts;
}

function collapseRuns<T>(arr: readonly T[]): T[] {
  if (arr.length === 0) return [];
  const out: T[] = [arr[0]!];
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] !== arr[i - 1]) out.push(arr[i]!);
  }
  return out;
}

function runLengthSubBand(v: number): DigitSubBand {
  return v <= 2 ? 'lowLow' : 'lowHigh';
}

describe('legacy count-hit expanded probe', () => {
  it('exhaustive start-count search', () => {
    const result = analyzeMasterValue('00', LEGACY_MASTER_00_VALUE);
    const pv = filterDigitsByClass(result.digits, 'low');
    const tokens = buildPointValueTokens(pv);
    const sPrime = buildPointValuesSequence(pv);
    const sRuns = result.lowRunLengths;
    const subBands = pv.split('').map((ch) => getDigitSubBand(Number(ch))!);
    const tokBands = tokens.map((t) => getDigitSubBand(t.sourceDigit)!);
    const sRunBands = sRuns.map(runLengthSubBand);

    const streams: Array<[string, unknown[]]> = [
      ['pvDigit', pv.split('')],
      ['sPrime', sPrime],
      ['sRun', sRuns],
      ['tokBand', tokBands],
      ['digitBand', subBands],
      ['sRunBand', sRunBands],
      ['tokVal', tokens.map((t) => t.value)],
      ['tokSrc', tokens.map((t) => t.sourceDigit)],
      ['lowLow', filterPointValuesToSubBand(pv, 'lowLow').split('')],
      ['lowHigh', filterPointValuesToSubBand(pv, 'lowHigh').split('')],
      ['tokBandRun', collapseRuns(tokBands)],
      ['digitBandRun', collapseRuns(subBands)],
    ];

    for (const code of LEGACY_STEP2_CODE_ORDER) {
      const def = getLegacyStepCodeDefinition(code, 'low')!;
      const sub = descriptionToSubBandSequence(def.description, 'low')!;
      const need = expectedGapCount(code)! + 1;
      const hits: string[] = [];

      const patterns: Array<[string, unknown[], number]> = [
        ['descSub', sub, sub.length],
        ['literal', code.split('').map(Number), code.length],
        ['literalStr', code.split(''), code.length],
      ];

      for (const [sName, stream] of streams) {
        for (const [pName, pat, plen] of patterns) {
          if (stream.length < plen) continue;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const raw = findSeqStarts(stream as any[], pat as any[]);
          if (raw.length === need) hits.push(`${sName}/${pName}/raw`);
          const filt = filterNonOverlappingMatchStarts(raw, plen);
          if (filt.length === need) hits.push(`${sName}/${pName}/filt`);
        }
        if (sName === 'pvDigit') {
          const d = findSubBandSequenceStarts(pv, sub);
          if (d.length === need) hits.push('pvDigit/descDigit/raw');
          const t = findTokenSubBandSequenceStarts(pv, sub);
          if (t.length === need) hits.push('pvDigit/descTok/raw');
          const l = findDigitPatternStarts(pv, code);
          if (l.length === need) hits.push('pvDigit/lit/raw');
        }
      }

      console.log(`${code} need=${need}: ${hits.length ? hits.join(' | ') : 'NONE'}`);
    }
  });
});
