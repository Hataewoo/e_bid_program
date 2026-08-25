/**
 * Verify Analysis V2 UI path: display value === runHumanStyleV2().finalDigit
 * Usage: npx tsx scripts/verify-analysis-v2-ui-path.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { analyzeMasterValue, buildCodeValueStats } from '../src/shared/utils/analysisEngine';
import { predictNextDigitStep } from '../src/shared/utils/nextDigitEngine';
import { runHumanStyleV2 } from '../src/shared/utils/humanStyleCounterfactualPredictor';
import { getAnalysisV2DisplayValue } from '../src/features/analysis/components/AnalysisV2PredictionPanel';

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

interface Row {
  tail: string;
  v1: number | null;
  step1: string;
  step2: string | null;
  v2Final: number | null;
  uiDisplay: number | null;
  match: boolean;
}

const rows: Row[] = [];
let mismatches = 0;

for (const master of MASTERS) {
  const result = analyzeMasterValue('00', master);
  const stats = buildCodeValueStats(result, []);
  const step = predictNextDigitStep(result, stats, '', 1);
  const v1 = step?.scoreBreakdown?.winningDigit ?? null;

  const v2 = runHumanStyleV2(result.digits, result.masterNo);
  const ui = getAnalysisV2DisplayValue(result);

  const match =
    v2.finalDigit === ui.finalDigit &&
    v2.step1.winnerId === ui.step1 &&
    (v2.step2?.winnerId ?? null) === ui.step2;

  if (!match) mismatches += 1;

  rows.push({
    tail: master.slice(-8),
    v1,
    step1: v2.step1.winnerId,
    step2: v2.step2?.winnerId ?? null,
    v2Final: v2.finalDigit,
    uiDisplay: ui.finalDigit,
    match,
  });
}

const lines = [
  '# Analysis V2 UI path verification',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  '| tail | V1 | V2 STEP1 | V2 STEP2 | V2 final | UI display | match |',
  '|------|-----|----------|----------|----------|------------|-------|',
  ...rows.map(
    (r) =>
      `| …${r.tail} | ${r.v1 ?? '—'} | ${r.step1} | ${r.step2 ?? '—'} | ${r.v2Final ?? '—'} | ${r.uiDisplay ?? '—'} | ${r.match ? 'OK' : 'MISMATCH'} |`,
  ),
  '',
  `Mismatches: **${mismatches}/${MASTERS.length}**`,
  '',
  'Production V1 path: unchanged (predictNextDigitStep only for V1 column)',
  'V2 UI path: getAnalysisV2DisplayValue → runHumanStyleV2(result.digits, result.masterNo)',
];

const report = lines.join('\n');
fs.mkdirSync('imports', { recursive: true });
fs.writeFileSync(path.join('imports', 'analysis-v2-ui-verification.md'), report, 'utf8');

console.log(report);
console.log(`\nMismatches: ${mismatches}/${MASTERS.length}`);
process.exit(mismatches > 0 ? 1 : 0);
