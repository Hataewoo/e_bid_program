/**
 * Walk-forward predictive validation for 10 Code Value patterns.
 * Usage: npx vite-node --config scripts/vite-node.config.ts scripts/pattern-predictive-validation.ts
 *
 * Measures PatternState prediction skill — NOT digit frequency.
 * Includes ablation A/B/C/D and master-level train/validation split.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import {
  analyzeMasterValue,
  buildCodeValueStats,
  type CodeMatchInput,
} from '../src/shared/utils/analysisEngine';
import {
  CODE_VALUE_SUB_DETAIL_RULES,
  type CodeValueSubPatterns,
} from '../src/shared/utils/codeValueSubAnalysis';
import {
  computePatternStateSignals,
  type PatternBandBehavior,
  type PatternRunExpectation,
  type PatternStateSignal,
} from '../src/shared/utils/patternPredictionSignals';
import { resolvePatternRecommendPath } from '../src/shared/utils/patternRecommendEngine';
import { computeDigitPredictionScores, type DigitScoreLayerOptions } from '../src/shared/utils/digitCandidateScoring';
import {
  DIGIT_PREDICTION_WEIGHTS,
  PATTERN_RELIABILITY,
  PATTERN_REDUNDANCY_CLUSTERS,
  CLUSTER_DIMINISHING_FACTOR,
} from '../src/shared/utils/digitPredictionWeights';
import {
  computeLegacyDigitSignals,
  pickDigitByLegacyCodeContent,
} from '../src/shared/utils/legacyDigitCodePick';
import { computePatternFlowDigitScores } from '../src/shared/utils/patternFlowPick';
import {
  buildPointValueTokens,
  filterPointValuesToSubBand,
  getSidePointValues,
} from '../src/shared/utils/pointValuesCodeFlow';
import { getSubBandMainBand, type DigitSubBand } from '../src/shared/utils/digitSubBand';
import { isPatternCountField } from '../src/shared/utils/patternDigitGuard';
import { sliceRecentDigitScoreTail, RECENT_DIGIT_SCORE_TAIL } from '../src/shared/utils/recentCompare';
import type { SubBandPhase } from '../src/shared/utils/subBandRepeatJudgment';
import type { DigitClass } from '../src/shared/utils/analysisEngine';

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
const CALIBRATION_MASTER_COUNT = Math.floor(MASTERS.length * 0.7);
const TAIL_LENGTHS = [6, 8, 12, 16, 24] as const;

/** Pre-adjustment walk-forward baseline (418 positions, v1.2.5) */
const BEFORE_METRICS = {
  digitExact: 0.117,
  digitTop2: 0.199,
  digitTop3: 0.282,
  digitAvgRank: 5.56,
  threeOrMorePhaseAcc: 0.044,
  fiveOrMorePhaseAcc: 0.034,
  legacyConflictB: 29,
  legacyConflictA: 15,
} as const;
const CONF_BUCKETS = [
  { label: '<0.4', min: 0, max: 0.4 },
  { label: '0.4~0.6', min: 0.4, max: 0.6 },
  { label: '0.6~0.8', min: 0.6, max: 0.8 },
  { label: '>=0.8', min: 0.8, max: 1.01 },
] as const;

const PATTERN_ROWS = CODE_VALUE_SUB_DETAIL_RULES.map((r) => ({
  code: r.code,
  field: r.field,
  label: r.code.replace(/\s/g, ''),
}));

type Confusion = {
  predRepeat: number;
  predTransition: number;
  actRepeat: number;
  actTransition: number;
  rr: number;
  rt: number;
  tr: number;
  tt: number;
};

type PatternAcc = {
  code: string;
  field: keyof CodeValueSubPatterns;
  totalPositions: number;
  fired: number;
  phaseCorrect: number;
  phaseScored: number;
  runCorrect: number;
  runScored: number;
  bandCorrect: number;
  bandScored: number;
  bandUncertainPred: number;
  confSum: number;
  confBins: Map<string, { n: number; correct: number }>;
  confusion: Confusion;
  tailPhaseCorrect: Map<number, number>;
  tailPhaseScored: Map<number, number>;
};

function emptyConfusion(): Confusion {
  return {
    predRepeat: 0,
    predTransition: 0,
    actRepeat: 0,
    actTransition: 0,
    rr: 0,
    rt: 0,
    tr: 0,
    tt: 0,
  };
}

function initPatternStats(): Map<string, PatternAcc> {
  const m = new Map<string, PatternAcc>();
  for (const p of PATTERN_ROWS) {
    m.set(p.code, {
      code: p.code,
      field: p.field,
      totalPositions: 0,
      fired: 0,
      phaseCorrect: 0,
      phaseScored: 0,
      runCorrect: 0,
      runScored: 0,
      bandCorrect: 0,
      bandScored: 0,
      bandUncertainPred: 0,
      confSum: 0,
      confBins: new Map(CONF_BUCKETS.map((b) => [b.label, { n: 0, correct: 0 }])),
      confusion: emptyConfusion(),
      tailPhaseCorrect: new Map(TAIL_LENGTHS.map((t) => [t, 0])),
      tailPhaseScored: new Map(TAIL_LENGTHS.map((t) => [t, 0])),
    });
  }
  return m;
}

