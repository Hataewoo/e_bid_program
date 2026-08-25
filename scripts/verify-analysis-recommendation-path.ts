/**
 * Verify Analysis path: winningDigit === candidates[0] for prefix=""
 * Usage: npx vite-node --config scripts/vite-node.config.ts scripts/verify-analysis-recommendation-path.ts
 */
import { analyzeMasterValue, buildCodeValueStats } from '../src/shared/utils/analysisEngine';
import { predictNextDigitStep } from '../src/shared/utils/nextDigitEngine';

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

let mismatches = 0;
console.log('Master tail | winningDigit | candidates[0] | match');
console.log('------------|-------------|---------------|------');

for (const master of MASTERS) {
  const result = analyzeMasterValue('00', master);
  const stats = buildCodeValueStats(result, []);
  const step = predictNextDigitStep(result, stats, '', 1);
  if (!step?.scoreBreakdown) {
    console.log(`${master.slice(-12)} | — | — | NO_BREAKDOWN`);
    continue;
  }
  const w = step.scoreBreakdown.winningDigit;
  const c0 = step.candidates[0]?.digit ?? null;
  const match = w === c0;
  if (!match) mismatches += 1;
  console.log(
    `…${master.slice(-12)} | ${w} | ${c0 ?? '—'} | ${match ? 'OK' : 'MISMATCH'}`,
  );
}

console.log(`\nMismatches: ${mismatches}/${MASTERS.length}`);
