/**
 * 13코드 전체 — 스트림 × 매칭 × gap 공식 글로벌 탐색
 */
import { describe, it, expect } from 'vitest';
import { analyzeMasterValue, filterDigitsByClass } from '@/shared/utils/analysisEngine';
import {
  descriptionToSubBandSequence,
  findSubBandSequenceStarts,
  findTokenSubBandSequenceStarts,
  findDigitPatternStarts,
  filterNonOverlappingMatchStarts,
  buildDigitToTokenIndex,
} from '@/shared/utils/legacyCodeContentEngine';
import { buildPointValueTokens, filterPointValuesToSubBand } from '@/shared/utils/pointValuesCodeFlow';
import { getDigitSubBand } from '@/shared/utils/digitSubBand';
import {
  LEGACY_MASTER_00_CODE_CONTENT,
  expectedGapCount,
} from '@/shared/fixtures/legacy-code-content-expected';
import { LEGACY_MASTER_00_VALUE } from '@/shared/fixtures/legacy-master-00-value';
import { getLegacyStepCodeDefinition, LEGACY_STEP2_CODE_ORDER } from '@/shared/fixtures/legacy-step-code-catalog';

type Tokens = ReturnType<typeof buildPointValueTokens>;

function scoreAll(expected: Record<string, string>, actual: Record<string, number[]>) {
  let totalMatch = 0;
  let totalExp = 0;
  let exactCodes = 0;
  for (const code of LEGACY_STEP2_CODE_ORDER) {
    const exp = expected[code]?.split(',').map(Number);
    const got = actual[code];
    if (!exp || !got) continue;
    totalExp += exp.length;
    if (exp.length !== got.length) continue;
    let m = 0;
    for (let i = 0; i < exp.length; i++) if (exp[i] === got[i]) m++;
    totalMatch += m;
    if (m === exp.length) exactCodes++;
  }
  return { totalMatch, totalExp, exactCodes };
}

function makeGapFns(tokens: Tokens, lowPv: string) {
  const d2t = buildDigitToTokenIndex(lowPv);
  const tokenFirst: number[] = [];
  let c = 0;
  for (const tok of tokens) {
    tokenFirst.push(c);
    c += tok.isRun ? tok.value : 1;
  }
  const tokenLast = tokens.map((tok, ti) => tokenFirst[ti]! + (tok.isRun ? tok.value : 1) - 1);

  return {
    runElse1: (starts: number[], plen: number) => gapLoop(starts, plen, (f, t) => {
      if (f > t) return 1;
      const runs = tokens.slice(f, t + 1).filter((x) => x.isRun).length;
      return runs > 0 ? runs : 1;
    }),
    tokCount: (starts: number[], plen: number) => gapLoop(starts, plen, (f, t) => Math.max(1, f > t ? 1 : t - f + 1)),
    singleCount: (starts: number[], plen: number) => gapLoop(starts, plen, (f, t) => {
      if (f > t) return 1;
      return Math.max(1, tokens.slice(f, t + 1).filter((x) => !x.isRun).length);
    }),
    sumRunVal: (starts: number[], plen: number) => gapLoop(starts, plen, (f, t) => {
      if (f > t) return 1;
      return Math.max(1, tokens.slice(f, t + 1).reduce((s, x) => s + (x.isRun ? x.value : 0), 0));
    }),
    digitBetween: (starts: number[], plen: number) => gapLoop(starts, plen, (f, t) => {
      if (f > t) return 1;
      const endD = f > t ? 0 : tokenLast[f + plen - 1] ?? f + plen - 1;
      const nextD = tokenFirst[t + plen] ?? t;
      void endD;
      return 1;
    }),
    tokIdx: (starts: number[], plen: number) => {
      const g: number[] = [];
      for (let i = 0; i < starts.length - 1; i++) {
        g.push(Math.max(1, starts[i + 1]! - (starts[i]! + plen - 1)));
      }
      return g;
    },
    sPrimeDiff: (starts: number[], plen: number) => {
      const g: number[] = [];
      for (let i = 0; i < starts.length - 1; i++) {
        const endD = starts[i]! + plen - 1;
        g.push(Math.max(1, d2t[starts[i + 1]!]! - d2t[endD]!));
      }
      return g;
    },
    digitRunGap: (starts: number[], plen: number) => {
      const g: number[] = [];
      for (let i = 0; i < starts.length - 1; i++) {
        const endD = starts[i]! + plen - 1;
        const nextD = starts[i + 1]!;
        const from = d2t[endD]! + 1;
        const to = d2t[nextD]! - 1;
        if (from > to) g.push(1);
        else {
          const runs = tokens.slice(from, to + 1).filter((x) => x.isRun).length;
          g.push(runs > 0 ? runs : 1);
        }
      }
      return g;
    },
    overlapDeltaM1: (starts: number[], plen: number) => gapLoop(starts, plen, (f, t, i) => {
      if (f > t) return Math.max(1, starts[i + 1]! - starts[i]! - 1);
      const runs = tokens.slice(f, t + 1).filter((x) => x.isRun).length;
      return runs > 0 ? runs : 1;
    }),
  };

  function gapLoop(
    starts: number[],
    plen: number,
    fn: (from: number, to: number, i: number) => number,
  ) {
    const g: number[] = [];
    for (let i = 0; i < starts.length - 1; i++) {
      const from = starts[i]! + plen;
      const to = starts[i + 1]! - 1;
      g.push(fn(from, to, i));
    }
    return g;
  }
}

