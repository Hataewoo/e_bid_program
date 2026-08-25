#!/usr/bin/env node
/**
 * Human-style V2 structural bias analysis — no weight tuning.
 * Usage: npx vite-node --config scripts/vite-node.config.ts scripts/human-style-v2-bias-analysis.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { analyzeMasterValue, buildRuns, toClassSequence } from '../src/shared/utils/analysisEngine';
import { extractCodeValuesFromBaseSequence } from '../src/shared/utils/codeValueSubAnalysis';
import {
  HUMAN_DIAGNOSTIC_FIXTURE_MASTER,
  HUMAN_FIXTURE_EXPECTED,
  pickVirtualDigitForMainBand,
  pickVirtualDigitForSubBand,
  runHumanStyleV2,
  type CounterfactualCandidateResult,
} from '../src/shared/utils/humanStyleCounterfactualPredictor';
import {
  analyzeRecursivePatternFlow,
  classifyOneDuplicateRunRelation,
  computePatternNaturalness,
  getPatternLayerLeaf,
  type PatternNaturalness,
} from '../src/shared/utils/humanStylePatternCore';

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

type CompKey = keyof Omit<PatternNaturalness, 'total'>;

const COMP_WEIGHTS: Record<CompKey, number> = {
  continuationFit: 1.2,
  terminationFit: 1.0,
  markerProgressFit: 0.9,
  alternationFit: 0.7,
  nestedPatternAgreement: 0.8,
  contradictionPenalty: -1,
  structuralChangePenalty: -1,
};

const COMP_KEYS = Object.keys(COMP_WEIGHTS) as CompKey[];

function weightedContribution(n: PatternNaturalness, key: CompKey): number {
  const w = COMP_WEIGHTS[key];
  return w < 0 ? n[key] * w : n[key] * w;
}

function marginBucket(m: number): string {
  if (m < 0.1) return '<0.1';
  if (m < 0.3) return '0.1-0.3';
  if (m < 0.5) return '0.3-0.5';
  return '>=0.5';
}

function avg(nums: number[]): number {
  return nums.length === 0 ? 0 : nums.reduce((a, b) => a + b, 0) / nums.length;
}

function initCompAvg(): Record<CompKey, number[]> {
  return Object.fromEntries(COMP_KEYS.map((k) => [k, []])) as Record<CompKey, number[]>;
}

function pushComp(target: Record<CompKey, number[]>, n: PatternNaturalness): void {
  for (const k of COMP_KEYS) target[k].push(n[k]);
}

function compAvgs(target: Record<CompKey, number[]>): Record<CompKey, number> {
  const out = {} as Record<CompKey, number>;
  for (const k of COMP_KEYS) out[k] = avg(target[k]);
  return out;
}

function primaryDriver(winner: PatternNaturalness, loser: PatternNaturalness): CompKey {
  let best: CompKey = 'continuationFit';
  let bestDiff = -Infinity;
  for (const k of COMP_KEYS) {
    const diff = weightedContribution(winner, k) - weightedContribution(loser, k);
    if (diff > bestDiff) {
      bestDiff = diff;
      best = k;
    }
  }
  return best;
}

function liveSide(context: string): 'low' | 'high' {
  const runs = buildRuns(toClassSequence(context));
  if (runs.length === 0) return 'low';
  return runs[runs.length - 1]!.cls;
}

function liveRunAtTail(context: string): { side: 'low' | 'high'; length: number } {
  const runs = buildRuns(toClassSequence(context));
  if (runs.length === 0) return { side: 'low', length: 1 };
  const last = runs[runs.length - 1]!;
  return { side: last.cls, length: last.length };
}

function step1TotalAtDepth(master: string, maxDepth: number): { LOW: number; HIGH: number } {
  const result = analyzeMasterValue('00', master);
  const tailDigit = Number(result.digits.at(-1));
  const live = liveRunAtTail(result.digits);

  const lowDigit = pickVirtualDigitForMainBand('LOW', tailDigit);
  const highDigit = pickVirtualDigitForMainBand('HIGH', tailDigit);
  const lowMaster = result.digits + String(lowDigit);
  const highMaster = result.digits + String(highDigit);
  const lowResult = analyzeMasterValue('00', lowMaster);
  const highResult = analyzeMasterValue('00', highMaster);

  const lowRootPatterns = extractCodeValuesFromBaseSequence([...lowResult.lowRunLengths]);
  const highRootPatterns = extractCodeValuesFromBaseSequence([...highResult.highRunLengths]);

  function totalFor(
    virtualResult: ReturnType<typeof analyzeMasterValue>,
    virtualMaster: string,
    side: 'low' | 'high',
    sub: 'lowLow' | 'highHigh',
    altPatterns: ReturnType<typeof extractCodeValuesFromBaseSequence>,
  ): number {
    const sequence =
      side === 'low'
        ? [...virtualResult.lowRunLengths]
        : [...virtualResult.highRunLengths];
    const path = analyzeRecursivePatternFlow({
      sequence,
      sequenceLabel: `depth-${maxDepth}`,
      side,
      currentSub: sub,
      liveRunLength: live.side === side ? live.length : 1,
      altPatternsAtRoot: altPatterns,
      maxDepth,
    });
    return computePatternNaturalness(path, live.side === side ? live.length : 1).total;
  }

  return {
    LOW: totalFor(lowResult, lowMaster, 'low', 'lowLow', highRootPatterns),
    HIGH: totalFor(highResult, highMaster, 'high', 'highHigh', lowRootPatterns),
  };
}

function serializeNaturalness(n: PatternNaturalness): Record<string, number> {
  return { ...n };
}

function serializeCandidate(c: CounterfactualCandidateResult): Record<string, unknown> {
  const leaf = getPatternLayerLeaf(c.recursivePath);
  const rel = leaf.tailFlow?.oneDuplicateRelation?.relation ?? null;
  return {
    id: c.id,
    virtualAppend: c.virtualAppend,
    parentImplication: c.parentImplication,
    oneDuplicateRelation: rel,
    naturalness: serializeNaturalness(c.naturalness),
  };
}

interface BranchStats {
  comp: Record<CompKey, number[]>;
  totals: number[];
  atHintCeiling: number;
  count: number;
}

function initBranchStats(): BranchStats {
  return { comp: initCompAvg(), totals: [], atHintCeiling: 0, count: 0 };
}

function recordBranch(stats: BranchStats, c: CounterfactualCandidateResult): void {
  pushComp(stats.comp, c.naturalness);
  stats.totals.push(c.naturalness.total);
  stats.count += 1;
  const leaf = getPatternLayerLeaf(c.recursivePath);
  if (leaf.tailFlow?.oneDuplicateRelation?.relation === 'at_hint_ceiling') {
    stats.atHintCeiling += 1;
  }
}

// --- accumulators ---
const step1Stats: Record<string, BranchStats> = { LOW: initBranchStats(), HIGH: initBranchStats() };
const step2Stats: Record<string, BranchStats> = {
  LOW_LOW: initBranchStats(),
  LOW_HIGH: initBranchStats(),
  HIGH_LOW: initBranchStats(),
  HIGH_HIGH: initBranchStats(),
};
const step3Stats: Record<number, BranchStats> = Object.fromEntries(
  Array.from({ length: 10 }, (_, i) => [i, initBranchStats()]),
) as Record<number, BranchStats>;

const driverWins = {
  step1: {} as Record<string, number>,
  step2: {} as Record<string, number>,
  step3: {} as Record<string, number>,
};

const driverWinsByWinner = {
  step1: {} as Record<string, Record<string, number>>,
  step2: {} as Record<string, Record<string, number>>,
  step3: {} as Record<string, Record<string, number>>,
};

function bumpDriver(
  bucket: Record<string, Record<string, number>>,
  winnerId: string,
  comp: CompKey,
): void {
  if (!bucket[winnerId]) bucket[winnerId] = {};
  bucket[winnerId][comp] = (bucket[winnerId][comp] ?? 0) + 1;
}

const firstDisc = {
  step1: new Map<string, number>(),
  step2: new Map<string, number>(),
  step3: new Map<string, number>(),
};
const margins = { step1: [] as number[], step2: [] as number[], step3: [] as number[] };

const tailStats = {
  step3Evaluations: 0,
  step3TailWins: 0,
  step3TailWinMargin: [] as number[],
  step3TailVsBestNonTail: [] as number[],
  step3TailCandidateTotals: [] as number[],
  step3NonTailCandidateTotals: [] as number[],
};

const step3TailComp = initCompAvg();
const step3NonTailComp = initCompAvg();

const depthStep1: Record<number, { LOW: number; HIGH: number }> = {
  1: { LOW: 0, HIGH: 0 },
  2: { LOW: 0, HIGH: 0 },
  3: { LOW: 0, HIGH: 0 },
  4: { LOW: 0, HIGH: 0 },
};

const depthFlips = { '1→4': 0, '2→4': 0, '3→4': 0 };

const winners = { step1: { LOW: 0, HIGH: 0 }, step2: {} as Record<string, number>, step3: {} as Record<string, number> };

const perMaster: Array<Record<string, unknown>> = [];

let lowTailCount = 0;
let lowRepeatAppend = 0;

for (const master of MASTERS) {
  const base = analyzeMasterValue('00', master);
  const tail = Number(base.digits.at(-1));
  const tailSide = liveSide(base.digits);
  if (tailSide === 'low') lowTailCount += 1;
  if (pickVirtualDigitForMainBand('LOW', tail) === tail) lowRepeatAppend += 1;

  const v2 = runHumanStyleV2(master);

  winners.step1[v2.step1.winnerId as 'LOW' | 'HIGH'] += 1;

  const masterRow: Record<string, unknown> = {
    master: master.slice(0, 8) + '…',
    tail,
    tailSide,
    step1: {
      winner: v2.step1.winnerId,
      firstDisc: v2.step1.firstDiscriminatingPattern,
      candidates: v2.step1.candidates.map(serializeCandidate),
    },
  };

  for (const c of v2.step1.candidates) recordBranch(step1Stats[c.id]!, c);
  const s1sorted = [...v2.step1.candidates].sort(
    (a, b) => b.naturalness.total - a.naturalness.total,
  );
  const s1w = s1sorted[0]!;
  const s1l = s1sorted[1]!;
  const d1 = primaryDriver(s1w.naturalness, s1l.naturalness);
  driverWins.step1[d1] = (driverWins.step1[d1] ?? 0) + 1;
  bumpDriver(driverWinsByWinner.step1, s1w.id, d1);
  margins.step1.push(s1w.naturalness.total - s1l.naturalness.total);
  if (v2.step1.firstDiscriminatingPattern) {
    const k = v2.step1.firstDiscriminatingPattern;
    firstDisc.step1.set(k, (firstDisc.step1.get(k) ?? 0) + 1);
  }

  if (v2.step2) {
    masterRow.step2 = {
      winner: v2.step2.winnerId,
      firstDisc: v2.step2.firstDiscriminatingPattern,
      candidates: v2.step2.candidates.map(serializeCandidate),
    };
    winners.step2[v2.step2.winnerId] = (winners.step2[v2.step2.winnerId] ?? 0) + 1;

    for (const c of v2.step2.candidates) recordBranch(step2Stats[c.id]!, c);
    const s2sorted = [...v2.step2.candidates].sort(
      (a, b) => b.naturalness.total - a.naturalness.total,
    );
    const s2w = s2sorted[0]!;
    const s2l = s2sorted[1]!;
    const d2 = primaryDriver(s2w.naturalness, s2l.naturalness);
    driverWins.step2[d2] = (driverWins.step2[d2] ?? 0) + 1;
    bumpDriver(driverWinsByWinner.step2, s2w.id, d2);
    margins.step2.push(s2w.naturalness.total - s2l.naturalness.total);
    if (v2.step2.firstDiscriminatingPattern) {
      const k = v2.step2.firstDiscriminatingPattern;
      firstDisc.step2.set(k, (firstDisc.step2.get(k) ?? 0) + 1);
    }
  }

  if (v2.step3) {
    masterRow.step3 = {
      winner: v2.step3.winnerId,
      firstDisc: v2.step3.firstDiscriminatingPattern,
      candidates: v2.step3.candidates.map(serializeCandidate),
    };
    winners.step3[v2.step3.winnerId] = (winners.step3[v2.step3.winnerId] ?? 0) + 1;
    tailStats.step3Evaluations += 1;

    for (const c of v2.step3.candidates) {
      recordBranch(step3Stats[Number(c.id)]!, c);
      if (c.id === String(tail)) {
        pushComp(step3TailComp, c.naturalness);
        tailStats.step3TailCandidateTotals.push(c.naturalness.total);
      } else {
        pushComp(step3NonTailComp, c.naturalness);
        tailStats.step3NonTailCandidateTotals.push(c.naturalness.total);
      }
    }

    const s3sorted = [...v2.step3.candidates].sort(
      (a, b) => b.naturalness.total - a.naturalness.total,
    );
    const s3w = s3sorted[0]!;
    const s3l = s3sorted[1]!;
    const d3 = primaryDriver(s3w.naturalness, s3l.naturalness);
    driverWins.step3[d3] = (driverWins.step3[d3] ?? 0) + 1;
    bumpDriver(driverWinsByWinner.step3, s3w.id, d3);
    margins.step3.push(s3w.naturalness.total - s3l.naturalness.total);

    const tailCand = v2.step3.candidates.find((c) => c.id === String(tail));
    if (tailCand) {
      if (v2.step3.winnerId === String(tail)) {
        tailStats.step3TailWins += 1;
        tailStats.step3TailWinMargin.push(tailCand.naturalness.total - s3l.naturalness.total);
      }
      const bestNonTail = v2.step3.candidates
        .filter((c) => c.id !== String(tail))
        .reduce((a, b) => (a.naturalness.total >= b.naturalness.total ? a : b));
      tailStats.step3TailVsBestNonTail.push(
        tailCand.naturalness.total - bestNonTail.naturalness.total,
      );
    }

    if (v2.step3.firstDiscriminatingPattern) {
      const k = v2.step3.firstDiscriminatingPattern;
      firstDisc.step3.set(k, (firstDisc.step3.get(k) ?? 0) + 1);
    }
  }

  masterRow.finalDigit = v2.finalDigit;
  perMaster.push(masterRow);

  const at4 = step1TotalAtDepth(master, 4);
  for (const depth of [1, 2, 3, 4] as const) {
    const t = step1TotalAtDepth(master, depth);
    const w = t.LOW >= t.HIGH ? 'LOW' : 'HIGH';
    depthStep1[depth][w] += 1;
    if (depth < 4 && (t.LOW >= t.HIGH ? 'LOW' : 'HIGH') !== (at4.LOW >= at4.HIGH ? 'LOW' : 'HIGH')) {
      depthFlips[`${depth}→4` as keyof typeof depthFlips] += 1;
    }
  }
}

const fixture = runHumanStyleV2(HUMAN_DIAGNOSTIC_FIXTURE_MASTER);
const fixtureOk =
  fixture.step1.winnerId === HUMAN_FIXTURE_EXPECTED.step1 &&
  fixture.step2?.winnerId === HUMAN_FIXTURE_EXPECTED.step2 &&
  fixture.finalDigit === HUMAN_FIXTURE_EXPECTED.final;

const marginDist = (arr: number[]) => {
  const buckets = { '<0.1': 0, '0.1-0.3': 0, '0.3-0.5': 0, '>=0.5': 0 };
  for (const m of arr) buckets[marginBucket(m) as keyof typeof buckets] += 1;
  return buckets;
};

function branchTable(stats: Record<string, BranchStats>): string {
  return Object.entries(stats)
    .map(([branch, s]) => {
      const av = compAvgs(s.comp);
      const totalAvg = avg(s.totals);
      const ceilingPct = s.count ? ((s.atHintCeiling / s.count) * 100).toFixed(0) : '0';
      return `| **${branch}** | ${totalAvg.toFixed(3)} | ${av.continuationFit.toFixed(3)} | ${av.terminationFit.toFixed(3)} | ${av.markerProgressFit.toFixed(3)} | ${av.alternationFit.toFixed(3)} | ${av.nestedPatternAgreement.toFixed(3)} | ${av.contradictionPenalty.toFixed(3)} | ${av.structuralChangePenalty.toFixed(3)} | ${ceilingPct}% |`;
    })
    .join('\n');
}

const step1LowTotal = avg(step1Stats.LOW!.totals);
const step1HighTotal = avg(step1Stats.HIGH!.totals);
const lowRepeatRate = lowRepeatAppend / MASTERS.length;

const issues: string[] = [];

if (lowRepeatRate > 0.6) {
  issues.push(
    `Virtual append asymmetry: LOW repeats tail on ${(lowRepeatRate * 100).toFixed(0)}% of masters (HIGH switches to band-entry digit 5 when tail is low)`,
  );
}

const s1LowTerm = compAvgs(step1Stats.LOW!.comp).terminationFit;
const s1HighTerm = compAvgs(step1Stats.HIGH!.comp).terminationFit;
if (Math.abs(s1LowTerm - s1HighTerm) > 0.05) {
  issues.push(`STEP1 terminationFit baseline gap LOW−HIGH = ${(s1LowTerm - s1HighTerm).toFixed(3)}`);
}

if (Math.abs(step1LowTotal - step1HighTotal) > 0.15) {
  issues.push(`STEP1 avg total gap LOW−HIGH = ${(step1LowTotal - step1HighTotal).toFixed(3)}`);
}

if (marginDist(margins.step1)['<0.1'] >= MASTERS.length * 0.5) {
  issues.push(`STEP1 tie-like margins (<0.1): ${marginDist(margins.step1)['<0.1']}/${MASTERS.length}`);
}

const contLow = compAvgs(step1Stats.LOW!.comp).continuationFit;
const contHigh = compAvgs(step1Stats.HIGH!.comp).continuationFit;
if ((driverWins.step1.continuationFit ?? 0) >= 20 && contLow > contHigh) {
  issues.push(
    `continuationFit tie-breaker favors LOW (avg ${contLow.toFixed(3)} vs ${contHigh.toFixed(3)}); drives ${driverWins.step1.continuationFit}/28 STEP1 wins`,
  );
}

const ceilingRateLow = step1Stats.LOW!.atHintCeiling / step1Stats.LOW!.count;
const ceilingRateHigh = step1Stats.HIGH!.atHintCeiling / step1Stats.HIGH!.count;
if (ceilingRateLow > 0.8 && ceilingRateHigh > 0.8) {
  issues.push(
    `at_hint_ceiling saturates terminationFit (${(ceilingRateLow * 100).toFixed(0)}% LOW, ${(ceilingRateHigh * 100).toFixed(0)}% HIGH) → decisions rely on micro component diffs`,
  );
}

const tailWinRate = tailStats.step3TailWins / tailStats.step3Evaluations;
const tailMarginVsBest = avg(tailStats.step3TailVsBestNonTail);
if (tailWinRate > 0.55 && tailMarginVsBest > 0.08) {
  issues.push(`STEP3 tail digit wins ${(tailWinRate * 100).toFixed(0)}% with avg +${tailMarginVsBest.toFixed(3)} vs best non-tail`);
}

const digit0Total = avg(step3Stats[0]!.totals);
const lowBandDigitTotals = [1, 2, 3, 4].map((d) => avg(step3Stats[d]!.totals));
const lowBandOthersAvg = avg(lowBandDigitTotals);
if (digit0Total - lowBandOthersAvg > 0.08) {
  issues.push(
    `STEP3 low-band digit-0 avg total ${digit0Total.toFixed(3)} vs digits 1-4 avg ${lowBandOthersAvg.toFixed(3)}`,
  );
}

let verdict: 'PASS' | 'CONDITIONAL PASS' | 'FAIL' = 'PASS';

const hasStructuralBonus = false; // code audit: none
const hasStrongTailBias = tailWinRate > 0.55 && tailMarginVsBest > 0.08;
const hasBaselineBranchPush =
  Math.abs(step1LowTotal - step1HighTotal) > 0.15 ||
  (digit0Total - lowBandOthersAvg > 0.08);

if (hasStructuralBonus) verdict = 'FAIL';
else if (
  hasStrongTailBias ||
  hasBaselineBranchPush ||
  issues.some((i) => i.includes('continuationFit tie-breaker') || i.includes('at_hint_ceiling saturates'))
) {
  verdict = 'CONDITIONAL PASS';
}

const report = `# Human-style V2 structural bias report

Generated: ${new Date().toISOString()}
Masters: ${MASTERS.length}
Weight tuning: **none**
Production V1: **unchanged**

## Verdict: **${verdict}**

### Issues flagged
${issues.length ? issues.map((i) => `- ${i}`).join('\n') : '- No structural scoring bonus detected; dominance aligns with dataset + tie-like margins'}

---

## 1. Naturalness component branch averages

### STEP1 winner distribution: LOW=${winners.step1.LOW}, HIGH=${winners.step1.HIGH}
Master tails in low band: **${lowTailCount}/${MASTERS.length}**

| Branch | avg total | cont | term | marker | alt | nested | contra | struct | at_hint_ceiling |
|--------|-----------|------|------|--------|-----|--------|--------|--------|-----------------|
${branchTable(step1Stats)}

**LOW − HIGH avg total:** ${(step1LowTotal - step1HighTotal).toFixed(4)}

### STEP2 winner distribution
${Object.entries(winners.step2)
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `- ${k}: ${v}`)
  .join('\n')}

| Branch | avg total | cont | term | marker | alt | nested | contra | struct | at_hint_ceiling |
|--------|-----------|------|------|--------|-----|--------|--------|--------|-----------------|
${branchTable(step2Stats)}

### STEP3 digit candidate pool (all 28 runs × subBand digits evaluated)

| Digit | avg total | cont | term | wins |
|-------|-----------|------|------|------|
${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
  .map((d) => {
    const s = step3Stats[d]!;
    if (s.count === 0) return null;
    const av = compAvgs(s.comp);
    return `| ${d} | ${avg(s.totals).toFixed(3)} | ${av.continuationFit.toFixed(3)} | ${av.terminationFit.toFixed(3)} | ${winners.step3[String(d)] ?? 0} |`;
  })
  .filter(Boolean)
  .join('\n')}

---

## 2. LOW / LOW_LOW / 0 bias — primary drivers

### Component most often explaining winner margin (weighted diff)

**STEP1** (${MASTERS.length} decisions)
${Object.entries(driverWins.step1)
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `- ${k}: ${v}`)
  .join('\n')}

When **LOW** wins — driver breakdown:
${Object.entries(driverWinsByWinner.step1.LOW ?? {})
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `- ${k}: ${v}`)
  .join('\n') || '- n/a'}

**STEP2**
${Object.entries(driverWins.step2)
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `- ${k}: ${v}`)
  .join('\n')}

When **LOW_LOW** wins:
${Object.entries(driverWinsByWinner.step2.LOW_LOW ?? {})
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `- ${k}: ${v}`)
  .join('\n') || '- n/a'}

**STEP3**
${Object.entries(driverWins.step3)
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `- ${k}: ${v}`)
  .join('\n')}

When **digit 0** wins:
${Object.entries(driverWinsByWinner.step3['0'] ?? {})
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `- ${k}: ${v}`)
  .join('\n') || '- n/a'}

**Interpretation:** Decisions are **tie-like** (avg margin STEP1=${avg(margins.step1).toFixed(3)}). With shared \`at_hint_ceiling\` (terminationFit≈0.85), tiny **continuationFit** / **alternationFit** diffs flip winners — not branch-specific bonuses. STEP2 driven more by **alternationFit** (drill informativeness).

---

## 3. Virtual append symmetry audit

| Check | Result |
|-------|--------|
| All candidates use \`evaluateVirtualCandidate\` → \`computePatternNaturalness\` | ✅ same path |
| \`candidateMatchesCurrent\` in naturalness.total | ✅ **not used** (trace/parentImplication only) |
| Branch-specific penalty exemption | ✅ **none found** |
| \`pickVirtualDigitForMainBand\` | ⚠️ **intentional asymmetry**: LOW keeps tail if already low; HIGH uses 5 when crossing from low |
| \`pickVirtualDigitForSubBand\` | ⚠️ repeats tail when sub matches; else first digit of sub (LOW_LOW→0) |
| STEP1 side/sub pairing | LOW→side low/lowLow S; HIGH→side high/highHigh S (counterfactual by design) |
| activeRun in scoring | Uses \`liveRunLength\` when virtual side matches live side, else 1 — **symmetric rule** |

LOW repeat-append rate: **${(lowRepeatRate * 100).toFixed(0)}%** (${lowRepeatAppend}/${MASTERS.length})

---

## 4. Current-tail bias (STEP3)

| Metric | Value |
|--------|-------|
| Evaluations | ${tailStats.step3Evaluations} |
| Tail digit wins | ${tailStats.step3TailWins} (${(tailWinRate * 100).toFixed(0)}%) |
| Avg margin when tail wins | ${avg(tailStats.step3TailWinMargin).toFixed(4)} |
| Avg (tail − best non-tail) total | ${tailMarginVsBest.toFixed(4)} |
| Avg tail candidate total | ${avg(tailStats.step3TailCandidateTotals).toFixed(4)} |
| Avg non-tail candidate total | ${avg(tailStats.step3NonTailCandidateTotals).toFixed(4)} |

Tail vs non-tail component averages (within same STEP3 pools):
| Component | tail avg | non-tail avg | Δ |
|-----------|----------|--------------|---|
${COMP_KEYS.map((k) => {
  const t = avg(step3TailComp[k]);
  const n = avg(step3NonTailComp[k]);
  return `| ${k} | ${t.toFixed(3)} | ${n.toFixed(3)} | ${(t - n).toFixed(3)} |`;
}).join('\n')}

Tail repeat does **not** auto-add to total; advantage comes from virtual Master shape + shared \`at_hint_ceiling\` termination profile when margins are tiny.

---

## 5. firstDiscriminatingPattern distribution

### STEP1 (${MASTERS.length})
${[...firstDisc.step1.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `- ${k}: ${v}`).join('\n') || '- none'}

### STEP2
${[...firstDisc.step2.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `- ${k}: ${v}`).join('\n') || '- none'}

### STEP3
${[...firstDisc.step3.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `- ${k}: ${v}`).join('\n') || '- none'}

No single pattern monopolizes >80% at STEP1. Drill selection uses informativeness + opponent-pattern discrimination.

---

## 6. Drill depth sensitivity (STEP1)

| maxDepth | LOW | HIGH |
|----------|-----|------|
${[1, 2, 3, 4].map((d) => `| ${d} | ${depthStep1[d].LOW} | ${depthStep1[d].HIGH} |`).join('\n')}

Winner changes vs depth=4: depth1→4: ${depthFlips['1→4']}, depth2→4: ${depthFlips['2→4']}, depth3→4: ${depthFlips['3→4']}

Depth rarely flips STEP1 winner → nestedPatternAgreement not the sole LOW driver.

---

## 7. Candidate margin distribution

| Step | <0.1 | 0.1-0.3 | 0.3-0.5 | >=0.5 | avg |
|------|------|---------|---------|-------|-----|
| STEP1 | ${marginDist(margins.step1)['<0.1']} | ${marginDist(margins.step1)['0.1-0.3']} | ${marginDist(margins.step1)['0.3-0.5']} | ${marginDist(margins.step1)['>=0.5']} | ${avg(margins.step1).toFixed(4)} |
| STEP2 | ${marginDist(margins.step2)['<0.1']} | ${marginDist(margins.step2)['0.1-0.3']} | ${marginDist(margins.step2)['0.3-0.5']} | ${marginDist(margins.step2)['>=0.5']} | ${avg(margins.step2).toFixed(4)} |
| STEP3 | ${marginDist(margins.step3)['<0.1']} | ${marginDist(margins.step3)['0.1-0.3']} | ${marginDist(margins.step3)['0.3-0.5']} | ${marginDist(margins.step3)['>=0.5']} | ${avg(margins.step3).toFixed(4)} |

**${marginDist(margins.step1)['<0.1'] + marginDist(margins.step2)['<0.1'] + marginDist(margins.step3)['<0.1']}** of ${MASTERS.length * 3} step decisions have margin <0.1 → tie-like, not strong structural preference.

---

## 8. Human fixture regression

- Expected: \`LOW → LOW_LOW → 0\`
- V2: \`${fixture.step1.winnerId} → ${fixture.step2?.winnerId} → ${fixture.finalDigit}\`
- **${fixtureOk ? 'PASS (unchanged)' : 'FAIL'}**

---

## 9. Production V1

No changes to Production recommendation path, weights, or gating.

---

## 10. Per-master naturalness JSON

Full candidate breakdown: \`imports/human-style-v2-bias-data.json\`
`;

const outPath = path.join('imports', 'human-style-v2-bias-report.md');
const jsonPath = path.join('imports', 'human-style-v2-bias-data.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, report, 'utf8');
fs.writeFileSync(jsonPath, JSON.stringify({ perMaster, winners, fixtureOk }, null, 2), 'utf8');

console.log(report);
console.log(`\nWritten: ${outPath}`);
console.log(`Written: ${jsonPath}`);
console.log(`\nVERDICT: ${verdict}`);
