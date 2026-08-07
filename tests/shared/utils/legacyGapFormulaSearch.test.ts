/**
 * 이명전기 Master 00 — description(저점/고점) 매칭 + gap 공식 전수 탐색
 */
import { describe, it, expect } from 'vitest';
import { analyzeMasterValue, filterDigitsByClass } from '@/shared/utils/analysisEngine';
import {
  buildDigitToTokenIndex,
  descriptionToSubBandSequence,
  findSubBandSequenceStarts,
  findTokenSubBandSequenceStarts,
  filterNonOverlappingMatchStarts,
} from '@/shared/utils/legacyCodeContentEngine';
import { getLegacyStepCodeDefinition } from '@/shared/fixtures/legacy-step-code-catalog';
import { LEGACY_MASTER_00_CODE_CONTENT } from '@/shared/fixtures/legacy-code-content-expected';
import { LEGACY_MASTER_00_VALUE } from '@/shared/fixtures/legacy-master-00-value';
import { buildPointValueTokens } from '@/shared/utils/pointValuesCodeFlow';

function loadPv() {
  const r = analyzeMasterValue('00', LEGACY_MASTER_00_VALUE);
  return { pv: filterDigitsByClass(r.digits, 'low'), s: r.lowRunLengths };
}

function runLengthToSubBand(value: number): 'lowLow' | 'lowHigh' {
  return value <= 2 ? 'lowLow' : 'lowHigh';
}

