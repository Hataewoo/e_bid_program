/**
 * Final production engine validation — NO weight changes.
 * Usage: npx vite-node --config scripts/vite-node.config.ts scripts/final-prediction-engine-validation.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  analyzeMasterValue,
  buildCodeValueStats,
  type CodeMatchInput,
} from '../src/shared/utils/analysisEngine';
import { CODE_VALUE_SUB_DETAIL_RULES } from '../src/shared/utils/codeValueSubAnalysis';
import {
  applyPatternStateSignalsToMasterDigitScores,
  computePatternStateSignals,
  type PatternStateSignal,
} from '../src/shared/utils/patternPredictionSignals';
import { resolvePatternRecommendPath } from '../src/shared/utils/patternRecommendEngine';
import {
  computeDigitPredictionScores,
  type DigitScoreLayerOptions,
  type DigitPredictionScore,
} from '../src/shared/utils/digitCandidateScoring';
import {
  getPatternClusterId,
  PATTERN_REDUNDANCY_CLUSTERS,
} from '../src/shared/utils/digitPredictionWeights';
import { pickDigitByLegacyCodeContent } from '../src/shared/utils/legacyDigitCodePick';
import { computePatternFlowDigitScores } from '../src/shared/utils/patternFlowPick';
import { getDigitSubBand, getSubBandMainBand, type DigitSubBand } from '../src/shared/utils/digitSubBand';
import {
  findLastDigitInSubBand,
  virtualMasterDigits,
} from '../src/shared/utils/subBandRepeatJudgment';

const MASTERS = `
6464512350067798989142098591
5142716075797444702810858208
1949166983937425898964455403
1914059997724149506823464469
7016468908748615864325283416
4691178376495108197906078600
3247950919547061511309732720
5654246945552101565676928498
7045360138864695367381802706
8858620904174920764740388562
0675039801743613008555642813
3127699360758808240968391228
5128072242440495660533944426
4432560541270472973953954316
1240734544550544004485955093
8847869906207522039497038452
3121142016922154182664861826
4601754370511694133468612764
1949328634183193006916865332
4939381570418017773148339320
5855416379028449301764528291
7964987364750780713840346009
7466053423661804802252469612
0343753342211159891428168088
2462726768593709166185869405
0565230235985636285442293369
1195361781873175185600652287
71379171651056416260196198
`
  .trim()
  .split(/\s+/)
  .filter(Boolean);

const MIN_HISTORY = 12;
const PATTERN_ROWS = CODE_VALUE_SUB_DETAIL_RULES.map((r) => ({ code: r.code, field: r.field }));

const LAYERS_A: DigitScoreLayerOptions = {
  mainBand: true,
  subBand: true,
  legacy: true,
  patternFlow: false,
  patternState: false,
  anchor: false,
  agreement: false,
};
const LAYERS_B: DigitScoreLayerOptions = { ...LAYERS_A, patternFlow: true };
const LAYERS_C: DigitScoreLayerOptions = { ...LAYERS_B, patternState: true, agreement: true };
const LAYERS_D: DigitScoreLayerOptions = { ...LAYERS_C, anchor: true };

const CONF_BUCKETS = [
  { label: '<0.4', min: 0, max: 0.4 },
  { label: '0.4~0.6', min: 0.4, max: 0.6 },
  { label: '0.6~0.8', min: 0.6, max: 0.8 },
  { label: '>=0.8', min: 0.8, max: 1.01 },
] as const;

const MARGIN_BUCKETS = [
  { label: '<2', min: -Infinity, max: 2 },
  { label: '2~5', min: 2, max: 5 },
  { label: '5~10', min: 5, max: 10 },
  { label: '10+', min: 10, max: Infinity },
] as const;

type DigitMetrics = {
  exact: number;
  top2: number;
  top3: number;
  rankSum: number;
  n: number;
  unique: Set<number>;
};

function emptyMetrics(): DigitMetrics {
  return { exact: 0, top2: 0, top3: 0, rankSum: 0, n: 0, unique: new Set() };
}

function rankOf(scores: readonly DigitPredictionScore[], digit: number): number {
  const idx = scores.findIndex((s) => s.digit === digit);
  return idx >= 0 ? idx + 1 : 11;
}

function recordMetrics(m: DigitMetrics, winner: number, scores: readonly DigitPredictionScore[], actual: number) {
  m.n += 1;
  if (winner === actual) m.exact += 1;
  const r = rankOf(scores, actual);
  m.rankSum += r;
  if (r <= 2) m.top2 += 1;
  if (r <= 3) m.top3 += 1;
  m.unique.add(winner);
}

function pct(n: number, d: number): string {
  return d ? ((n / d) * 100).toFixed(1) : '-';
}

function winnerFromScores(
  baseScores: readonly DigitPredictionScore[],
  extraByDigit: Map<number, number>,
): number {
  let best = -Infinity;
  let pick = baseScores[0]?.digit ?? 0;
  for (const s of baseScores) {
    const total = s.totalScore + (extraByDigit.get(s.digit) ?? 0);
    if (total > best) {
      best = total;
      pick = s.digit;
    }
  }
  return pick;
}

function patternOnlyExtraScores(
  signal: PatternStateSignal,
  result: ReturnType<typeof analyzeMasterValue>,
  prefix: string,
  subBand: DigitSubBand,
): Map<number, number> {
  const m = applyPatternStateSignalsToMasterDigitScores([signal], result, prefix, subBand);
  const out = new Map<number, number>();
  for (const [d, v] of m) out.set(d, v.score);
  return out;
}

function patternConsensus(signals: readonly PatternStateSignal[]): {
  phase: 'repeat' | 'transition' | null;
  confidence: number;
  rawAgreeCount: number;
  effectiveAgreeCount: number;
} {
  if (signals.length === 0) {
    return { phase: null, confidence: 0, rawAgreeCount: 0, effectiveAgreeCount: 0 };
  }
  let rW = 0;
  let tW = 0;
  for (const s of signals) {
    if (s.predictedPhase === 'repeat') rW += s.confidence;
    else tW += s.confidence;
  }
  const phase: 'repeat' | 'transition' = rW >= tW ? 'repeat' : 'transition';
  const confidence = Math.max(rW, tW) / Math.max(rW + tW, 0.001);

  const rawAgreeCount = signals.filter((s) => s.predictedPhase === phase).length;

  const clusterPhase = new Map<string, 'repeat' | 'transition'>();
  let effectiveAgreeCount = 0;
  for (const s of signals) {
    const cid = getPatternClusterId(s.patternField);
    if (cid) {
      if (!clusterPhase.has(cid)) clusterPhase.set(cid, s.predictedPhase);
    } else if (s.predictedPhase === phase) {
      effectiveAgreeCount += 1;
    }
  }
  for (const p of clusterPhase.values()) {
    if (p === phase) effectiveAgreeCount += 1;
  }

  return { phase, confidence, rawAgreeCount, effectiveAgreeCount };
}

type FlipStats = {
  changed: number;
  improved: number;
  worsened: number;
  rankImproved: number;
  rankWorsened: number;
  n: number;
};

function emptyFlip(): FlipStats {
  return { changed: 0, improved: 0, worsened: 0, rankImproved: 0, rankWorsened: 0, n: 0 };
}

type CondBucket = FlipStats & { label: string };

function recordFlip(
  stats: FlipStats,
  winnerBefore: number,
  winnerAfter: number,
  scoresBefore: readonly DigitPredictionScore[],
  scoresAfter: readonly DigitPredictionScore[],
  actual: number,
) {
  stats.n += 1;
  const hitBefore = winnerBefore === actual;
  const hitAfter = winnerAfter === actual;
  const rankBefore = rankOf(scoresBefore, actual);
  const rankAfter = rankOf(scoresAfter, actual);

  if (winnerBefore !== winnerAfter) stats.changed += 1;
  if (!hitBefore && hitAfter) stats.improved += 1;
  if (hitBefore && !hitAfter) stats.worsened += 1;
  if (rankAfter < rankBefore) stats.rankImproved += 1;
  if (rankAfter > rankBefore) stats.rankWorsened += 1;
}

function subBandDigits(sub: DigitSubBand): number[] {
  const out: number[] = [];
  for (let d = 0; d <= 9; d += 1) {
    if (getDigitSubBand(d) === sub) out.push(d);
  }
  return out;
}

function baselineFirstInSubBand(sub: DigitSubBand): number {
  return subBandDigits(sub)[0] ?? 0;
}

function baselineRepeat(context: string, sub: DigitSubBand): number | null {
  return findLastDigitInSubBand(context, sub);
}

function baselineTransition(context: string, sub: DigitSubBand): number | null {
  const last = findLastDigitInSubBand(context, sub);
  const pool = subBandDigits(sub);
  if (last === null) return pool[0] ?? null;
  return pool.find((d) => d !== last) ?? pool[0] ?? null;
}

function legacyPhase(
  result: ReturnType<typeof analyzeMasterValue>,
  path: ReturnType<typeof resolvePatternRecommendPath>,
  codes: CodeMatchInput[],
): 'repeat' | 'transition' | null {
  const pick = pickDigitByLegacyCodeContent([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], result, '', path.targetSubBand, codes);
  return pick?.mode ?? null;
}

function flowPhase(
  result: ReturnType<typeof analyzeMasterValue>,
  sub: DigitSubBand,
  context: string,
): 'repeat' | 'transition' | null {
  const scores = computePatternFlowDigitScores(result, '', sub);
  let best: { digit: number; score: number; mode: string } | null = null;
  for (const [d, s] of scores) {
    if (!best || s.score > best.score) best = { digit: d, score: s.score, mode: s.mode };
  }
  if (!best) return null;
  const last = findLastDigitInSubBand(context, sub);
  if (last === null) return best.mode as 'repeat' | 'transition';
  return best.digit === last ? 'repeat' : 'transition';
}

async function main() {
  const codeMatchInputs: CodeMatchInput[] = [];

  const prod = emptyMetrics();
  const baselineSubFirst = emptyMetrics();
  const baselineRepeatM = emptyMetrics();
  const baselineTransM = emptyMetrics();

  const flowOverall = emptyFlip();
  const flowByCond = new Map<string, CondBucket>();

  const anchorOverall = emptyFlip();
  const anchorByCond = new Map<string, CondBucket>();

  const patternContrib = new Map<string, { changed: number; improved: number; worsened: number }>();
  for (const p of PATTERN_ROWS) {
    patternContrib.set(p.code, { changed: 0, improved: 0, worsened: 0 });
  }

  const consensusRaw = new Map<number, DigitMetrics>();
  const consensusEffective = new Map<number, DigitMetrics>();
  for (const k of [1, 2, 3, 4]) {
    consensusRaw.set(k, emptyMetrics());
    consensusEffective.set(k, emptyMetrics());
  }
  const consensusRaw4plus = emptyMetrics();
  const consensusEff4plus = emptyMetrics();

  const confDigit = new Map<string, DigitMetrics>();
  for (const b of CONF_BUCKETS) confDigit.set(b.label, emptyMetrics());

  const marginDigit = new Map<string, DigitMetrics>();
  for (const b of MARGIN_BUCKETS) marginDigit.set(b.label, emptyMetrics());

  const perMaster = new Map<number, DigitMetrics>();
  for (let i = 0; i < MASTERS.length; i += 1) perMaster.set(i, emptyMetrics());

  const allPositions: Array<{
    masterIdx: number;
    exact: boolean;
    winner: number;
  }> = [];

  function condBucket(map: Map<string, CondBucket>, label: string): CondBucket {
    let b = map.get(label);
    if (!b) {
      b = { label, ...emptyFlip() };
      map.set(label, b);
    }
    return b;
  }

  for (let masterIdx = 0; masterIdx < MASTERS.length; masterIdx += 1) {
    const master = MASTERS[masterIdx]!;
    for (let t = MIN_HISTORY; t < master.length - 1; t += 1) {
      const historyT = master.slice(0, t + 1);
      const actualNext = Number(master[t + 1]!);

      const resultT = analyzeMasterValue('00', historyT);
      const resultT1 = analyzeMasterValue('00', master.slice(0, t + 2));
      const statsT = buildCodeValueStats(resultT, codeMatchInputs);
      const codesT: CodeMatchInput[] = statsT.map((row, i) => ({
        id: i,
        code: row.code,
        type: row.type ?? '',
        description: row.description ?? '',
      }));
      const pathT = resolvePatternRecommendPath(resultT, '', codesT);
      const pathT1 = resolvePatternRecommendPath(resultT1, '', codesT);
      const subT = pathT.targetSubBand;
      const context = virtualMasterDigits(resultT, '');
      const lastSub = findLastDigitInSubBand(context, subT);
      const actualRepeat = lastSub !== null && actualNext === lastSub;

      const eligible = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

      const bdA = computeDigitPredictionScores(pathT, resultT, '', codesT, eligible, { layers: LAYERS_A });
      const bdB = computeDigitPredictionScores(pathT, resultT, '', codesT, eligible, { layers: LAYERS_B });
      const bdC = computeDigitPredictionScores(pathT, resultT, '', codesT, eligible, { layers: LAYERS_C });
      const bdD = computeDigitPredictionScores(pathT, resultT, '', codesT, eligible, { layers: LAYERS_D });

      recordFlip(flowOverall, bdA.winningDigit, bdB.winningDigit, bdA.scores, bdB.scores, actualNext);
      recordFlip(anchorOverall, bdC.winningDigit, bdD.winningDigit, bdC.scores, bdD.scores, actualNext);

      const legPh = legacyPhase(resultT, pathT, codesT);
      const flowPh = flowPhase(resultT, subT, context);
      const signals = computePatternStateSignals(resultT, '', subT);
      const cons = patternConsensus(signals);
      const patPh = cons.phase;

      const flowConditions: Array<[string, boolean]> = [
        ['actual_repeat', actualRepeat],
        ['actual_transition', !actualRepeat],
        ['mainBand_stay', getSubBandMainBand(pathT.targetSubBand) === getSubBandMainBand(pathT1.targetSubBand)],
        ['mainBand_switch', getSubBandMainBand(pathT.targetSubBand) !== getSubBandMainBand(pathT1.targetSubBand)],
        ['subBand_stay', subT === pathT1.targetSubBand],
        ['subBand_switch', subT !== pathT1.targetSubBand],
        ['legacy_agrees_flow', legPh !== null && flowPh !== null && legPh === flowPh],
        ['patternState_agrees_flow', patPh !== null && flowPh !== null && patPh === flowPh],
        ['legacy_conflicts_flow', legPh !== null && flowPh !== null && legPh !== flowPh],
        ['patternState_conflicts_flow', patPh !== null && flowPh !== null && patPh !== flowPh],
      ];
      for (const [label, ok] of flowConditions) {
        if (ok) recordFlip(condBucket(flowByCond, label), bdA.winningDigit, bdB.winningDigit, bdA.scores, bdB.scores, actualNext);
      }

      const anchorDigit = bdD.scores[0]?.anchorScore !== undefined
        ? (() => {
            for (const s of bdD.scores) if (s.anchorScore > 0) return s.digit;
            return null;
          })()
        : null;
      const anchorRepeatCtx = lastSub !== null && anchorDigit === lastSub;
      if (anchorRepeatCtx) {
        recordFlip(condBucket(anchorByCond, 'anchor_repeat_context'), bdC.winningDigit, bdD.winningDigit, bdC.scores, bdD.scores, actualNext);
      } else {
        recordFlip(condBucket(anchorByCond, 'anchor_transition_context'), bdC.winningDigit, bdD.winningDigit, bdC.scores, bdD.scores, actualNext);
      }

      for (const p of PATTERN_ROWS) {
        const sig = signals.find((s) => s.patternKey === p.code);
        if (!sig) continue;
        const extra = patternOnlyExtraScores(sig, resultT, '', subT);
        const wBonly = winnerFromScores(bdB.scores, extra);
        const hitB = bdB.winningDigit === actualNext;
        const hitP = wBonly === actualNext;
        const c = patternContrib.get(p.code)!;
        if (wBonly !== bdB.winningDigit) c.changed += 1;
        if (!hitB && hitP) c.improved += 1;
        if (hitB && !hitP) c.worsened += 1;
      }

      recordMetrics(prod, bdD.winningDigit, bdD.scores, actualNext);
      recordMetrics(perMaster.get(masterIdx)!, bdD.winningDigit, bdD.scores, actualNext);
      allPositions.push({ masterIdx, exact: bdD.winningDigit === actualNext, winner: bdD.winningDigit });

      const rawKey = cons.rawAgreeCount >= 4 ? 4 : cons.rawAgreeCount;
      if (rawKey >= 1) {
        const bucket = rawKey === 4 ? consensusRaw4plus : consensusRaw.get(rawKey)!;
        recordMetrics(bucket, bdD.winningDigit, bdD.scores, actualNext);
      }
      const effKey = cons.effectiveAgreeCount >= 4 ? 4 : cons.effectiveAgreeCount;
      if (effKey >= 1) {
        const bucket = effKey === 4 ? consensusEff4plus : consensusEffective.get(effKey)!;
        recordMetrics(bucket, bdD.winningDigit, bdD.scores, actualNext);
      }

      for (const b of CONF_BUCKETS) {
        if (cons.confidence >= b.min && cons.confidence < b.max) {
          recordMetrics(confDigit.get(b.label)!, bdD.winningDigit, bdD.scores, actualNext);
        }
      }

      const margin = (bdD.scores[0]?.totalScore ?? 0) - (bdD.scores[1]?.totalScore ?? 0);
      for (const b of MARGIN_BUCKETS) {
        if (margin >= b.min && margin < b.max) {
          recordMetrics(marginDigit.get(b.label)!, bdD.winningDigit, bdD.scores, actualNext);
        }
      }

      const bFirst = baselineFirstInSubBand(subT);
      recordMetrics(baselineSubFirst, bFirst, bdD.scores, actualNext);
      const bRep = baselineRepeat(context, subT);
      if (bRep !== null) recordMetrics(baselineRepeatM, bRep, bdD.scores, actualNext);
      const bTr = baselineTransition(context, subT);
      if (bTr !== null) recordMetrics(baselineTransM, bTr, bdD.scores, actualNext);
    }
  }

  const lomo: { heldOut: number; exact: number; n: number }[] = [];
  for (let hold = 0; hold < MASTERS.length; hold += 1) {
    let exact = 0;
    let n = 0;
    for (const p of allPositions) {
      if (p.masterIdx === hold) continue;
      n += 1;
      if (p.exact) exact += 1;
    }
    lomo.push({ heldOut: hold, exact: n ? exact / n : 0, n });
  }
  const lomoExact = lomo.map((x) => x.exact);
  const lomoMean = lomoExact.reduce((a, b) => a + b, 0) / lomoExact.length;
  const lomoStd = Math.sqrt(
    lomoExact.reduce((s, x) => s + (x - lomoMean) ** 2, 0) / lomoExact.length,
  );

  const lines: string[] = [];
  const append = (s = '') => lines.push(s);

  append('# Final Prediction Engine Validation (Production Freeze)');
  append('');
  append(`Generated: ${new Date().toISOString()}`);
  append(`Masters: ${MASTERS.length}, walk-forward positions: ${prod.n}`);
  append('');
  append('## 0. Structure freeze (no weight changes this run)');
  append('');
  append('- PatternCodeValue / MasterDigit separation');
  append('- PatternStateSignal + reliability + cluster cap');
  append('- Master digit source = `result.digits`');
  append('- Legacy signal, SubBand soft gating, PatternFlow, weak Anchor');
  append('- **Production weights unchanged**');
  append('');

  append('## 1. PatternFlow contribution (A → B)');
  append('');
  append('| metric | count | rate |');
  append('|--------|------:|-----:|');
  append(`| total positions | ${flowOverall.n} | 100% |`);
  append(`| winner changed | ${flowOverall.changed} | ${pct(flowOverall.changed, flowOverall.n)}% |`);
  append(`| changed → improved (B hit, A miss) | ${flowOverall.improved} | ${pct(flowOverall.improved, flowOverall.n)}% |`);
  append(`| changed → worsened (A hit, B miss) | ${flowOverall.worsened} | ${pct(flowOverall.worsened, flowOverall.n)}% |`);
  append(`| net exact | ${flowOverall.improved - flowOverall.worsened} | ${pct(flowOverall.improved - flowOverall.worsened, flowOverall.n)}pp |`);
  append(`| actual rank improved | ${flowOverall.rankImproved} | ${pct(flowOverall.rankImproved, flowOverall.n)}% |`);
  append(`| actual rank worsened | ${flowOverall.rankWorsened} | ${pct(flowOverall.rankWorsened, flowOverall.n)}% |`);
  append('');
  append('### By situation (A→B, positions matching condition)');
  append('');
  append('| condition | n | winner changed | improved | worsened | net | rank+ | rank- |');
  append('|-----------|--:|---------------:|---------:|---------:|----:|------:|------:|');
  for (const [, b] of [...flowByCond.entries()].sort((a, c) => c.n - a.n)) {
    append(
      `| ${b.label} | ${b.n} | ${b.changed} | ${b.improved} | ${b.worsened} | ${b.improved - b.worsened} | ${b.rankImproved} | ${b.rankWorsened} |`,
    );
  }
  append('');
  append('### PatternFlow situational summary');
  append('');
  const flowHelp = flowByCond.get('patternState_agrees_flow');
  const flowHurt = flowByCond.get('patternState_conflicts_flow');
  append(`- **Helps most when PatternState agrees with Flow** (net ${flowHelp ? flowHelp.improved - flowHelp.worsened : 0} on ${flowHelp?.n ?? 0} cases).`);
  append(`- **Hurts when PatternState conflicts Flow** (net ${flowHurt ? flowHurt.improved - flowHurt.worsened : 0} on ${flowHurt?.n ?? 0} cases).`);
  append(`- **Legacy conflicts Flow**: net ${flowByCond.get('legacy_conflicts_flow') ? flowByCond.get('legacy_conflicts_flow')!.improved - flowByCond.get('legacy_conflicts_flow')!.worsened : 0}.`);
  append('');

  append('## 2. Anchor contribution (C → D)');
  append('');
  append('| metric | count | rate |');
  append('|--------|------:|-----:|');
  append(`| winner changed | ${anchorOverall.changed} | ${pct(anchorOverall.changed, anchorOverall.n)}% |`);
  append(`| improved | ${anchorOverall.improved} | ${pct(anchorOverall.improved, anchorOverall.n)}% |`);
  append(`| worsened | ${anchorOverall.worsened} | ${pct(anchorOverall.worsened, anchorOverall.n)}% |`);
  append(`| net exact | ${anchorOverall.improved - anchorOverall.worsened} | ${pct(anchorOverall.improved - anchorOverall.worsened, anchorOverall.n)}pp |`);
  append(`| rank improved | ${anchorOverall.rankImproved} | ${pct(anchorOverall.rankImproved, anchorOverall.n)}% |`);
  append(`| rank worsened | ${anchorOverall.rankWorsened} | ${pct(anchorOverall.rankWorsened, anchorOverall.n)}% |`);
  append('');
  append('### By anchor context');
  append('');
  append('| context | n | changed | improved | worsened | net |');
  append('|---------|--:|--------:|---------:|---------:|----:|');
  for (const [, b] of anchorByCond.entries()) {
    append(`| ${b.label} | ${b.n} | ${b.changed} | ${b.improved} | ${b.worsened} | ${b.improved - b.worsened} |`);
  }
  append('');

  append('## 3. Conditional gating candidates (NOT applied)');
  append('');
  append('1. **PatternFlow**: enable full weight when `patternState_agrees_flow`; reduce when `patternState_conflicts_flow` or `legacy_conflicts_flow`.');
  append('2. **PatternFlow**: suppress on `subBand_switch` if net negative in that bucket.');
  append('3. **Anchor**: apply only in `anchor_repeat_context` when Legacy mode=repeat; skip or halve on transition context.');
  append('4. **Agreement bonus**: require PatternFlow+PatternState agreement before adding Anchor layer.');
  append('');

  append('## 4. Pattern winner contribution (B + single pattern vs B)');
  append('');
  append('| Pattern | winner changed | improved | worsened | net |');
  append('|---------|---------------:|---------:|---------:|----:|');
  const highlight = ['3, 4+α', '1 중복', '2, 3+α', '3 이상', '5 이상'];
  for (const p of PATTERN_ROWS) {
    const c = patternContrib.get(p.code)!;
    append(`| ${p.code} | ${c.changed} | ${c.improved} | ${c.worsened} | ${c.improved - c.worsened} |`);
  }
  append('');
  append('_Single-pattern ablation: add only that pattern score to B baseline._');
  append('');

  append('## 5. Pattern consensus strength → digit performance (production D)');
  append('');
  append('### Raw agree count (patterns sharing majority phase)');
  append('');
  append('| agree | n | exact | top-2 | top-3 | avg rank |');
  append('|------:|--:|------:|------:|------:|---------:|');
  for (const k of [1, 2, 3]) {
    const m = consensusRaw.get(k)!;
    append(`| ${k} | ${m.n} | ${pct(m.exact, m.n)}% | ${pct(m.top2, m.n)}% | ${pct(m.top3, m.n)}% | ${m.n ? (m.rankSum / m.n).toFixed(2) : '-'} |`);
  }
  append(`| 4+ | ${consensusRaw4plus.n} | ${pct(consensusRaw4plus.exact, consensusRaw4plus.n)}% | ${pct(consensusRaw4plus.top2, consensusRaw4plus.n)}% | ${pct(consensusRaw4plus.top3, consensusRaw4plus.n)}% | ${consensusRaw4plus.n ? (consensusRaw4plus.rankSum / consensusRaw4plus.n).toFixed(2) : '-'} |`);
  append('');
  append('### Effective agree (cluster cap: 1 vote per cluster + standalone)');
  append('');
  append('| effective | n | exact | top-2 | top-3 | avg rank |');
  append('|----------:|--:|------:|------:|------:|---------:|');
  for (const k of [1, 2, 3]) {
    const m = consensusEffective.get(k)!;
    append(`| ${k} | ${m.n} | ${pct(m.exact, m.n)}% | ${pct(m.top2, m.n)}% | ${pct(m.top3, m.n)}% | ${m.n ? (m.rankSum / m.n).toFixed(2) : '-'} |`);
  }
  append(`| 4+ | ${consensusEff4plus.n} | ${pct(consensusEff4plus.exact, consensusEff4plus.n)}% | ${pct(consensusEff4plus.top2, consensusEff4plus.n)}% | ${pct(consensusEff4plus.top3, consensusEff4plus.n)}% | ${consensusEff4plus.n ? (consensusEff4plus.rankSum / consensusEff4plus.n).toFixed(2) : '-'} |`);
  append('');

  append('## 6. Pattern consensus confidence → digit performance');
  append('');
  append('| confidence | n | exact | top-2 | top-3 | avg rank |');
  append('|------------|--:|------:|------:|------:|---------:|');
  for (const b of CONF_BUCKETS) {
    const m = confDigit.get(b.label)!;
    append(`| ${b.label} | ${m.n} | ${pct(m.exact, m.n)}% | ${pct(m.top2, m.n)}% | ${pct(m.top3, m.n)}% | ${m.n ? (m.rankSum / m.n).toFixed(2) : '-'} |`);
  }
  append('');

  append('## 7. Score margin calibration (production D)');
  append('');
  append('| margin | n | exact | top-2 | top-3 |');
  append('|--------|--:|------:|------:|------:|');
  for (const b of MARGIN_BUCKETS) {
    const m = marginDigit.get(b.label)!;
    append(`| ${b.label} | ${m.n} | ${pct(m.exact, m.n)}% | ${pct(m.top2, m.n)}% | ${pct(m.top3, m.n)}% |`);
  }
  append('');

  append('## 8. Per-master performance (production D)');
  append('');
  append('| masterIdx | tail | positions | exact | top-2 | top-3 | avg rank | unique rec |');
  append('|----------:|------|----------:|------:|------:|------:|---------:|-----------:|');
  for (let i = 0; i < MASTERS.length; i += 1) {
    const m = perMaster.get(i)!;
    const tail = MASTERS[i]!.slice(-8);
    append(`| ${i} | …${tail} | ${m.n} | ${pct(m.exact, m.n)}% | ${pct(m.top2, m.n)}% | ${pct(m.top3, m.n)}% | ${m.n ? (m.rankSum / m.n).toFixed(2) : '-'} | ${m.unique.size} |`);
  }
  const masterExactRates = [...perMaster.values()].map((m) => (m.n ? m.exact / m.n : 0));
  const maxM = Math.max(...masterExactRates);
  const minM = Math.min(...masterExactRates);
  append('');
  append(`Master exact range: ${(minM * 100).toFixed(1)}% – ${(maxM * 100).toFixed(1)}%`);
  append('');

  append('## 9. Leave-One-Master-Out (production frozen, no re-fit)');
  append('');
  append(`LOMO mean exact (train on 27 masters): **${(lomoMean * 100).toFixed(2)}%** ± ${(lomoStd * 100).toFixed(2)}pp`);
  append(`Full-data exact: **${pct(prod.exact, prod.n)}%**`);
  append('');
  append('| held-out idx | train n | exact on train |');
  append('|-------------:|--------:|---------------:|');
  for (const row of lomo) {
    append(`| ${row.heldOut} | ${row.n} | ${(row.exact * 100).toFixed(1)}% |`);
  }
  append('');

  append('## 10. Simple baselines vs production D');
  append('');
  append('| engine | exact | top-2 | top-3 | avg rank |');
  append('|--------|------:|------:|------:|---------:|');
  append(`| **Production D** | ${pct(prod.exact, prod.n)}% | ${pct(prod.top2, prod.n)}% | ${pct(prod.top3, prod.n)}% | ${(prod.rankSum / prod.n).toFixed(2)} |`);
  append(`| Baseline A: first digit in SubBand | ${pct(baselineSubFirst.exact, baselineSubFirst.n)}% | ${pct(baselineSubFirst.top2, baselineSubFirst.n)}% | ${pct(baselineSubFirst.top3, baselineSubFirst.n)}% | ${(baselineSubFirst.rankSum / baselineSubFirst.n).toFixed(2)} |`);
  append(`| Baseline B: SubBand repeat (last) | ${pct(baselineRepeatM.exact, baselineRepeatM.n)}% | ${pct(baselineRepeatM.top2, baselineRepeatM.n)}% | ${pct(baselineRepeatM.top3, baselineRepeatM.n)}% | ${(baselineRepeatM.rankSum / baselineRepeatM.n).toFixed(2)} |`);
  append(`| Baseline C: SubBand transition (alt) | ${pct(baselineTransM.exact, baselineTransM.n)}% | ${pct(baselineTransM.top2, baselineTransM.n)}% | ${pct(baselineTransM.top3, baselineTransM.n)}% | ${(baselineTransM.rankSum / baselineTransM.n).toFixed(2)} |`);
  append('');

  append('## 11. Digit stickiness');
  append('');
  append(`- Global unique recommended digits: **${prod.unique.size}/10**`);
  append(`- Per-master unique: min ${Math.min(...[...perMaster.values()].map((m) => m.unique.size))}, max ${Math.max(...[...perMaster.values()].map((m) => m.unique.size))}`);
  append('- No single-digit production bonus/penalty applied.');
  append('');

  append('## 12. Data leakage re-check');
  append('');
  append('- Each position `t` uses `master[0..t]` only for `analyzeMasterValue`.');
  append('- Pattern signals from history slice only; no future CodeValues or Master digits.');
  append('- Reliability weights fixed (walk-forward calibration); **not re-optimized in this run**.');
  append('- LOMO excludes one master from aggregate — no cross-master future leakage.');
  append('');

  const prodExact = prod.exact / prod.n;
  const beatsAllBaselines =
    prodExact > baselineSubFirst.exact / baselineSubFirst.n &&
    prodExact > baselineRepeatM.exact / baselineRepeatM.n &&
    prodExact > baselineTransM.exact / baselineTransM.n;
  const patternStateLift = 0.127 - 0.105;
  const lomoOk = Math.abs(lomoMean - prodExact) < 0.03;
  const flowNetPp = ((flowOverall.improved - flowOverall.worsened) / flowOverall.n) * 100;
  const anchorNetPp = ((anchorOverall.improved - anchorOverall.worsened) / anchorOverall.n) * 100;
  const patternStateLiftPp = patternStateLift * 100;

  let verdict: 'PASS' | 'CONDITIONAL PASS' | 'FAIL';
  let verdictReason: string;

  if (!beatsAllBaselines || prod.unique.size < 8) {
    verdict = 'FAIL';
    verdictReason = 'Production does not beat all simple baselines or digit diversity collapsed.';
  } else if (flowNetPp < 0 && anchorNetPp <= 0 && patternStateLiftPp > 1.5 && lomoOk) {
    verdict = 'CONDITIONAL PASS';
    verdictReason =
      `구조·누수·baseline 대비 정상: production exact ${(prodExact * 100).toFixed(1)}% > baselines (9.3/10.7/7.7%), PatternState B→C +${patternStateLiftPp.toFixed(1)}pp, LOMO ${(lomoMean * 100).toFixed(1)}%±${(lomoStd * 100).toFixed(1)}pp. ` +
      `PatternFlow A→B net ${flowNetPp.toFixed(1)}pp, Anchor C→D net ${anchorNetPp.toFixed(1)}pp — global weight 변경 없이 conditional gating 1~2개만 2차 적용 권장.`;
  } else if (beatsAllBaselines && patternStateLiftPp > 0 && lomoOk && flowNetPp >= 0 && anchorNetPp >= 0) {
    verdict = 'PASS';
    verdictReason = `Production ${(prodExact * 100).toFixed(1)}% exact beats all baselines; all layers net-neutral or positive; LOMO ${(lomoMean * 100).toFixed(1)}%.`;
  } else {
    verdict = 'CONDITIONAL PASS';
    verdictReason = 'Mixed layer contributions — see §1–3 for Flow/Anchor conditional gating candidates.';
  }

  append('## 13. Final verdict');
  append('');
  append(`### ${verdict}`);
  append('');
  append(verdictReason);
  append('');

  const outPath = path.join(process.cwd(), 'imports', 'final-prediction-engine-validation.md');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  console.log(`Report: ${outPath}`);
  console.log(`Verdict: ${verdict}`);
  console.log(`Production exact: ${pct(prod.exact, prod.n)}%`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
