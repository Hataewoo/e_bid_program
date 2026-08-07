/**
 * 코드별 독립 — 스트림 × 패턴 × 필터 × gap 공식 전수 탐색
 * (이명전기 규칙 미문서화 → 코드마다 다른 조합 허용)
 */
import { describe, it, expect } from 'vitest';
import { analyzeMasterValue, filterDigitsByClass, parseRunClassSequence } from '@/shared/utils/analysisEngine';
import {
  buildDigitToTokenIndex,
  descriptionToSubBandSequence,
  findDigitPatternStarts,
  findSubBandSequenceStarts,
  findTokenSubBandSequenceStarts,
  filterNonOverlappingMatchStarts,
} from '@/shared/utils/legacyCodeContentEngine';
import {
  buildPointValueTokens,
  filterPointValuesToSubBand,
} from '@/shared/utils/pointValuesCodeFlow';
import { getDigitSubBand, type DigitSubBand } from '@/shared/utils/digitSubBand';
import {
  LEGACY_MASTER_00_CODE_CONTENT,
} from '@/shared/fixtures/legacy-code-content-expected';
import { LEGACY_MASTER_00_VALUE } from '@/shared/fixtures/legacy-master-00-value';
import {
  getLegacyStepCodeDefinition,
  LEGACY_STEP2_CODE_ORDER,
} from '@/shared/fixtures/legacy-step-code-catalog';

type GapFn = (starts: number[], plen: number, ctx: Ctx) => number[];

interface Ctx {
  pv: string;
  tokens: ReturnType<typeof buildPointValueTokens>;
  d2t: number[];
  sRuns: number[];
}

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

function greedyStarts(all: number[], plen: number): number[] {
  const out: number[] = [];
  let i = 0;
  while (i < all.length) {
    out.push(all[i]!);
    i += 1;
    while (i < all.length && all[i]! < out[out.length - 1]! + plen) i += 1;
  }
  return out;
}