describe('global legacy algorithm search', () => {
  it('finds best global match+gap for all 13 codes', () => {
    const result = analyzeMasterValue('00', LEGACY_MASTER_00_VALUE);
    const lowPv = filterDigitsByClass(result.digits, 'low');
    const tokens = buildPointValueTokens(lowPv);
    const gapFns = makeGapFns(tokens, lowPv);

    const matchStrategies: Array<{
      label: string;
      getStarts: (code: string, sub: readonly import('@/shared/utils/digitSubBand').DigitSubBand[], plen: number) => number[];
    }> = [
      {
        label: 'lowPV/descTok',
        getStarts: (_c, sub) => findTokenSubBandSequenceStarts(lowPv, sub),
      },
      {
        label: 'lowPV/descDigit',
        getStarts: (_c, sub) => findSubBandSequenceStarts(lowPv, sub),
      },
      {
        label: 'lowPV/descTokNonOvlp',
        getStarts: (_c, sub) =>
          filterNonOverlappingMatchStarts(findTokenSubBandSequenceStarts(lowPv, sub), sub.length),
      },
      {
        label: 'lowPV/literal',
        getStarts: (code) => findDigitPatternStarts(lowPv, code),
      },
      {
        label: 'lowPV/descTokGreedy',
        getStarts: (_c, sub) => {
          const bands = tokens.map((t) => getDigitSubBand(t.sourceDigit)!);
          const starts: number[] = [];
          let i = 0;
          while (i <= bands.length - sub.length) {
            let ok = true;
            for (let j = 0; j < sub.length; j++) {
              if (bands[i + j] !== sub[j]) {
                ok = false;
                break;
              }
            }
            if (ok) {
              starts.push(i);
              i += sub.length;
            } else i += 1;
          }
          return starts;
        },
      },
    ];

    let best = { label: '', totalMatch: -1, exactCodes: 0, countHits: 0 };

    for (const strat of matchStrategies) {
      for (const [gapName, gapFn] of Object.entries(gapFns)) {
        const actual: Record<string, number[]> = {};
        let countHits = 0;
        for (const code of LEGACY_STEP2_CODE_ORDER) {
          const def = getLegacyStepCodeDefinition(code, 'low')!;
          const sub = descriptionToSubBandSequence(def.description, 'low')!;
          const starts = strat.getStarts(code, sub, sub.length);
          const expN = expectedGapCount(code)!;
          if (starts.length === expN + 1) countHits++;
          if (starts.length >= 2) actual[code] = gapFn(starts, sub.length);
        }
        const s = scoreAll(LEGACY_MASTER_00_CODE_CONTENT, actual);
        const label = `${strat.label}::${gapName}`;
        if (
          s.totalMatch > best.totalMatch ||
          (s.totalMatch === best.totalMatch && s.exactCodes > best.exactCodes) ||
          (s.totalMatch === best.totalMatch && countHits > best.countHits)
        ) {
          best = { label, totalMatch: s.totalMatch, exactCodes: s.exactCodes, countHits };
        }
      }
    }

    console.log('BEST GLOBAL:', best);
    console.log('total gaps in expected:', LEGACY_STEP2_CODE_ORDER.reduce((a, c) => a + (expectedGapCount(c) ?? 0), 0));

    // per-code with best strategy
    const sepIdx = best.label.indexOf('::');
    const stratLabel = best.label.slice(0, sepIdx);
    const gapLabel = best.label.slice(sepIdx + 2);
    const strat = matchStrategies.find((s) => s.label === stratLabel)!;
    const gapFn = gapFns[gapLabel as keyof typeof gapFns]!;

    console.log('\nPer-code (best global):');
    for (const code of LEGACY_STEP2_CODE_ORDER) {
      const def = getLegacyStepCodeDefinition(code, 'low')!;
      const sub = descriptionToSubBandSequence(def.description, 'low')!;
      const starts = strat.getStarts(code, sub, sub.length);
      const gaps = starts.length >= 2 ? gapFn(starts, sub.length) : [];
      const exp = LEGACY_MASTER_00_CODE_CONTENT[code]!.split(',').map(Number);
      let m = 0;
      if (gaps.length === exp.length) for (let i = 0; i < exp.length; i++) if (gaps[i] === exp[i]) m++;
      console.log(
        code,
        `starts ${starts.length}/${exp.length + 1}`,
        `match ${m}/${exp.length}`,
        m === exp.length ? 'EXACT' : '',
      );
    }

    expect(best.totalMatch).toBeGreaterThan(0);
  });
});
