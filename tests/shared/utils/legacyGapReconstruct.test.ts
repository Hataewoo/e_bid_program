/**
 * 정답 gap 시퀀스로부터 매칭 위치 역추적 — 후보 풀 × gap 공식
 */
import { describe, it } from 'vitest';
import { analyzeMasterValue, filterDigitsByClass } from '@/shared/utils/analysisEngine';
import {
  buildDigitToTokenIndex,
  descriptionToSubBandSequence,
  findDigitPatternStarts,
  findSubBandSequenceStarts,
  findTokenSubBandSequenceStarts,
} from '@/shared/utils/legacyCodeContentEngine';
import { buildPointValueTokens } from '@/shared/utils/pointValuesCodeFlow';
import {
  LEGACY_MASTER_00_CODE_CONTENT,
  expectedGapCount,
} from '@/shared/fixtures/legacy-code-content-expected';
import { LEGACY_MASTER_00_VALUE } from '@/shared/fixtures/legacy-master-00-value';
import {
  getLegacyStepCodeDefinition,
  LEGACY_STEP2_CODE_ORDER,
} from '@/shared/fixtures/legacy-step-code-catalog';

type GapFn = (
  tokens: ReturnType<typeof buildPointValueTokens>,
  d2t: number[],
  lastStart: number,
  nextStart: number,
  plen: number,
) => number;

const gapFns: Record<string, GapFn> = {
  runCount: (tokens, _d2t, last, next, plen) => {
    const from = last + plen;
    const to = next - 1;
    if (from > to) return 1;
    const n = tokens.slice(from, to + 1).filter((x) => x.isRun).length;
    return n > 0 ? n : 1;
  },
  digitRunGap: (tokens, d2t, last, next, plen) => {
    const endD = last + plen - 1;
    const from = d2t[endD]! + 1;
    const to = d2t[next]! - 1;
    if (from > to) return 1;
    const n = tokens.slice(from, to + 1).filter((x) => x.isRun).length;
    return n > 0 ? n : 1;
  },
  tokIdx: (_t, _d, last, next, plen) => Math.max(1, next - (last + plen - 1)),
  digitSpan: (_t, _d, last, next, plen) => Math.max(1, next - (last + plen - 1)),
  tokenCount: (_tokens, _d, last, next, plen) => {
    const from = last + plen;
    const to = next - 1;
    return from > to ? 1 : Math.max(1, to - from + 1);
  },
  singleCount: (tokens, _d, last, next, plen) => {
    const from = last + plen;
    const to = next - 1;
    if (from > to) return 1;
    return Math.max(1, tokens.slice(from, to + 1).filter((x) => !x.isRun).length);
  },
  sPrimeDiff: (_t, d2t, last, next, plen) => {
    const endD = last + plen - 1;
    return Math.max(1, d2t[next]! - d2t[endD]!);
  },
};

function reconstruct(
  candidates: readonly number[],
  expected: readonly number[],
  plen: number,
  gapFn: GapFn,
  tokens: ReturnType<typeof buildPointValueTokens>,
  d2t: number[],
  matchStream: 'digit' | 'token',
): number[] | null {
  if (expected.length === 0) return candidates.length >= 1 ? [candidates[0]!] : null;
  if (candidates.length < expected.length + 1) return null;

  const tryFrom = (firstIdx: number): number[] | null => {
    const path = [candidates[firstIdx]!];
    let ci = firstIdx + 1;

    for (const expGap of expected) {
      let found = -1;
      for (let j = ci; j < candidates.length; j++) {
        const g =
          matchStream === 'token'
            ? gapFn(tokens, d2t, path[path.length - 1]!, candidates[j]!, plen)
            : gapFn(tokens, d2t, path[path.length - 1]!, candidates[j]!, plen);
        if (g === expGap) {
          found = j;
          break;
        }
      }
      if (found < 0) return null;
      path.push(candidates[found]!);
      ci = found + 1;
    }
    return path;
  };

  for (let i = 0; i < candidates.length; i++) {
    const p = tryFrom(i);
    if (p) return p;
  }
  return null;
}

describe('legacy gap reconstruction', () => {
  it('tries to reconstruct exact match paths from expected gaps', () => {
    const result = analyzeMasterValue('00', LEGACY_MASTER_00_VALUE);
    const pv = filterDigitsByClass(result.digits, 'low');
    const tokens = buildPointValueTokens(pv);
    const d2t = buildDigitToTokenIndex(pv);

    let solved = 0;

    for (const code of LEGACY_STEP2_CODE_ORDER) {
      const def = getLegacyStepCodeDefinition(code, 'low')!;
      const sub = descriptionToSubBandSequence(def.description, 'low')!;
      const exp = LEGACY_MASTER_00_CODE_CONTENT[code]!.split(',').map(Number);
      const plen = sub.length;

      const pools: Array<[string, number[], 'digit' | 'token']> = [
        ['pv/digit', findSubBandSequenceStarts(pv, sub), 'digit'],
        ['pv/tok', findTokenSubBandSequenceStarts(pv, sub), 'token'],
        ['pv/lit', findDigitPatternStarts(pv, code), 'digit'],
      ];

      let hit = '';
      for (const [pLabel, cands, stream] of pools) {
        for (const [gLabel, gFn] of Object.entries(gapFns)) {
          const path = reconstruct(cands, exp, plen, gFn, tokens, d2t, stream);
          if (path && path.length === exp.length + 1) {
            hit = `${pLabel}::${gLabel} pathLen=${path.length}`;
            solved++;
            break;
          }
        }
        if (hit) break;
      }

      console.log(
        `${code}: ${hit || 'UNSOLVED'} (cands digit=${findSubBandSequenceStarts(pv, sub).length} tok=${findTokenSubBandSequenceStarts(pv, sub).length} need=${expectedGapCount(code)! + 1})`,
      );
    }

    console.log(`\nSolved: ${solved}/13`);
  });
});