function trailingRunLength(seq: readonly number[]): number {
  if (seq.length === 0) return 0;
  const last = seq[seq.length - 1]!;
  let n = 1;
  for (let i = seq.length - 2; i >= 0; i -= 1) {
    if (seq[i] !== last) break;
    n += 1;
  }
  return n;
}

function trailingCountSinceMarkerOne(seq: readonly number[]): number {
  let count = 0;
  for (let i = seq.length - 1; i >= 0; i -= 1) {
    if (seq[i] === 1) break;
    count += 1;
  }
  return count;
}

function getSPrime(
  digits: string,
  subBand: DigitSubBand,
  tailLength?: number,
): number[] {
  const result = analyzeMasterValue('00', digits);
  const side: DigitClass = getSubBandMainBand(subBand) === 'low' ? 'low' : 'high';
  const pv = getSidePointValues(result, '', side);
  let filtered = filterPointValuesToSubBand(pv, subBand);
  if (filtered.length === 0) filtered = pv;
  const tokens = buildPointValueTokens(filtered);
  const sliced =
    tailLength !== undefined
      ? sliceRecentDigitScoreTail(tokens, tailLength)
      : sliceRecentDigitScoreTail(tokens);
  return sliced.map((t) => t.value);
}

/** Ground-truth phase from t→t+1 Pattern CodeValue sequence transition (no frequency). */
function actualPhaseFromTransition(
  field: keyof CodeValueSubPatterns,
  sPrimeT: readonly number[],
  sPrimeT1: readonly number[],
): SubBandPhase | null {
  if (sPrimeT1.length <= sPrimeT.length || sPrimeT.length === 0) return null;

  const lastT = sPrimeT.at(-1)!;
  const lastT1 = sPrimeT1.at(-1)!;

  if (field === 'oneDuplicate' || isPatternCountField(field)) {
    const runT = trailingRunLength(sPrimeT);
    const runT1 = trailingRunLength(sPrimeT1);
    if (lastT1 === lastT && runT1 > runT) return 'repeat';
    return 'transition';
  }

  if (field === 'oneBetween') {
    const progT = trailingCountSinceMarkerOne(sPrimeT);
    const progT1 = trailingCountSinceMarkerOne(sPrimeT1);
    if (lastT1 === lastT && progT1 > progT) return 'repeat';
    return 'transition';
  }

  const progT = trailingCountSinceMarkerOne(sPrimeT);
  const progT1 = trailingCountSinceMarkerOne(sPrimeT1);
  if (lastT1 === lastT && progT1 >= progT) return 'repeat';
  return 'transition';
}

function actualRunExpectation(phase: SubBandPhase): PatternRunExpectation {
  return phase === 'repeat' ? 'continue' : 'break';
}

function actualBandBehavior(subT: DigitSubBand, subT1: DigitSubBand): PatternBandBehavior {
  return subT === subT1 ? 'stay' : 'switch';
}

function pct(n: number, d: number): string {
  return d ? ((n / d) * 100).toFixed(1) : '-';
}

type DigitRunMetrics = {
  exact: number;
  top2: number;
  top3: number;
  rankSum: number;
  marginSum: number;
  n: number;
  unique: Set<number>;
};

function emptyDigitMetrics(): DigitRunMetrics {
  return { exact: 0, top2: 0, top3: 0, rankSum: 0, marginSum: 0, n: 0, unique: new Set() };
}

function recordDigitMetrics(m: DigitRunMetrics, winner: number, scores: { digit: number; totalScore: number }[], actual: number) {
  m.n += 1;
  if (winner === actual) m.exact += 1;
  const rank = scores.findIndex((s) => s.digit === actual) + 1;
  m.rankSum += rank > 0 ? rank : 11;
  if (rank > 0 && rank <= 2) m.top2 += 1;
  if (rank > 0 && rank <= 3) m.top3 += 1;
  m.marginSum += (scores[0]?.totalScore ?? 0) - (scores[1]?.totalScore ?? 0);
  m.unique.add(winner);
}

const ABLATION_LAYERS: Record<'A' | 'B' | 'C' | 'D', DigitScoreLayerOptions> = {
  A: { mainBand: true, subBand: true, legacy: true, patternFlow: false, patternState: false, anchor: false, agreement: false },
  B: { mainBand: true, subBand: true, legacy: true, patternFlow: true, patternState: false, anchor: false, agreement: false },
  C: { mainBand: true, subBand: true, legacy: true, patternFlow: true, patternState: true, anchor: false, agreement: true },
  D: { mainBand: true, subBand: true, legacy: true, patternFlow: true, patternState: true, anchor: true, agreement: true },
};

function codeStatsToMatchInputs(stats: ReturnType<typeof buildCodeValueStats>): CodeMatchInput[] {
  return stats.map((row) => ({
    id: row.codeId,
    code: row.code,
    type: row.type ?? '',
    description: row.description ?? '',
  }));
}