function makeGapFns(ctx: Ctx): Record<string, GapFn> {
  const { tokens, d2t } = ctx;
  const tokenFirst: number[] = [];
  let c = 0;
  for (const tok of tokens) {
    tokenFirst.push(c);
    c += tok.isRun ? tok.value : 1;
  }
  const tokenLast = tokens.map((tok, ti) => tokenFirst[ti]! + (tok.isRun ? tok.value : 1) - 1);

  const loop = (
    fn: (from: number, to: number, i: number, starts: number[], plen: number) => number,
  ): GapFn => (starts, plen) => {
    const g: number[] = [];
    for (let i = 0; i < starts.length - 1; i++) {
      const from = starts[i]! + plen;
      const to = starts[i + 1]! - 1;
      g.push(fn(from, to, i, starts, plen));
    }
    return g;
  };

  return {
    runCount: loop((f, t) => {
      if (f > t) return 1;
      const n = tokens.slice(f, t + 1).filter((x) => x.isRun).length;
      return n > 0 ? n : 1;
    }),
    singleCount: loop((f, t) => {
      if (f > t) return 1;
      return Math.max(1, tokens.slice(f, t + 1).filter((x) => !x.isRun).length);
    }),
    tokenCount: loop((f, t) => (f > t ? 1 : Math.max(1, t - f + 1))),
    sumRunVal: loop((f, t) => {
      if (f > t) return 1;
      return Math.max(1, tokens.slice(f, t + 1).reduce((s, x) => s + (x.isRun ? x.value : 0), 0));
    }),
    tokIdx: (starts, plen) => {
      const g: number[] = [];
      for (let i = 0; i < starts.length - 1; i++) {
        g.push(Math.max(1, starts[i + 1]! - (starts[i]! + plen - 1)));
      }
      return g;
    },
    startDelta: (starts) => starts.slice(1).map((s, i) => s - starts[i]!),
    digitRunGap: (starts, plen) => {
      const g: number[] = [];
      for (let i = 0; i < starts.length - 1; i++) {
        const endD = starts[i]! + plen - 1;
        const nextD = starts[i + 1]!;
        const from = d2t[endD]! + 1;
        const to = d2t[nextD]! - 1;
        if (from > to) g.push(1);
        else {
          const n = tokens.slice(from, to + 1).filter((x) => x.isRun).length;
          g.push(n > 0 ? n : 1);
        }
      }
      return g;
    },
    digitSpan: (starts, plen) => {
      const g: number[] = [];
      for (let i = 0; i < starts.length - 1; i++) {
        g.push(Math.max(1, starts[i + 1]! - (starts[i]! + plen - 1)));
      }
      return g;
    },
    digitBetween: (starts, plen) => {
      const g: number[] = [];
      for (let i = 0; i < starts.length - 1; i++) {
        g.push(Math.max(1, starts[i + 1]! - (starts[i]! + plen)));
      }
      return g;
    },
    sPrimeDiff: (starts, plen) => {
      const g: number[] = [];
      for (let i = 0; i < starts.length - 1; i++) {
        const endD = starts[i]! + plen - 1;
        g.push(Math.max(1, d2t[starts[i + 1]!]! - d2t[endD]!));
      }
      return g;
    },
    tokMatch_digitBetween: (starts, plen) => {
      const g: number[] = [];
      for (let i = 0; i < starts.length - 1; i++) {
        const endD = tokenLast[starts[i]! + plen - 1]!;
        const nextD = tokenFirst[starts[i + 1]!]!;
        g.push(Math.max(1, nextD - endD));
      }
      return g;
    },
    digitCharsBetween: (starts, plen) => {
      const g: number[] = [];
      for (let i = 0; i < starts.length - 1; i++) {
        g.push(Math.max(1, starts[i + 1]! - (starts[i]! + plen)));
      }
      return g;
    },
    sRunBetween: (starts, plen, _code) => {
      void _code;
      const g: number[] = [];
      for (let i = 0; i < starts.length - 1; i++) {
        const from = starts[i]! + plen;
        const to = starts[i + 1]! - 1;
        g.push(from > to ? 1 : Math.max(1, to - from + 1));
      }
      return g;
    },
    overlapOr1: loop((f, t, i, starts, plen) => {
      if (f > t) return Math.max(1, starts[i + 1]! - starts[i]! - plen + 1);
      const n = tokens.slice(f, t + 1).filter((x) => x.isRun).length;
      return n > 0 ? n : 1;
    }),
  };
}

function scoreGaps(expected: number[], got: number[]) {
  if (expected.length !== got.length) return 0;
  let m = 0;
  for (let i = 0; i < expected.length; i++) if (expected[i] === got[i]) m++;
  return m;
}

