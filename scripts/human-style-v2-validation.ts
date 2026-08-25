#!/usr/bin/env node
/**
 * Human-style V2 validation with tie-resolution metrics.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  formatHumanStyleV2Report,
  HUMAN_DIAGNOSTIC_FIXTURE_MASTER,
  HUMAN_FIXTURE_EXPECTED,
  runHumanStyleV2,
  TIE_MARGIN_THRESHOLD,
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

function marginBucket(m: number): string {
  if (m < 0.1) return '<0.1';
  if (m < 0.3) return '0.1-0.3';
  return '>=0.3';
}

function stepMargin(step: { candidates: { naturalness: { total: number } }[] }): number {
  const sorted = [...step.candidates].sort((a, b) => b.naturalness.total - a.naturalness.total);
  return sorted[0]!.naturalness.total - sorted[1]!.naturalness.total;
}

const fixture = runHumanStyleV2(HUMAN_DIAGNOSTIC_FIXTURE_MASTER);
const fixtureReport = formatHumanStyleV2Report(fixture);

const margins = { step1: [] as number[], step2: [] as number[], step3: [] as number[] };
const step1Dist: Record<string, number> = {};
const step2Dist: Record<string, number> = {};
const finalDist: Record<string, number> = {};
const firstDisc = { step1: new Map<string, number>(), step2: new Map<string, number>() };
let deeperStep1 = 0;
let deeperStep2 = 0;
let uncertainStep1 = 0;
let uncertainStep2 = 0;
let structuralStep1 = 0;
let structuralStep2 = 0;
const resolutionMethods = { step1: new Map<string, number>(), step2: new Map<string, number>() };

for (const m of MASTERS) {
  const v = runHumanStyleV2(m);
  step1Dist[v.step1.winnerId] = (step1Dist[v.step1.winnerId] ?? 0) + 1;
  if (v.step2) step2Dist[v.step2.winnerId] = (step2Dist[v.step2.winnerId] ?? 0) + 1;
  if (v.finalDigit !== null) finalDist[String(v.finalDigit)] = (finalDist[String(v.finalDigit)] ?? 0) + 1;
  margins.step1.push(stepMargin(v.step1));
  if (v.step2) margins.step2.push(stepMargin(v.step2));
  if (v.step3) margins.step3.push(stepMargin(v.step3));

  const tr1 = v.step1.tieResolution;
  if (tr1?.deeperDrillUsed) deeperStep1 += 1;
  if (tr1?.uncertain) uncertainStep1 += 1;
  if (tr1?.structuralDecisionUsed) structuralStep1 += 1;
  if (tr1) resolutionMethods.step1.set(tr1.resolutionMethod, (resolutionMethods.step1.get(tr1.resolutionMethod) ?? 0) + 1);
  if (v.step1.firstDiscriminatingPattern) {
    firstDisc.step1.set(v.step1.firstDiscriminatingPattern, (firstDisc.step1.get(v.step1.firstDiscriminatingPattern) ?? 0) + 1);
  }

  const tr2 = v.step2?.tieResolution;
  if (tr2?.deeperDrillUsed) deeperStep2 += 1;
  if (tr2?.uncertain) uncertainStep2 += 1;
  if (tr2?.structuralDecisionUsed) structuralStep2 += 1;
  if (tr2) resolutionMethods.step2.set(tr2.resolutionMethod, (resolutionMethods.step2.get(tr2.resolutionMethod) ?? 0) + 1);
  if (v.step2?.firstDiscriminatingPattern) {
    firstDisc.step2.set(v.step2.firstDiscriminatingPattern, (firstDisc.step2.get(v.step2.firstDiscriminatingPattern) ?? 0) + 1);
  }
}

const marginDist = (arr: number[]) => {
  const b = { '<0.1': 0, '0.1-0.3': 0, '>=0.3': 0 };
  for (const x of arr) b[marginBucket(x) as keyof typeof b] += 1;
  return b;
};
const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

const issues: string[] = [];
if (deeperStep1 === 0 && deeperStep2 === 0) issues.push('deeper drill never triggered');
if (step1Dist.LOW === 28 || step1Dist.HIGH === 28) issues.push(`STEP1 100% stuck: LOW=${step1Dist.LOW ?? 0} HIGH=${step1Dist.HIGH ?? 0}`);
if (!fixture.humanFixtureMatch) {
  issues.push(`Fixture: ${fixture.step1.winnerId}→${fixture.step2?.winnerId}→${fixture.finalDigit} (expected ${HUMAN_FIXTURE_EXPECTED.step1}→${HUMAN_FIXTURE_EXPECTED.step2}→${HUMAN_FIXTURE_EXPECTED.final})`);
}

let verdict: 'PASS' | 'CONDITIONAL PASS' | 'FAIL' = 'PASS';
if (deeperStep1 === 0) verdict = 'FAIL';
else if (uncertainStep1 + uncertainStep2 > 20 || issues.some((i) => i.includes('100% stuck'))) {
  verdict = 'CONDITIONAL PASS';
}
if (structuralStep1 + structuralStep2 >= 1 && deeperStep1 >= 20) {
  verdict = verdict === 'FAIL' ? 'CONDITIONAL PASS' : verdict;
}

const report = `# Human-style V2 tie-resolution validation

Generated: ${new Date().toISOString()}
TIE_MARGIN_THRESHOLD: ${TIE_MARGIN_THRESHOLD}

## Verdict: **${verdict}**

## Human fixture
Expected: ${HUMAN_FIXTURE_EXPECTED.step1} → ${HUMAN_FIXTURE_EXPECTED.step2} → ${HUMAN_FIXTURE_EXPECTED.final}
Actual: ${fixture.step1.winnerId} → ${fixture.step2?.winnerId} → ${fixture.finalDigit}
Match: ${fixture.humanFixtureMatch ? 'YES' : 'NO'}

STEP1 tie: margin=${fixture.step1.tieResolution?.margin.toFixed(4)} method=${fixture.step1.tieResolution?.resolutionMethod} uncertain=${fixture.step1.tieResolution?.uncertain} structural=${fixture.step1.tieResolution?.structuralDecisionUsed} reason=${fixture.step1.tieResolution?.structuralReason ?? '—'}

\`\`\`
${fixtureReport}
\`\`\`

## 28 Master

### STEP1 LOW/HIGH
${Object.entries(step1Dist).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

### STEP2
${Object.entries(step2Dist).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

### FINAL digit
${Object.entries(finalDist).sort((a, b) => b[1] - a[1]).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

## Margin
| Step | avg | <0.1 |
|------|-----|------|
| STEP1 | ${avg(margins.step1).toFixed(4)} | ${marginDist(margins.step1)['<0.1']}/28 |
| STEP2 | ${avg(margins.step2).toFixed(4)} | ${marginDist(margins.step2)['<0.1']}/28 |
| STEP3 | ${avg(margins.step3).toFixed(4)} | ${marginDist(margins.step3)['<0.1']}/28 |

## Tie-resolution stats
- STEP1 deeper drill: **${deeperStep1}/28**
- STEP2 deeper drill: **${deeperStep2}/28**
- STEP1 structural decision: **${structuralStep1}/28**
- STEP2 structural decision: **${structuralStep2}/28**
- STEP1 uncertain: **${uncertainStep1}/28**
- STEP2 uncertain: **${uncertainStep2}/28**

### STEP1 resolution methods
${[...resolutionMethods.step1.entries()].map(([k, v]) => `- ${k}: ${v}`).join('\n')}

### STEP2 resolution methods
${[...resolutionMethods.step2.entries()].map(([k, v]) => `- ${k}: ${v}`).join('\n')}

## firstDiscriminatingPattern
### STEP1
${[...firstDisc.step1.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

## Issues
${issues.map((i) => `- ${i}`).join('\n') || '- none'}

Production V1: unchanged
`;

fs.mkdirSync('imports', { recursive: true });
fs.writeFileSync(path.join('imports', 'human-style-v2-validation.md'), report, 'utf8');
console.log(report);
console.log(`VERDICT: ${verdict}`);
