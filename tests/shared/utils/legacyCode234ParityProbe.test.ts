import { describe, expect, it } from 'vitest';
import { analyzeMasterValue, filterDigitsByClass } from '@/shared/utils/analysisEngine';
import {
  buildLegacyCodeContentRow,
  computeLegacyGapSequence,
  descriptionToSubBandSequence,
  findSubBandSequenceStarts,
  filterNonOverlappingMatchStarts,
  buildDigitToTokenIndex,
} from '@/shared/utils/legacyCodeContentEngine';
import { buildPointValueTokens } from '@/shared/utils/pointValuesCodeFlow';
import { getDigitSubBand } from '@/shared/utils/digitSubBand';
import { LEGACY_MASTER_00_CODE_CONTENT } from '@/shared/fixtures/legacy-code-content-expected';
import { LEGACY_MASTER_00_VALUE } from '@/shared/fixtures/legacy-master-00-value';

function score(expected: string, actual: string) {
  const e = expected.split(',');
  const a = actual.split(',').filter(Boolean);
  if (e.length !== a.length) return { lenE: e.length, lenA: a.length, match: 0 };
  let match = 0;
  for (let i = 0; i < e.length; i++) if (e[i] === a[i]) match++;
  return { lenE: e.length, lenA: a.length, match };
}

function gapsDigitMatchTokenBetween(
  pointValues: string,
  starts: readonly number[],
  patternLen: number,
) {
  const digitToToken = buildDigitToTokenIndex(pointValues);
  const g: number[] = [];
  for (let i = 0; i < starts.length - 1; i++) {
    const endDigit = starts[i]! + patternLen - 1;
    const nextDigit = starts[i + 1]!;
    const from = digitToToken[endDigit]! + 1;
    const to = digitToToken[nextDigit]! - 1;
    g.push(Math.max(1, to - from + 1));
  }
  return g;
}

function tokenBand(token: { value: number; sourceDigit: number; isRun: boolean }, mainBand: 'low' | 'high') {
  const d = token.sourceDigit;
  if (mainBand === 'low') return d <= 1 ? 'lowLow' : 'lowHigh';
  return d <= 7 ? 'highLow' : 'highHigh';
}

function findTokenBandStarts(pointValues: string, sequence: readonly string[], mainBand: 'low' | 'high') {
  const tokens = buildPointValueTokens(pointValues);
  const bands = tokens.map((t) => tokenBand(t, mainBand));
  const starts: number[] = [];
  for (let i = 0; i <= bands.length - sequence.length; i++) {
    let ok = true;
    for (let j = 0; j < sequence.length; j++) {
      if (bands[i + j] !== sequence[j]) {
        ok = false;
        break;
      }
    }
    if (ok) starts.push(i);
  }
  return starts;
}

function gapsTokenIndex(starts: readonly number[], patternLen: number) {
  const g: number[] = [];
  for (let i = 0; i < starts.length - 1; i++) {
    g.push(Math.max(1, starts[i + 1]! - (starts[i]! + patternLen - 1)));
  }
  return g;
}

function gapsTokenStartToStart(starts: readonly number[]) {
  return starts.slice(1).map((s, i) => s - starts[i]!);
}

function gapsTokenEndToStart(starts: readonly number[], patternLen: number) {
  return starts.slice(1).map((s, i) => s - (starts[i]! + patternLen));
}

function gapsTokenBetween(starts: readonly number[], patternLen: number) {
  const g: number[] = [];
  for (let i = 0; i < starts.length - 1; i++) {
    const from = starts[i]! + patternLen;
    const to = starts[i + 1]! - 1;
    g.push(Math.max(1, to - from + 1));
  }
  return g;
}

function gapsTokenIndexNoMin(starts: readonly number[], patternLen: number) {
  const g: number[] = [];
  for (let i = 0; i < starts.length - 1; i++) {
    g.push(starts[i + 1]! - (starts[i]! + patternLen - 1));
  }
  return g;
}