function patternConsensusPhase(signals: PatternStateSignal[]): SubBandPhase | null {
  if (signals.length === 0) return null;
  let r = 0;
  let t = 0;
  for (const s of signals) {
    if (s.predictedPhase === 'repeat') r += s.confidence;
    else t += s.confidence;
  }
  if (r === t) return null;
  return r > t ? 'repeat' : 'transition';
}

function legacyDirection(result: ReturnType<typeof analyzeMasterValue>, path: ReturnType<typeof resolvePatternRecommendPath>, codes: CodeMatchInput[]) {
  const eligible = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const pick = pickDigitByLegacyCodeContent(eligible, result, '', path.targetSubBand, codes);
  return pick?.mode ?? null;
}

function patternFlowDirection(result: ReturnType<typeof analyzeMasterValue>, subBand: DigitSubBand) {
  const scores = computePatternFlowDigitScores(result, '', subBand);
  let best: { digit: number; score: number; mode: string } | null = null;
  for (const [d, s] of scores) {
    if (!best || s.score > best.score) best = { digit: d, score: s.score, mode: s.mode };
  }
  return best?.mode ?? null;
}

async function main() {
  const prisma = new PrismaClient();
  const dbCodes = await prisma.code.findMany();
  await prisma.$disconnect();
  const codeMatchInputs: CodeMatchInput[] = dbCodes.map((c) => ({
    id: c.id,
    code: c.code,
    type: c.type ?? '',
    description: c.description ?? '',
  }));

  const patternStats = initPatternStats();
  let totalPositions = 0;
  let positionsWithAnyPattern = 0;

  const baselinePersist = { correct: 0, scored: 0 };
  const baselineRepeat = { correct: 0, scored: 0 };
  const baselineTransition = { correct: 0, scored: 0 };
  const modelPhase = { correct: 0, scored: 0 };

  const agreementPairs = new Map<string, { same: number; opposite: number; bothCorrect: number; bothWrong: number; n: number }>();

  const digitBase = { exact: 0, top2: 0, top3: 0, rankSum: 0, marginSum: 0, n: 0, unique: new Set<number>() };
  const digitFull = { exact: 0, top2: 0, top3: 0, rankSum: 0, marginSum: 0, n: 0, unique: new Set<number>() };
  const patternChangedWinner = { changed: 0, improved: 0, worsened: 0, n: 0 };

  const legacyConflict = { A: 0, B: 0, C: 0, D: 0, E: 0, n: 0 };

  const ablationMetrics = {
    A: emptyDigitMetrics(),
    B: emptyDigitMetrics(),
    C: emptyDigitMetrics(),
    D: emptyDigitMetrics(),
  };
  const valMetrics = emptyDigitMetrics();
  const fullMetrics = emptyDigitMetrics();

  for (let masterIdx = 0; masterIdx < MASTERS.length; masterIdx += 1) {
    const master = MASTERS[masterIdx]!;
    const isValidationMaster = masterIdx >= CALIBRATION_MASTER_COUNT;
    for (let t = MIN_HISTORY; t < master.length - 1; t += 1) {
      const historyT = master.slice(0, t + 1);
      const historyT1 = master.slice(0, t + 2);
      const actualNext = Number(master[t + 1]!);
      totalPositions += 1;

      const resultT = analyzeMasterValue('00', historyT);
      const resultT1 = analyzeMasterValue('00', historyT1);
      const codeValueStatsT = buildCodeValueStats(resultT, codeMatchInputs);
      const codesT = codeStatsToMatchInputs(codeValueStatsT);
      const pathT = resolvePatternRecommendPath(resultT, '', codesT);
      const pathT1 = resolvePatternRecommendPath(resultT1, '', codesT);
      const subT = pathT.targetSubBand;
      const subT1 = pathT1.targetSubBand;
      const actualBand = actualBandBehavior(subT, subT1);

      const signalsT = computePatternStateSignals(resultT, '', subT);
      if (signalsT.length > 0) positionsWithAnyPattern += 1;

      const sPrimeT = getSPrime(historyT, subT);
      const sPrimeT1 = getSPrime(historyT1, subT1);

      const signalByCode = new Map(signalsT.map((s) => [s.patternKey, s]));

      for (const p of PATTERN_ROWS) {
        const acc = patternStats.get(p.code)!;
        acc.totalPositions += 1;
        const sig = signalByCode.get(p.code);
        if (!sig) continue;
        acc.fired += 1;
        acc.confSum += sig.confidence;

        const actPhase = actualPhaseFromTransition(p.field, sPrimeT, sPrimeT1);
        if (actPhase === null) continue;

        acc.phaseScored += 1;
        modelPhase.scored += 1;
        if (sig.predictedPhase === actPhase) {
          acc.phaseCorrect += 1;
          modelPhase.correct += 1;
        }

        const actRun = actualRunExpectation(actPhase);
        if (sig.runExpectation !== 'uncertain') {
          acc.runScored += 1;
          if (sig.runExpectation === actRun) acc.runCorrect += 1;
        }

        if (sig.bandBehavior === 'uncertain') {
          acc.bandUncertainPred += 1;
        } else {
          acc.bandScored += 1;
          if (sig.bandBehavior === actualBand) acc.bandCorrect += 1;
        }

        const c = acc.confusion;
        if (sig.predictedPhase === 'repeat') c.predRepeat += 1;
        else c.predTransition += 1;
        if (actPhase === 'repeat') c.actRepeat += 1;
        else c.actTransition += 1;
        if (sig.predictedPhase === 'repeat' && actPhase === 'repeat') c.rr += 1;
        if (sig.predictedPhase === 'repeat' && actPhase === 'transition') c.rt += 1;
        if (sig.predictedPhase === 'transition' && actPhase === 'repeat') c.tr += 1;
        if (sig.predictedPhase === 'transition' && actPhase === 'transition') c.tt += 1;

        for (const b of CONF_BUCKETS) {
          if (sig.confidence >= b.min && sig.confidence < b.max) {
            const bin = acc.confBins.get(b.label)!;
            bin.n += 1;
            if (sig.predictedPhase === actPhase) bin.correct += 1;
          }
        }

        for (const tail of TAIL_LENGTHS) {
          const tailSignals = computePatternStateSignals(resultT, '', subT, { tailLength: tail });
          const tailSig = tailSignals.find((s) => s.patternKey === p.code);
          if (!tailSig) continue;
          acc.tailPhaseScored.set(tail, (acc.tailPhaseScored.get(tail) ?? 0) + 1);
          if (tailSig.predictedPhase === actPhase) {
            acc.tailPhaseCorrect.set(tail, (acc.tailPhaseCorrect.get(tail) ?? 0) + 1);
          }
        }

        const persistPhase = sig.predictedPhase;
        baselinePersist.scored += 1;
        if (persistPhase === actPhase) baselinePersist.correct += 1;
        baselineRepeat.scored += 1;
        if (actPhase === 'repeat') baselineRepeat.correct += 1;
        baselineTransition.scored += 1;
        if (actPhase === 'transition') baselineTransition.correct += 1;
      }

      for (let i = 0; i < PATTERN_ROWS.length; i += 1) {
        for (let j = i + 1; j < PATTERN_ROWS.length; j += 1) {
          const a = signalByCode.get(PATTERN_ROWS[i]!.code);
          const b = signalByCode.get(PATTERN_ROWS[j]!.code);
          if (!a || !b) continue;
          const key = `${PATTERN_ROWS[i]!.code}|${PATTERN_ROWS[j]!.code}`;
          const pair = agreementPairs.get(key) ?? { same: 0, opposite: 0, bothCorrect: 0, bothWrong: 0, n: 0 };
          pair.n += 1;
          if (a.predictedPhase === b.predictedPhase) pair.same += 1;
          else pair.opposite += 1;
          const actA = actualPhaseFromTransition(PATTERN_ROWS[i]!.field, sPrimeT, sPrimeT1);
          if (actA) {
            const aOk = a.predictedPhase === actA;
            const bOk = b.predictedPhase === actA;
            if (aOk && bOk) pair.bothCorrect += 1;
            if (!aOk && !bOk) pair.bothWrong += 1;
          }
          agreementPairs.set(key, pair);
        }
      }

      const eligible = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      const fullBreakdown = computeDigitPredictionScores(pathT, resultT, '', codesT, eligible);
      const baseScores = fullBreakdown.scores
        .map((s) => ({ ...s, totalScore: s.totalScore - s.patternSignalsScore }))
        .sort((a, b) => b.totalScore - a.totalScore);
      const fullWinner = fullBreakdown.winningDigit;
      const baseWinner = baseScores[0]?.digit ?? fullWinner;

      recordDigitMetrics(fullMetrics, fullWinner, fullBreakdown.scores, actualNext);
      if (isValidationMaster) {
        recordDigitMetrics(valMetrics, fullWinner, fullBreakdown.scores, actualNext);
      }

      for (const key of ['A', 'B', 'C', 'D'] as const) {
        const bd = computeDigitPredictionScores(pathT, resultT, '', codesT, eligible, {
          layers: ABLATION_LAYERS[key],
        });
        recordDigitMetrics(ablationMetrics[key], bd.winningDigit, bd.scores, actualNext);
      }

      const rankOf = (scores: typeof fullBreakdown.scores, digit: number) => {
        const idx = scores.findIndex((s) => s.digit === digit);
        return idx >= 0 ? idx + 1 : 11;
      };

      digitBase.n += 1;
      digitFull.n += 1;
      if (baseWinner === actualNext) digitBase.exact += 1;
      if (fullWinner === actualNext) digitFull.exact += 1;
      const baseRank = rankOf(baseScores, actualNext);
      const fullRank = rankOf(fullBreakdown.scores, actualNext);
      digitBase.rankSum += baseRank;
      digitFull.rankSum += fullRank;
      if (baseRank <= 2) digitBase.top2 += 1;
      if (fullRank <= 2) digitFull.top2 += 1;
      if (baseRank <= 3) digitBase.top3 += 1;
      if (fullRank <= 3) digitFull.top3 += 1;
      digitBase.marginSum += (baseScores[0]?.totalScore ?? 0) - (baseScores[1]?.totalScore ?? 0);
      digitFull.marginSum += (fullBreakdown.scores[0]?.totalScore ?? 0) - (fullBreakdown.scores[1]?.totalScore ?? 0);
      digitBase.unique.add(baseWinner);
      digitFull.unique.add(fullWinner);

      if (baseWinner !== fullWinner) {
        patternChangedWinner.n += 1;
        const baseHit = baseWinner === actualNext;
        const fullHit = fullWinner === actualNext;
        if (!baseHit && fullHit) patternChangedWinner.improved += 1;
        if (baseHit && !fullHit) patternChangedWinner.worsened += 1;
        patternChangedWinner.changed += 1;
      }

      const legDir = legacyDirection(resultT, pathT, codesT);
      const flowDir = patternFlowDirection(resultT, subT);
      const patConsensus = patternConsensusPhase(signalsT);
      const actPhaseGlobal = signalsT.length > 0
        ? actualPhaseFromTransition(signalsT[0]!.patternField, sPrimeT, sPrimeT1)
        : null;

      if (legDir && patConsensus && actPhaseGlobal) {
        legacyConflict.n += 1;
        const legOk = legDir === actPhaseGlobal;
        const patOk = patConsensus === actPhaseGlobal;
        if (legOk && !patOk) legacyConflict.A += 1;
        else if (!legOk && patOk) legacyConflict.B += 1;
        else if (legOk && patOk) legacyConflict.C += 1;
        else legacyConflict.D += 1;

        if (legDir !== patConsensus && patOk) legacyConflict.E += 1;
        void flowDir;
      }
    }
  }

  const report: string[] = [];
  const append = (s = '') => report.push(s);

  append('# Pattern CodeValue Predictive Validation (Walk-forward)');
  append('');
  append(`Generated: ${new Date().toISOString()}`);
  append(`Masters: ${MASTERS.length}, min history: ${MIN_HISTORY}`);
  append('');

  append('## 1. Walk-forward method (no data leakage)');
  append('');
  append('- Each position `t`: `historyT = master[0..t]` only — **no future digits**.');
  append('- `analyzeMasterValue("00", historyT)` recomputed fresh per position (no cached full-sequence analysis).');
  append('- Pattern prediction: `computePatternStateSignals(resultT, "", subBand)` at time t.');
  append('- Ground truth: compare Pattern CodeValue sequence at t vs t+1 (`actualPhaseFromTransition`).');
  append('- Next digit evaluation: actual = `master[t+1]`; BASE = totalScore − patternSignalsScore.');
  append('- Frequency / global counts **not** used in prediction decisions.');
  append('');

  append('## 2. Pattern key mapping (UI 10 patterns)');
  append('');
  append('| # | UI label | patternKey | field |');
  append('|---|----------|------------|-------|');
  for (const p of PATTERN_ROWS) {
    append(`| ${CODE_VALUE_SUB_DETAIL_RULES.find((r) => r.code === p.code)?.order ?? '-'} | ${p.code} | \`${p.code}\` | \`${p.field}\` |`);
  }
  append('');

  append(`## 3. Total prediction positions: **${totalPositions}**`);
  append(`Positions with ≥1 pattern signal: **${positionsWithAnyPattern}** (${pct(positionsWithAnyPattern, totalPositions)}%)`);
  append('');

  append('## 4. Per-pattern performance');
  append('');
  append('| pattern | cases | coverage | phase acc | repeat prec | trans prec | run acc | band acc | avg conf |');
  append('|---------|------:|---------:|----------:|------------:|-----------:|--------:|---------:|---------:|');

  const ranked: { code: string; phaseAcc: number; skill: number; reliability: number }[] = [];

  for (const p of PATTERN_ROWS) {
    const a = patternStats.get(p.code)!;
    const repeatPrec = a.confusion.predRepeat ? a.confusion.rr / a.confusion.predRepeat : 0;
    const transPrec = a.confusion.predTransition ? a.confusion.tt / a.confusion.predTransition : 0;
    const phaseAcc = a.phaseScored ? a.phaseCorrect / a.phaseScored : 0;
    const runAcc = a.runScored ? a.runCorrect / a.runScored : 0;
    const bandAcc = a.bandScored ? a.bandCorrect / a.bandScored : 0;
    const avgConf = a.fired ? a.confSum / a.fired : 0;
    const coverage = a.totalPositions ? a.fired / a.totalPositions : 0;

    let calib = 1;
    for (const b of CONF_BUCKETS) {
      const bin = a.confBins.get(b.label)!;
      if (bin.n >= 5) {
        const binAcc = bin.correct / bin.n;
        const mid = b.min + (b.max - b.min) / 2;
        calib -= Math.min(0.25, Math.abs(mid - binAcc) * 0.3);
      }
    }
    calib = Math.max(0.3, calib);

    let avgAgree = 0;
    let agreeN = 0;
    for (const [key, pair] of agreementPairs) {
      if (!key.includes(p.code)) continue;
      if (pair.n === 0) continue;
      avgAgree += pair.same / pair.n;
      agreeN += 1;
    }
    avgAgree = agreeN ? avgAgree / agreeN : 0.5;
    const redundancyPenalty = 1 - Math.max(0, avgAgree - 0.5) * 0.8;
    const skill = phaseAcc - Math.max(baselineRepeat.correct / baselineRepeat.scored, baselineTransition.correct / baselineTransition.scored, baselinePersist.correct / baselinePersist.scored);
    const reliability = Math.max(0, phaseAcc - 0.5) * 2 * calib * Math.sqrt(coverage) * redundancyPenalty;

    ranked.push({ code: p.code, phaseAcc, skill, reliability });

    append(
      `| ${p.code} | ${a.totalPositions} | ${pct(a.fired, a.totalPositions)}% | ${pct(a.phaseCorrect, a.phaseScored)}% | ${pct(a.confusion.rr, a.confusion.predRepeat)}% | ${pct(a.confusion.tt, a.confusion.predTransition)}% | ${pct(a.runCorrect, a.runScored)}% | ${pct(a.bandCorrect, a.bandScored)}% | ${avgConf.toFixed(2)} |`,
    );
  }
  append('');

  append('## 5. Confusion matrices (phase)');
  append('');
  for (const p of PATTERN_ROWS) {
    const c = patternStats.get(p.code)!.confusion;
    append(`### ${p.code}`);
    append('');
    append('|  | actual repeat | actual transition |');
    append('|--|--------------:|------------------:|');
    append(`| pred repeat | ${c.rr} | ${c.rt} |`);
    append(`| pred transition | ${c.tr} | ${c.tt} |`);
    append(`| pred totals | ${c.predRepeat} | ${c.predTransition} |`);
    append(`| actual totals | ${c.actRepeat} | ${c.actTransition} |`);
    append('');
  }

  append('## 6. Confidence calibration (phase accuracy by bucket)');
  append('');
  for (const p of PATTERN_ROWS) {
    const a = patternStats.get(p.code)!;
    if (a.fired < 20) continue;
    append(`### ${p.code}`);
    append('| bucket | n | phase accuracy |');
    append('|--------|--:|---------------:|');
    for (const b of CONF_BUCKETS) {
      const bin = a.confBins.get(b.label)!;
      append(`| ${b.label} | ${bin.n} | ${pct(bin.correct, bin.n)}% |`);
    }
    append('');
  }

  append('## 7. Tail length diagnostic (phase accuracy, default prod=12 unchanged)');
  append('');
  append('| pattern | tail=6 | tail=8 | tail=12 | tail=16 | tail=24 | best |');
  append('|---------|-------:|-------:|--------:|--------:|--------:|------|');
  for (const p of PATTERN_ROWS) {
    const a = patternStats.get(p.code)!;
    const cols = TAIL_LENGTHS.map((t) => {
      const scored = a.tailPhaseScored.get(t) ?? 0;
      const correct = a.tailPhaseCorrect.get(t) ?? 0;
      return { t, acc: scored ? correct / scored : 0, label: pct(correct, scored) };
    });
    const best = cols.reduce((b, c) => (c.acc > b.acc ? c : b), cols[0]!);
    append(`| ${p.code} | ${cols[0]!.label}% | ${cols[1]!.label}% | ${cols[2]!.label}% | ${cols[3]!.label}% | ${cols[4]!.label}% | **${best.t}** |`);
  }
  append('');

  append('## 8. Pattern agreement (same prediction %)');
  append('');
  append('Top redundant pairs (same phase prediction):');
  append('');
  const pairList = [...agreementPairs.entries()]
    .filter(([, v]) => v.n >= 30)
    .sort((a, b) => b[1].same / b[1].n - a[1].same / a[1].n)
    .slice(0, 15);
  append('| pair | n | same% | both correct% | opposite% |');
  append('|------|--:|------:|--------------:|----------:|');
  for (const [key, v] of pairList) {
    append(`| ${key.replace('|', ' × ')} | ${v.n} | ${pct(v.same, v.n)}% | ${pct(v.bothCorrect, v.n)}% | ${pct(v.opposite, v.n)}% |`);
  }
  append('');

  append('### Suggested redundancy groups (observation only)');
  append('');
  append('- **Group Run/marker cluster**: `1 중복`, `3 이상`, `5 이상` — often agree on repeat during run extension.');
  append('- **Group Between-marker cluster**: `2,3+α`, `3,4+α`, `4,5+α`, `5+α,4`, `3+α,2`, `4+α,3` — high mutual same-prediction when marker progress similar.');
  append('- **Group SubBand switch**: `1 사이` — bandBehavior switch signal; partially independent from run-cluster.');
  append('');

  ranked.sort((a, b) => b.reliability - a.reliability);
  append('## 9. TOP 3 patterns (by reliability candidate)');
  append('');
  for (const r of ranked.slice(0, 3)) {
    append(`- **${r.code}** — phaseAcc ${(r.phaseAcc * 100).toFixed(1)}%, skill ${(r.skill * 100).toFixed(1)}pp, reliability ${r.reliability.toFixed(3)}`);
  }
  append('');
  append('## 10. BOTTOM 3 patterns');
  append('');
  for (const r of ranked.slice(-3).reverse()) {
    append(`- **${r.code}** — phaseAcc ${(r.phaseAcc * 100).toFixed(1)}%, skill ${(r.skill * 100).toFixed(1)}pp, reliability ${r.reliability.toFixed(3)}`);
  }
  append('');

  append('## 11. BASE vs +10PATTERN (final Master digit, current weights unchanged)');
  append('');
  append('| metric | BASE | +10PATTERN | delta |');
  append('|--------|-----:|-----------:|------:|');
  append(`| exact hit | ${pct(digitBase.exact, digitBase.n)}% | ${pct(digitFull.exact, digitFull.n)}% | ${((digitFull.exact - digitBase.exact) / digitBase.n * 100).toFixed(1)}pp |`);
  append(`| avg rank (lower better) | ${(digitBase.rankSum / digitBase.n).toFixed(2)} | ${(digitFull.rankSum / digitFull.n).toFixed(2)} | ${((digitFull.rankSum - digitBase.rankSum) / digitBase.n).toFixed(2)} |`);
  append(`| top-2 hit | ${pct(digitBase.top2, digitBase.n)}% | ${pct(digitFull.top2, digitFull.n)}% | ${((digitFull.top2 - digitBase.top2) / digitBase.n * 100).toFixed(1)}pp |`);
  append(`| top-3 hit | ${pct(digitBase.top3, digitBase.n)}% | ${pct(digitFull.top3, digitFull.n)}% | ${((digitFull.top3 - digitBase.top3) / digitBase.n * 100).toFixed(1)}pp |`);
  append(`| avg winner margin | ${(digitBase.marginSum / digitBase.n).toFixed(2)} | ${(digitFull.marginSum / digitFull.n).toFixed(2)} | — |`);
  append(`| unique winners | ${digitBase.unique.size} | ${digitFull.unique.size} | — |`);
  append(`| winner changed by +10P | — | ${patternChangedWinner.changed} | improved ${patternChangedWinner.improved}, worsened ${patternChangedWinner.worsened} |`);
  append('');

  append('## 12. Legacy vs 10Pattern conflict (phase direction)');
  append('');
  append('| case | count | description |');
  append('|------|------:|-------------|');
  append(`| A | ${legacyConflict.A} | Legacy direction OK, 10Pattern consensus wrong |`);
  append(`| B | ${legacyConflict.B} | Legacy wrong, 10Pattern consensus OK |`);
  append(`| C | ${legacyConflict.C} | both OK |`);
  append(`| D | ${legacyConflict.D} | both wrong |`);
  append(`| E | ${legacyConflict.E} | Legacy≠Pattern and Pattern matched actual |`);
  append(`| total evaluated | ${legacyConflict.n} | |`);
  append('');

  append('## 13. Naive baselines vs aggregated pattern phase');
  append('');
  const modelAcc = pct(modelPhase.correct, modelPhase.scored);
  append('| baseline | phase accuracy |');
  append('|----------|---------------:|');
  append(`| Model (10 patterns, when fired) | ${modelAcc}% |`);
  append(`| Persistence (predict same as at t) | ${pct(baselinePersist.correct, baselinePersist.scored)}% |`);
  append(`| Always repeat | ${pct(baselineRepeat.correct, baselineRepeat.scored)}% |`);
  append(`| Always transition | ${pct(baselineTransition.correct, baselineTransition.scored)}% |`);
  const bestBase = Math.max(
    baselinePersist.correct / baselinePersist.scored,
    baselineRepeat.correct / baselineRepeat.scored,
    baselineTransition.correct / baselineTransition.scored,
  );
  const skillAgg = (modelPhase.correct / modelPhase.scored) - bestBase;
  append('');
  append(`Aggregated skill vs best naive baseline: **${(skillAgg * 100).toFixed(1)} pp**`);
  append('');

  append('## 14. Reliability weights (APPLIED to production)');
  append('');
  append('```');
  append('score contribution = confidence × PATTERN_RELIABILITY × patternSignal × clusterDiminish');
  append(`clusterDiminish = ${CLUSTER_DIMINISHING_FACTOR}^n within cluster+phase (n=0,1,2…)`);
  append('```');
  append('');
  append('| pattern | field | reliability |');
  append('|---------|-------|------------:|');
  for (const p of PATTERN_ROWS) {
    append(`| ${p.code} | \`${p.field}\` | ${(PATTERN_RELIABILITY[p.field] ?? 0.5).toFixed(2)} |`);
  }
  append('');
  append(`Legacy weight: ${DIGIT_PREDICTION_WEIGHTS.legacy} (cap ${DIGIT_PREDICTION_WEIGHTS.legacyAbsoluteCap})`);
  append(`Pattern signal cap per digit: ${DIGIT_PREDICTION_WEIGHTS.patternSignalPerDigitCap}`);
  append('');
  append('Redundancy clusters:');
  append(`- betweenMarker: ${PATTERN_REDUNDANCY_CLUSTERS.betweenMarker.join(', ')}`);
  append(`- countThreshold: ${PATTERN_REDUNDANCY_CLUSTERS.countThreshold.join(', ')}`);
  append('');

  append('## 15. Before vs After digit performance (full 418 positions)');
  append('');
  append('| metric | BEFORE | AFTER | delta |');
  append('|--------|-------:|------:|------:|');
  append(`| exact hit | ${(BEFORE_METRICS.digitExact * 100).toFixed(1)}% | ${pct(fullMetrics.exact, fullMetrics.n)}% | ${((fullMetrics.exact / fullMetrics.n - BEFORE_METRICS.digitExact) * 100).toFixed(1)}pp |`);
  append(`| top-2 hit | ${(BEFORE_METRICS.digitTop2 * 100).toFixed(1)}% | ${pct(fullMetrics.top2, fullMetrics.n)}% | ${((fullMetrics.top2 / fullMetrics.n - BEFORE_METRICS.digitTop2) * 100).toFixed(1)}pp |`);
  append(`| top-3 hit | ${(BEFORE_METRICS.digitTop3 * 100).toFixed(1)}% | ${pct(fullMetrics.top3, fullMetrics.n)}% | ${((fullMetrics.top3 / fullMetrics.n - BEFORE_METRICS.digitTop3) * 100).toFixed(1)}pp |`);
  append(`| avg rank | ${BEFORE_METRICS.digitAvgRank.toFixed(2)} | ${(fullMetrics.rankSum / fullMetrics.n).toFixed(2)} | ${((fullMetrics.rankSum / fullMetrics.n) - BEFORE_METRICS.digitAvgRank).toFixed(2)} |`);
  append(`| unique winners | 10 | ${fullMetrics.unique.size} | — |`);
  append('');

  const threeOrMoreAcc = patternStats.get('3 이상')!;
  const fiveOrMoreAcc = patternStats.get('5 이상')!;
  append('### 3이상 / 5이상 phase improvement');
  append('');
  append('| pattern | BEFORE phase acc | AFTER phase acc |');
  append('|---------|-----------------:|----------------:|');
  append(`| 3 이상 | ${(BEFORE_METRICS.threeOrMorePhaseAcc * 100).toFixed(1)}% | ${pct(threeOrMoreAcc.phaseCorrect, threeOrMoreAcc.phaseScored)}% |`);
  append(`| 5 이상 | ${(BEFORE_METRICS.fiveOrMorePhaseAcc * 100).toFixed(1)}% | ${pct(fiveOrMoreAcc.phaseCorrect, fiveOrMoreAcc.phaseScored)}% |`);
  append('');

  append('## 16. Ablation A/B/C/D (full walk-forward)');
  append('');
  append('| layer | exact | top-2 | top-3 | avg rank |');
  append('|-------|------:|------:|------:|---------:|');
  for (const [label, desc] of [
    ['A', 'MainBand+SubBand+Legacy'],
    ['B', 'A+PatternFlow'],
    ['C', 'B+reliability-adjusted 10Pattern'],
    ['D', 'C+Anchor (+agreement)'],
  ] as const) {
    const m = ablationMetrics[label as 'A' | 'B' | 'C' | 'D'];
    append(`| ${label} (${desc}) | ${pct(m.exact, m.n)}% | ${pct(m.top2, m.n)}% | ${pct(m.top3, m.n)}% | ${(m.rankSum / m.n).toFixed(2)} |`);
  }
  append('');

  append('## 17. Validation split (masters only — no weight change at eval)');
  append('');
  append(`Calibration masters: first ${CALIBRATION_MASTER_COUNT} / ${MASTERS.length}`);
  append(`Validation masters: last ${MASTERS.length - CALIBRATION_MASTER_COUNT} / ${MASTERS.length}`);
  append('');
  append('| split | positions | exact | top-2 | top-3 | avg rank | unique winners |');
  append('|-------|----------:|------:|------:|------:|---------:|---------------:|');
  append(`| validation (${MASTERS.length - CALIBRATION_MASTER_COUNT} masters) | ${valMetrics.n} | ${pct(valMetrics.exact, valMetrics.n)}% | ${pct(valMetrics.top2, valMetrics.n)}% | ${pct(valMetrics.top3, valMetrics.n)}% | ${(valMetrics.rankSum / valMetrics.n).toFixed(2)} | ${valMetrics.unique.size} |`);
  append(`| full | ${fullMetrics.n} | ${pct(fullMetrics.exact, fullMetrics.n)}% | ${pct(fullMetrics.top2, fullMetrics.n)}% | ${pct(fullMetrics.top3, fullMetrics.n)}% | ${(fullMetrics.rankSum / fullMetrics.n).toFixed(2)} | ${fullMetrics.unique.size} |`);
  append('');

  append('## 18. Next-step proposals (if validation split underperforms)');
  append('');
  append('1. If validation exact ≪ calibration — reduce patternSignal further; do not re-tune on validation.');
  append('2. Monitor 3이상/5이상 phase acc post logic fix; raise reliability only if skill > 0 on held-out masters.');
  append('3. Legacy conflict: compare Case A/B vs BEFORE before further Legacy cuts.');
  append('');

  append('## 19. Legacy weight adjustment proposals (previous §15 — superseded)');
  append('');
  append('_See §14–18 for applied changes._');
  append('');

  const outPath = path.join(process.cwd(), 'imports', 'pattern-predictive-validation.md');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, report.join('\n'), 'utf8');
  console.log(`Report written: ${outPath}`);
  console.log(`Positions: ${totalPositions}, model phase scored: ${modelPhase.scored}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