function findSubBandStartsOnRunLengths(runs: readonly number[], sequence: readonly ('lowLow' | 'lowHigh')[]) {
  const bands = runs.map(runLengthToSubBand);
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

function gapsRunIndexBetween(starts: readonly number[], patternLen: number) {
  const g: number[] = [];
  for (let i = 0; i < starts.length - 1; i++) {
    const from = starts[i]! + patternLen;
    const to = starts[i + 1]! - 1;
    g.push(Math.max(1, to - from + 1));
  }
  return g;
}

function gapsRunIndexEndToStart(starts: readonly number[], patternLen: number) {
  const g: number[] = [];
  for (let i = 0; i < starts.length - 1; i++) {
    g.push(Math.max(1, starts[i + 1]! - (starts[i]! + patternLen - 1)));
  }
  return g;
}

function score(expected: string, actual: string) {
  const e = expected.split(',');
  const a = actual.split(',').filter(Boolean);
  if (e.length !== a.length) return { match: 0, lenE: e.length, lenA: a.length };
  let match = 0;
  for (let i = 0; i < e.length; i++) if (e[i] === a[i]) match++;
  return { match, lenE: e.length, lenA: a.length };
}

function allGaps(
  pv: string,
  starts: readonly number[],
  patternLen: number,
  s: readonly number[],
) {
  const digitToToken = buildDigitToTokenIndex(pv);
  const out: Record<string, number[]> = {};

  out.digitStrictBetween = [];
  for (let i = 0; i < starts.length - 1; i++) {
    const end = starts[i]! + patternLen - 1;
    const next = starts[i + 1]!;
    out.digitStrictBetween.push(Math.max(1, next - end));
  }

  out.digitStepsBetween = [];
  for (let i = 0; i < starts.length - 1; i++) {
    const end = starts[i]! + patternLen;
    const next = starts[i + 1]!;
    out.digitStepsBetween.push(Math.max(1, next - end));
  }

  out.sPrimeEndToNext = [];
  for (let i = 0; i < starts.length - 1; i++) {
    const endTok = digitToToken[starts[i]! + patternLen - 1]!;
    const nextTok = digitToToken[starts[i + 1]!]!;
    out.sPrimeEndToNext.push(Math.max(1, nextTok - endTok));
  }

  out.sPrimeBetween = [];
  for (let i = 0; i < starts.length - 1; i++) {
    const from = digitToToken[starts[i]! + patternLen - 1]! + 1;
    const to = digitToToken[starts[i + 1]!]! - 1;
    out.sPrimeBetween.push(Math.max(1, to - from + 1));
  }

  out.tokenBetween = [];
  for (let i = 0; i < starts.length - 1; i++) {
    const from = starts[i]! + patternLen;
    const to = starts[i + 1]! - 1;
    out.tokenBetween.push(Math.max(1, to - from + 1));
  }

  out.tokenIdx = [];
  for (let i = 0; i < starts.length - 1; i++) {
    out.tokenIdx.push(Math.max(1, starts[i + 1]! - (starts[i]! + patternLen - 1)));
  }

  // token match starts → digit boundary gaps
  const tokenObjs = buildPointValueTokens(pv);
  const tokenFirstDigit: number[] = [];
  let digitCursor = 0;
  for (const tok of tokenObjs) {
    tokenFirstDigit.push(digitCursor);
    digitCursor += tok.isRun ? tok.value : 1;
  }
  const tokenLastDigit = tokenObjs.map(
    (tok, ti) => tokenFirstDigit[ti]! + (tok.isRun ? tok.value : 1) - 1,
  );

  out.tokMatch_digitBetween = [];
  out.tokMatch_digitStrict = [];
  for (let i = 0; i < starts.length - 1; i++) {
    const endD = tokenLastDigit[starts[i]! + patternLen - 1]!;
    const nextD = tokenFirstDigit[starts[i + 1]!]!;
    out.tokMatch_digitBetween.push(Math.max(1, nextD - endD));
    out.tokMatch_digitStrict.push(Math.max(1, nextD - endD - 1));
  }

  out.startToStart = starts.slice(1).map((s, i) => Math.max(1, s - starts[i]!));

  out.sRunBetween = [];
  for (let i = 0; i < starts.length - 1; i++) {
    // map digit end to approximate S index — use token as proxy for now
    const from = digitToToken[starts[i]! + patternLen - 1]! + 1;
    const to = digitToToken[starts[i + 1]!]! - 1;
    if (from > to || from >= s.length) {
      out.sRunBetween.push(1);
    } else {
      out.sRunBetween.push(Math.max(1, to - from + 1));
    }
  }

  return out;
}

describe('legacy gap formula exhaustive search', () => {
  it('finds best matchKind+gap for description-based patterns', async () => {
    const { pv, s } = loadPv();

    const codes = Object.keys(LEGACY_MASTER_00_CODE_CONTENT);

    for (const code of codes) {
      const expected = LEGACY_MASTER_00_CODE_CONTENT[code]!;
      const def = getLegacyStepCodeDefinition(code, 'low');
      const sub = descriptionToSubBandSequence(def!.description, 'low')!;

      const matchSets: Array<[string, number[]]> = [
        ['digitRaw', findSubBandSequenceStarts(pv, sub)],
        ['digitFilt', filterNonOverlappingMatchStarts(findSubBandSequenceStarts(pv, sub), sub.length)],
        ['tokenRaw', findTokenSubBandSequenceStarts(pv, sub)],
        ['tokenFilt', filterNonOverlappingMatchStarts(findTokenSubBandSequenceStarts(pv, sub), sub.length)],
      ];

      let best = { label: '', match: -1, lenE: 0, lenA: 0 };
      const allScores: Array<[string, number]> = [];

      const sStarts = findSubBandStartsOnRunLengths(s, sub as readonly ('lowLow' | 'lowHigh')[]);
      for (const [label, arr] of [
        ['sRunMatch/between', gapsRunIndexBetween(sStarts, sub.length)],
        ['sRunMatch/endToStart', gapsRunIndexEndToStart(sStarts, sub.length)],
      ] as const) {
        const sct = score(expected, arr.join(','));
        allScores.push([label, sct.match]);
        if (sct.match > best.match) best = { label, ...sct };
      }

      for (const [mLabel, starts] of matchSets) {
        if (starts.length < 2) continue;
        const gaps = allGaps(pv, starts, sub.length, s);
        for (const [gLabel, arr] of Object.entries(gaps)) {
          const sct = score(expected, arr.join(','));
          allScores.push([`${mLabel}/${gLabel}`, sct.match]);
          if (sct.match > best.match || (sct.match === best.match && sct.lenA === sct.lenE)) {
            best = { label: `${mLabel}/${gLabel}`, ...sct };
          }
        }
      }
      if (code === '234') {
        allScores.sort((a, b) => b[1] - a[1]);
        console.log('  top5', allScores.slice(0, 8));
      }
      console.log(`\n${code}: starts digitRaw=${findSubBandSequenceStarts(pv, sub).length} tokenRaw=${findTokenSubBandSequenceStarts(pv, sub).length} expGaps=${expected.split(',').length}`);
      console.log(`  BEST ${best.label} ${best.match}/${best.lenE}`);
      if (best.match === best.lenE) console.log('  *** EXACT ***');
    }

    expect(pv.length).toBeGreaterThan(0);
  });
});
