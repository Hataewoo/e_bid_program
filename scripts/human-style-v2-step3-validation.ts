#!/usr/bin/env node
/**
 * Human-style V2 STEP3 sequential selection validation (28 masters).
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  HUMAN_DIAGNOSTIC_FIXTURE_MASTER,
  HUMAN_FIXTURE_EXPECTED,
  runHumanStyleV2,
} from '../src/shared/utils/humanStyleCounterfactualPredictor';
import {
  findMostRecentDigitInPool,
  formatHumanStyleStep3Trace,
} from '../src/shared/utils/humanStyleFinalDigitSelector';

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

const rows: string[] = [];
const finalDist: Record<string, number> = {};
const methodDist: Record<string, number> = {};
let recentEqualsFinal = 0;
let repeatKeep = 0;
let repeatTerminate = 0;
let pairCount = 0;

for (const m of MASTERS) {
  const v = runHumanStyleV2(m);
  const t = v.step3?.step3Trace;
  if (!t) continue;
  finalDist[String(v.finalDigit)] = (finalDist[String(v.finalDigit)] ?? 0) + 1;
  methodDist[t.method] = (methodDist[t.method] ?? 0) + 1;
  const masterRecent = t.recentOrder[0] ?? null;
  if (masterRecent === v.finalDigit) recentEqualsFinal += 1;
  if (t.repeatEvaluation?.decision === 'REPEAT') repeatKeep += 1;
  if (t.repeatEvaluation?.decision === 'TERMINATE') repeatTerminate += 1;
  if (t.method === 'pair') pairCount += 1;
  rows.push(
    `| …${m.slice(-8)} | ${v.step1.winnerId} | ${v.step2?.winnerId} | [${t.pool.join(',')}] | ${t.recentOrder.join('→')} | ${t.primaryCandidate ?? '—'} | ${t.repeatEvaluation?.decision ?? '—'} | ${t.pairAnchor ?? '—'} | ${v.finalDigit} | ${t.method} |`,
  );
}

const stuck = Object.values(finalDist).some((c) => c === 28);
let verdict: 'PASS' | 'CONDITIONAL PASS' | 'FAIL' = 'PASS';
if (stuck) verdict = 'FAIL';
else if (recentEqualsFinal > 20) verdict = 'CONDITIONAL PASS';

const fixtureTrace = fixture.step3?.step3Trace
  ? formatHumanStyleStep3Trace(fixture.step3.step3Trace).join('\n')
  : '—';

const report = `# Human-style V2 STEP3 sequential validation

Generated: ${new Date().toISOString()}

## Verdict: **${verdict}**

## Human fixture
Expected STEP1/2: ${HUMAN_FIXTURE_EXPECTED.step1} → ${HUMAN_FIXTURE_EXPECTED.step2} (regression only)
Actual: ${fixture.step1.winnerId} → ${fixture.step2?.winnerId} → **${fixture.finalDigit}**
STEP3 method: ${fixture.step3?.step3Trace?.method}
\`\`\`
${fixtureTrace}
\`\`\`

## 28 Master STEP3

| tail | STEP1 | STEP2 | pool | recent order | repeat cand | repeat dec | pair anchor | final | method |
|------|-------|-------|------|--------------|-------------|------------|-------------|-------|--------|
${rows.join('\n')}

## Stats
- final digit distribution: ${Object.entries(finalDist).map(([k, v]) => `${k}:${v}`).join(', ')}
- method: ${Object.entries(methodDist).map(([k, v]) => `${k}:${v}`).join(', ')}
- recent digit = final: **${recentEqualsFinal}/28** (${((recentEqualsFinal / 28) * 100).toFixed(1)}%)
- repeat REPEAT (early win): **${repeatKeep}/28**
- repeat TERMINATE (eliminate): **${repeatTerminate}/28**
- pair decisions: **${pairCount}/28**

Production V1: unchanged
STEP1/STEP2: unchanged
`;

fs.mkdirSync('imports', { recursive: true });
fs.writeFileSync(path.join('imports', 'human-style-v2-step3-validation.md'), report, 'utf8');
console.log(report);
console.log(`VERDICT: ${verdict}`);
