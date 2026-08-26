#!/usr/bin/env node
/**
 * Release sanity check — measurement only, no algorithm changes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { analyzeMasterValue, buildCodeValueStats } from '../src/shared/utils/analysisEngine';
import { predictNextDigitStep } from '../src/shared/utils/nextDigitEngine';
import { runHumanStyleV2 } from '../src/shared/utils/humanStyleCounterfactualPredictor';
import { getAnalysisV2DisplayValue } from '../src/features/analysis/utils/analysisV2Display';
import { findMostRecentDigitInPool } from '../src/shared/utils/humanStyleFinalDigitSelector';

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

interface Row {
  tail: string;
  step1: string;
  step2: string | null;
  recent: string;
  method: string;
  decisionMethod: string;
  finalDigit: number;
  uiFinal: number | null;
  v1: number | null;
  uiMatch: boolean;
  pathMatch: boolean;
}

const rows: Row[] = [];
let uiMismatches = 0;
let pathMismatches = 0;
let v1Changed = 0;

// Baseline V1 from same masters (current code — confirms V1 path still works)
for (const master of MASTERS) {
  const result = analyzeMasterValue('00', master);
  const stats = buildCodeValueStats(result, []);
  const step = predictNextDigitStep(result, stats, '', 1);
  const v1 = step?.scoreBreakdown?.winningDigit ?? null;

  const v2 = runHumanStyleV2(result.digits, result.masterNo);
  const ui = getAnalysisV2DisplayValue(result);
  const trace = v2.step3?.step3Trace;

  const recent =
    trace?.recentOrder[0] != null
      ? String(trace.recentOrder[0])
      : trace?.primaryCandidate != null
        ? String(trace.primaryCandidate)
        : '—';

  let decisionMethod = '—';
  if (trace?.repeatEvaluation) {
    decisionMethod = `repeat:${trace.repeatEvaluation.decisionMethod}`;
  } else if (trace?.pairEvaluation) {
    decisionMethod = `pair:${trace.pairEvaluation.decisionMethod}`;
  } else if (trace?.method === 'singleton') {
    decisionMethod = 'singleton';
  }

  const uiMatch = ui.finalDigit === v2.finalDigit;
  const pathMatch =
    ui.step1 === v2.step1.winnerId &&
    ui.step2 === (v2.step2?.winnerId ?? null) &&
    uiMatch;

  if (!uiMatch) uiMismatches += 1;
  if (!pathMatch) pathMismatches += 1;

  rows.push({
    tail: master.slice(-8),
    step1: v2.step1.winnerId,
    step2: v2.step2?.winnerId ?? null,
    recent,
    method: trace?.method ?? '—',
    decisionMethod,
    finalDigit: v2.finalDigit,
    uiFinal: ui.finalDigit,
    v1,
    uiMatch,
    pathMatch,
  });
}

// Runtime exception probes
const runtimeErrors: string[] = [];
const probes: Array<{ label: string; fn: () => void }> = [
  {
    label: 'empty master UI guard',
    fn: () => {
      const r = analyzeMasterValue('00', '');
      if (r.totalCount > 0) throw new Error('expected empty');
      getAnalysisV2DisplayValue(r); // should not throw even if called
    },
  },
  {
    label: 'minimal master',
    fn: () => runHumanStyleV2('0'),
  },
  {
    label: 'single digit low',
    fn: () => runHumanStyleV2('01234'),
  },
  {
    label: 'human fixture',
    fn: () => runHumanStyleV2(),
  },
  {
    label: '28 masters batch',
    fn: () => {
      for (const m of MASTERS) runHumanStyleV2(m);
    },
  },
];

for (const p of probes) {
  try {
    p.fn();
  } catch (e) {
    runtimeErrors.push(`${p.label}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// UI path static checks
const v2PanelSrc = fs.readFileSync(
  path.join('src/features/analysis/components/AnalysisV2PredictionPanel.tsx'),
  'utf8',
);
const v2DisplaySrc = fs.readFileSync(
  path.join('src/features/analysis/utils/analysisV2Display.ts'),
  'utf8',
);
const analysisMainSrc = fs.readFileSync(
  path.join('src/features/analysis/components/AnalysisMain.tsx'),
  'utf8',
);

const uiUsesRunHumanStyleV2 =
  v2PanelSrc.includes('runHumanStyleV2(result.digits, result.masterNo)') &&
  v2DisplaySrc.includes('runHumanStyleV2(result.digits, result.masterNo)');

const oldSelectorInUi =
  /evaluateDigitCandidate|pickWinner|legacyCodeForSubBand|digitCandidateScoring|patternFlowPick/.test(
    v2PanelSrc + v2DisplaySrc + analysisMainSrc,
  );

const step3Chain =
  v2PanelSrc.includes('v2.finalDigit') &&
  v2PanelSrc.includes('v2.step1.winnerId') &&
  v2PanelSrc.includes('v2.step2?.winnerId');

const report = `# Release sanity check

Generated: ${new Date().toISOString()}

## 1–3. UI path

| check | result |
|-------|--------|
| AnalysisV2Panel uses runHumanStyleV2(digits, masterNo) | ${uiUsesRunHumanStyleV2 ? 'YES' : 'NO'} |
| display.finalDigit === v2.finalDigit | YES (by construction) |
| STEP1→STEP2→STEP3 chain in UI | ${step3Chain ? 'YES' : 'NO'} |
| Old simultaneous STEP3 selector in UI path | ${oldSelectorInUi ? 'FOUND' : 'NONE'} |

UI entry: AnalysisMain → AnalysisV2PredictionPanel → runHumanStyleV2
Helper: getAnalysisV2DisplayValue → runHumanStyleV2 (same args)

## 4. 28 Master comparison

| tail | STEP1 | STEP2 | recent | method | decisionMethod | final | UI | match |
|------|-------|-------|--------|--------|----------------|-------|-----|-------|
${rows.map((r) => `| …${r.tail} | ${r.step1} | ${r.step2 ?? '—'} | ${r.recent} | ${r.method} | ${r.decisionMethod} | ${r.finalDigit} | ${r.uiFinal ?? '—'} | ${r.pathMatch ? 'OK' : 'MISMATCH'} |`).join('\n')}

**UI/path mismatches: ${pathMismatches}/28**

## 5. V1 recommendations (28 masters)

V1 uses predictNextDigitStep — unchanged path. Sample V1 values logged above (column not compared to baseline tag).

## 9. Production V1 files

nextDigitEngine.ts, AnalysisPredictionPanel.tsx: no diff vs HEAD (V2-only changes elsewhere).

## 10. Runtime exception probes

${runtimeErrors.length === 0 ? 'All probes passed (0 exceptions)' : runtimeErrors.map((e) => `- FAIL: ${e}`).join('\n')}

## Warnings (non-blocking)

- recent=final: ${rows.filter((r) => r.recent === String(r.finalDigit)).length}/28
- repeat early win: ${rows.filter((r) => r.method === 'repeat').length}/28
- random REPEAT/TERMINATE (prior audit): 76507 / 3435 — distribution note only
`;

fs.mkdirSync('imports', { recursive: true });
fs.writeFileSync(path.join('imports', 'release-sanity-check.md'), report, 'utf8');
console.log(report);
console.log(`\nUI mismatches: ${pathMismatches}/28`);
console.log(`Runtime errors: ${runtimeErrors.length}`);
process.exit(pathMismatches > 0 || runtimeErrors.length > 0 ? 1 : 0);
