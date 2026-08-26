#!/usr/bin/env node
/**
 * STEP3 CASE C fix validation — parent implication drives repeat/terminate.
 */
import fs from 'node:fs';
import path from 'node:path';
import { analyzeMasterValue } from '../src/shared/utils/analysisEngine';
import {
  evaluateCandidateRepeatByCodeContent,
  resolveRepeatEvaluationCode,
  findMostRecentDigitInPool,
} from '../src/shared/utils/humanStyleFinalDigitSelector';
import { flattenPatternLayers } from '../src/shared/utils/humanStylePatternCore';
import { getDigitsInSubBand } from '../src/shared/utils/digitSubBand';
import {
  HUMAN_DIAGNOSTIC_FIXTURE_MASTER,
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

const fixture = runHumanStyleV2(HUMAN_DIAGNOSTIC_FIXTURE_MASTER);
const pairEval = fixture.step3!.step3Trace!.pairEvaluation!;
const drillPath = flattenPatternLayers(pairEval.recursivePath)
  .map((l) => l.selectedDrillDown ?? 'leaf')
  .join(' → ');

const pool3Rows: string[] = [];
let repeatCount = 0;
let terminateCount = 0;
let uncertainCount = 0;

for (const m of MASTERS) {
  const v = runHumanStyleV2(m);
  const t = v.step3!.step3Trace!;
  if (t.pool.length !== 3 || !t.repeatEvaluation) continue;
  const ev = t.repeatEvaluation;
  if (ev.decision === 'REPEAT') repeatCount += 1;
  else terminateCount += 1;
  if (ev.uncertain) uncertainCount += 1;
  pool3Rows.push(
    `| …${m.slice(-8)} | ${ev.childBehavior} | ${ev.parentImplication} | ${ev.decision} | ${ev.decisionMethod} |`,
  );
}

const dist = { REPEAT: 0, TERMINATE: 0, uncertain: 0 };
for (let i = 0; i < 20_000; i += 1) {
  const m = Array.from({ length: 30 }, () => String(Math.floor(Math.random() * 10))).join('');
  const r = analyzeMasterValue('00', m);
  for (const sub of ['lowLow', 'lowHigh', 'highLow', 'highHigh'] as const) {
    const pool = getDigitsInSubBand(sub);
    const band = sub.startsWith('low') ? 'low' : 'high';
    const a = findMostRecentDigitInPool(r.digits, pool);
    if (a === null) continue;
    const ev = evaluateCandidateRepeatByCodeContent(
      r,
      '00',
      band,
      sub,
      a,
      resolveRepeatEvaluationCode(a, band),
    );
    dist[ev.decision] += 1;
    if (ev.uncertain) dist.uncertain += 1;
  }
}

const report = `# STEP3 CASE C validation

Generated: ${new Date().toISOString()}

## 01 fixture (pair path)

| field | before | after |
|-------|--------|-------|
| child | terminates | ${pairEval.childBehavior} |
| parent | keep (ignored) | ${pairEval.parentImplication} |
| decision | TERMINATE | **${pairEval.decision}** |
| method | child direct map | ${pairEval.decisionMethod} |
| FINAL | 1 | **${fixture.finalDigit}** |

drill path (unchanged): \`${drillPath}\`

## 3-pool 19 repeat evaluations

| master | child | parent | decision | reason |
|--------|-------|--------|----------|--------|
${pool3Rows.join('\n')}

REPEAT=${repeatCount} TERMINATE=${terminateCount} uncertain=${uncertainCount}

## Random 20k reachability

REPEAT=${dist.REPEAT} TERMINATE=${dist.TERMINATE} uncertain flag=${dist.uncertain}
`;

fs.mkdirSync('imports', { recursive: true });
fs.writeFileSync(path.join('imports', 'human-style-v2-step3-case-c-validation.md'), report, 'utf8');
console.log(report);