describe('legacy per-code independent search', () => {
  it('finds best stream×match×filter×gap per code', () => {
    const result = analyzeMasterValue('00', LEGACY_MASTER_00_VALUE);
    const pv = filterDigitsByClass(result.digits, 'low');
    const tokens = buildPointValueTokens(pv);
    const ctx: Ctx = { pv, tokens, d2t: buildDigitToTokenIndex(pv), sRuns: result.lowRunLengths };
    const gapFns = makeGapFns(ctx);

    const lowLow = filterPointValuesToSubBand(pv, 'lowLow');
    const lowHigh = filterPointValuesToSubBand(pv, 'lowHigh');
    const bandDigits = pv.split('').map((ch) => (Number(ch) <= 1 ? 0 : 1));

    const runSubBand = (v: number): DigitSubBand => (v <= 2 ? 'lowLow' : 'lowHigh');

    let exactTotal = 0;
    const summary: string[] = [];

    for (const code of LEGACY_STEP2_CODE_ORDER) {
      const def = getLegacyStepCodeDefinition(code, 'low')!;
      const sub = descriptionToSubBandSequence(def.description, 'low')!;
      const clsSeq = parseRunClassSequence(def.description)!;
      const clsOnPv = pv.split('').map((ch) => (Number(ch) <= 1 ? 'low' : 'high')) as ('low' | 'high')[];
      const exp = LEGACY_MASTER_00_CODE_CONTENT[code]!.split(',').map(Number);
      const expN = exp.length;
      const needStarts = expN + 1;

      type MatchCase = { label: string; starts: number[]; plen: number; gapCtx?: Ctx };
      const cases: MatchCase[] = [];

      const addCases = (label: string, raw: number[], plen: number, gapCtx = ctx) => {
        if (raw.length < 2) return;
        cases.push({ label: `${label}/raw`, starts: raw, plen, gapCtx });
        cases.push({ label: `${label}/nonOvlp`, starts: filterNonOverlappingMatchStarts(raw, plen), plen, gapCtx });
        cases.push({ label: `${label}/greedy`, starts: greedyStarts(raw, plen), plen, gapCtx });
      };

      addCases('pv/descDigit', findSubBandSequenceStarts(pv, sub), sub.length);
      addCases('pv/descTok', findTokenSubBandSequenceStarts(pv, sub), sub.length);
      addCases('pv/literal', findDigitPatternStarts(pv, code), code.length);
      addCases('pv/cls2', findSeqStarts(clsOnPv, clsSeq), clsSeq.length);
      addCases('pv/band01', findSeqStarts(bandDigits, sub.map((s) => (s === 'lowLow' ? 0 : 1))), sub.length);

      const llCtx = { ...ctx, pv: lowLow, tokens: buildPointValueTokens(lowLow), d2t: buildDigitToTokenIndex(lowLow) };
      addCases('lowLow/descDigit', findSubBandSequenceStarts(lowLow, sub), sub.length, llCtx);
      addCases('lowLow/literal', findDigitPatternStarts(lowLow, code), code.length, llCtx);

      const lhCtx = { ...ctx, pv: lowHigh, tokens: buildPointValueTokens(lowHigh), d2t: buildDigitToTokenIndex(lowHigh) };
      addCases('lowHigh/descDigit', findSubBandSequenceStarts(lowHigh, sub), sub.length, lhCtx);
      addCases('lowHigh/literal', findDigitPatternStarts(lowHigh, code), code.length, lhCtx);

      const sBands = ctx.sRuns.map(runSubBand);
      addCases('sRun/descSub', findSeqStarts(sBands, sub), sub.length, ctx);
      addCases('sPrime/descSub', findSeqStarts(tokens.map((t) => getDigitSubBand(t.sourceDigit)!), sub), sub.length);

      const tokVals = tokens.map((t) => t.value);
      addCases('tokVal/literal', findSeqStarts(tokVals, code.split('').map(Number)), code.length);

      let best = { label: '', match: -1, starts: 0, countHit: false };

      for (const mc of cases) {
        if (mc.starts.length < 2) continue;
        const countHit = mc.starts.length === needStarts;
        for (const [gName, gFn] of Object.entries(gapFns)) {
          const got = gFn(mc.starts, mc.plen, mc.gapCtx ?? ctx);
          const m = scoreGaps(exp, got);
          const label = `${mc.label}::${gName}`;
          if (
            m > best.match ||
            (m === best.match && countHit && !best.countHit) ||
            (m === best.match && countHit === best.countHit && mc.starts.length === needStarts)
          ) {
            best = { label, match: m, starts: mc.starts.length, countHit };
          }
          if (m === expN) {
            console.log(`*** EXACT ${code}: ${label} starts=${mc.starts.length}`);
            exactTotal++;
          }
        }
      }

      summary.push(
        `${code}: need=${needStarts} best=${best.match}/${expN} starts=${best.starts} countHit=${best.countHit} [${best.label}]`,
      );
    }

    console.log('\n=== Per-code best ===\n' + summary.join('\n'));
    console.log(`\nExact hits: ${exactTotal}`);

    expect(exactTotal).toBeGreaterThanOrEqual(0);
  });
});