function gapsTokenBetweenNoMin(starts: readonly number[], patternLen: number) {
  const g: number[] = [];
  for (let i = 0; i < starts.length - 1; i++) {
    const from = starts[i]! + patternLen;
    const to = starts[i + 1]! - 1;
    const v = to - from + 1;
    g.push(v <= 0 ? 1 : v);
  }
  return g;
}

describe('legacy code 234 parity probe (Master 00)', () => {
  it('reports best-matching gap algorithm', () => {
    const result = analyzeMasterValue('00', LEGACY_MASTER_00_VALUE);
    const pv = filterDigitsByClass(result.digits, 'low');
    const code = '234';
    const expected = LEGACY_MASTER_00_CODE_CONTENT[code]!;
    const subSeq = descriptionToSubBandSequence('저점,고점,저점', 'low')!;

    const current = buildLegacyCodeContentRow(
      pv,
      { id: 0, code, type: '', description: '저점,고점,저점' },
      'low',
    );

    const digitRaw = findSubBandSequenceStarts(pv, subSeq);
    const digitFiltered = filterNonOverlappingMatchStarts(digitRaw, subSeq.length);
    const tokenRaw = findTokenBandStarts(pv, subSeq, 'low');

    const variants: Array<[string, string]> = [
      ['current', current.content],
      ['digitRaw_sPrime', computeLegacyGapSequence(pv, digitRaw, subSeq.length).join(',')],
      ['digitFiltered_sPrime', computeLegacyGapSequence(pv, digitFiltered, subSeq.length).join(',')],
      ['digitRaw_between', gapsDigitMatchTokenBetween(pv, digitRaw, subSeq.length).join(',')],
      ['digitFiltered_between', gapsDigitMatchTokenBetween(pv, digitFiltered, subSeq.length).join(',')],
      ['tokenRaw_tokenIdx', gapsTokenIndex(tokenRaw, subSeq.length).join(',')],
      ['tokenRaw_tokenIdxNoMin', gapsTokenIndexNoMin(tokenRaw, subSeq.length).join(',')],
      ['tokenRaw_startToStart', gapsTokenStartToStart(tokenRaw).join(',')],
      ['tokenRaw_endToStart', gapsTokenEndToStart(tokenRaw, subSeq.length).join(',')],
      ['tokenRaw_between', gapsTokenBetween(tokenRaw, subSeq.length).join(',')],
      ['tokenRaw_betweenNoMin', gapsTokenBetweenNoMin(tokenRaw, subSeq.length).join(',')],
      ['tokenRaw_misuseDigitGap', computeLegacyGapSequence(pv, tokenRaw, subSeq.length).join(',')],
    ];

    let best = { name: '', ...score(expected, '') };
    for (const [name, actual] of variants) {
      const s = score(expected, actual);
      if (s.match > best.match || (s.match === best.match && s.lenA === s.lenE)) {
        best = { name, ...s };
      }
      console.log(name, s);
    }
    console.log('BEST', best);
    const bestActual = variants.find(([n]) => n === best.name)?.[1] ?? '';
    const e = expected.split(',');
    const a = bestActual.split(',');
    for (let i = 0; i < Math.min(e.length, a.length); i++) {
      if (e[i] !== a[i]) console.log(`diff@${i}: expected=${e[i]} actual=${a[i]}`);
    }
    console.log('userCS_head', '1,1,5,1,3,5,8,11'.split(',').length);
    console.log('digitFiltered_head', computeLegacyGapSequence(pv, digitFiltered, subSeq.length).slice(0, 8).join(','));
    console.log('tokenIdx_head', gapsTokenIndex(tokenRaw, subSeq.length).slice(0, 8).join(','));
    console.log('expected_head', expected.slice(0, 24));

    // Diagnostic only — documents which variant is closest
    expect(pv.length).toBeGreaterThan(0);
  });
});
