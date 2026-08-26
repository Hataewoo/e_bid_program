#!/usr/bin/env node
/**
 * Human-style V2 Run Progression validation — 28 Master metrics + trace samples.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  formatHumanStyleV2Report,
  HUMAN_DIAGNOSTIC_FIXTURE_MASTER,
  HUMAN_FIXTURE_EXPECTED,
  runHumanStyleV2,
} from '../src/shared/utils/humanStyleCounterfactualPredictor';

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
`.trim().split(/\s+/);

function stepMargin(step: { candidates: { naturalness: { total: number } }[] }): number | null {
  if (step.candidates.length < 2) return null;
  const sorted = [...step.candidates].sort((a, b) => b.naturalness.total - a.naturalness.total);
  return sorted[0]!.naturalness.total - sorted[1]!.naturalness.total;
}

const step1Dist: Record<string, number> = {};
const step2Dist: Record<string, number> = {};
const finalDist: Record<string, number> = {};
const phaseDist = { step1: new Map<string, number>(), step2: new Map<string, number>() };
const prefDist = { step1: new Map<string, number>(), step2: new Map<string, number>() };
const resolutionMethods = { step1: new Map<string, number>(), step2: new Map<string, number>() };
let deeperStep1 = 0;
let deeperStep2 = 0;
let uncertainStep1 = 0;
let uncertainStep2 = 0;
let structuralStep1 = 0;
let structuralStep2 = 0;
let runProgStep1 = 0;
let runProgStep2 = 0;
const progressionSamples: string[] = [];

const results = MASTERS.map((m) => runHumanStyleV2(m));

for (const v of results) {
  step1Dist[v.step1.winnerId] = (step1Dist[v.step1.winnerId] ?? 0) + 1;
  if (v.step2) step2Dist[v.step2.winnerId] = (step2Dist[v.step2.winnerId] ?? 0) + 1;
  if (v.finalDigit !== null) finalDist[String(v.finalDigit)] = (finalDist[String(v.finalDigit)] ?? 0) + 1;

  const tr1 = v.step1.tieResolution;
  if (tr1?.deeperDrillUsed) deeperStep1 += 1;
  if (tr1?.uncertain) uncertainStep1 += 1;
  if (tr1?.structuralDecisionUsed) structuralStep1 += 1;
  if (tr1?.resolutionMethod === 'run_progression_structural') runProgStep1 += 1;
  if (tr1) resolutionMethods.step1.set(tr1.resolutionMethod, (resolutionMethods.step1.get(tr1.resolutionMethod) ?? 0) + 1);
  if (tr1?.runProgression) {
    phaseDist.step1.set(tr1.runProgression.phase, (phaseDist.step1.get(tr1.runProgression.phase) ?? 0) + 1);
    prefDist.step1.set(
      tr1.runProgression.structuralPreference,
      (prefDist.step1.get(tr1.runProgression.structuralPreference) ?? 0) + 1,
    );
    if (
      progressionSamples.length < 5 &&
      (tr1.runProgression.phase === 'approaching_termination' ||
        tr1.runProgression.phase === 'at_termination_zone' ||
        tr1.runProgression.phase === 'beyond_typical_shape')
    ) {
      progressionSamples.push(
        `Master tail=${v.masterTailDigit} STEP1: activeRun=${tr1.runProgression.activeRun} hist=[${tr1.runProgression.historicalRunsTail.join(',')}] center=${tr1.runProgression.typicalCenter} upper=${tr1.runProgression.typicalUpperBoundary} phase=${tr1.runProgression.phase} cont=${tr1.runProgression.continuationShapeTotal?.toFixed(2)} term=${tr1.runProgression.terminationShapeTotal?.toFixed(2)} pref=${tr1.runProgression.structuralPreference} winner=${v.step1.winnerId} method=${tr1.resolutionMethod}`,
      );
    }
  }

  const tr2 = v.step2?.tieResolution;
  if (tr2?.deeperDrillUsed) deeperStep2 += 1;
  if (tr2?.uncertain) uncertainStep2 += 1;
  if (tr2?.structuralDecisionUsed) structuralStep2 += 1;
  if (tr2?.resolutionMethod === 'run_progression_structural') runProgStep2 += 1;
  if (tr2) resolutionMethods.step2.set(tr2.resolutionMethod, (resolutionMethods.step2.get(tr2.resolutionMethod) ?? 0) + 1);
  if (tr2?.runProgression) {
    phaseDist.step2.set(tr2.runProgression.phase, (phaseDist.step2.get(tr2.runProgression.phase) ?? 0) + 1);
    prefDist.step2.set(
      tr2.runProgression.structuralPreference,
      (prefDist.step2.get(tr2.runProgression.structuralPreference) ?? 0) + 1,
    );
    if (
      progressionSamples.length < 8 &&
      (tr2.runProgression.phase === 'approaching_termination' ||
        tr2.runProgression.phase === 'at_termination_zone' ||
        tr2.runProgression.phase === 'beyond_typical_shape')
    ) {
      progressionSamples.push(
        `Master tail=${v.masterTailDigit} STEP2: activeRun=${tr2.runProgression.activeRun} hist=[${tr2.runProgression.historicalRunsTail.join(',')}] center=${tr2.runProgression.typicalCenter} upper=${tr2.runProgression.typicalUpperBoundary} phase=${tr2.runProgression.phase} cont=${tr2.runProgression.continuationShapeTotal?.toFixed(2)} term=${tr2.runProgression.terminationShapeTotal?.toFixed(2)} pref=${tr2.runProgression.structuralPreference} winner=${v.step2!.winnerId} method=${tr2.resolutionMethod}`,
      );
    }
  }
}

const fixture = runHumanStyleV2(HUMAN_DIAGNOSTIC_FIXTURE_MASTER);
const mapStr = (m: Map<string, number>) =>
  [...m.entries()].map(([k, v]) => `${k}=${v}`).join(', ') || '—';

const lines = [
  '# Human-style V2 Run Progression Validation',
  '',
  `Masters: ${MASTERS.length}`,
  `Fixture match: ${fixture.humanFixtureMatch} (${fixture.step1.winnerId}→${fixture.step2?.winnerId}→${fixture.finalDigit}, expected ${HUMAN_FIXTURE_EXPECTED.step1}→${HUMAN_FIXTURE_EXPECTED.step2}→${HUMAN_FIXTURE_EXPECTED.final})`,
  '',
  '## STEP1 distribution',
  JSON.stringify(step1Dist),
  `deeper=${deeperStep1} structural=${structuralStep1} run_progression=${runProgStep1} uncertain=${uncertainStep1}`,
  `resolution: ${mapStr(resolutionMethods.step1)}`,
  '',
  '## STEP2 distribution',
  JSON.stringify(step2Dist),
  `deeper=${deeperStep2} structural=${structuralStep2} run_progression=${runProgStep2} uncertain=${uncertainStep2}`,
  `resolution: ${mapStr(resolutionMethods.step2)}`,
  '',
  '## Final digit distribution',
  JSON.stringify(finalDist),
  '',
  '## Progression phase distribution',
  `STEP1: ${mapStr(phaseDist.step1)}`,
  `STEP2: ${mapStr(phaseDist.step2)}`,
  '',
  '## structuralPreference distribution',
  `STEP1: ${mapStr(prefDist.step1)}`,
  `STEP2: ${mapStr(prefDist.step2)}`,
  '',
  '## Progression trace samples (termination approach)',
  ...progressionSamples.slice(0, 3).map((s) => `- ${s}`),
  '',
  '## Human fixture trace excerpt',
  ...formatHumanStyleV2Report(fixture).split('\n').slice(0, 40),
];

const outPath = path.join('imports', 'human-style-v2-run-progression-validation.md');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log(lines.join('\n'));
console.log(`\nWrote ${outPath}`);

let verdict: 'PASS' | 'CONDITIONAL PASS' | 'FAIL' = 'PASS';
if (deeperStep1 === 0) verdict = 'FAIL';
if (!fixture.humanFixtureMatch) verdict = 'CONDITIONAL PASS';
console.log(`\nVerdict: ${verdict}`);
