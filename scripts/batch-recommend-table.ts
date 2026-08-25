/**
 * Batch run current recommend pipeline — table output for diagnosis.
 * Usage: npx vite-node --config scripts/vite-node.config.ts scripts/batch-recommend-table.ts
 */
import { analyzeMasterValue } from '../src/shared/utils/analysisEngine';
import {
  getMainBandLabel,
  getSubBandLabel,
  resolveEligibleDigitPool,
  resolveFinalDigitPick,
  resolvePatternRecommendPath,
  recommendNextDigitStep,
} from '../src/shared/utils/patternRecommendEngine';
import { pickDigitByLegacyCodeContent } from '../src/shared/utils/legacyDigitCodePick';
import { pickDigitByPatternFlow } from '../src/shared/utils/patternFlowPick';
import {
  findLastDigitInMainBand,
  findLastDigitInSubBand,
  virtualMasterDigits,
} from '../src/shared/utils/subBandRepeatJudgment';
import { resolveAnchorDigitForSubBand } from '../src/shared/utils/subBandCrossRefinement';

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
  .map((s) => s.replace(/\s/g, ''))
  .filter(Boolean);

/** UI와 동일: full master 분석 + prefix '' (다음 1자리) */
type Row = {
  no: number;
  tail: string;
  actual: number;
  recommend: number | string;
  ok: string;
  mainBand: string;
  subBand: string;
  anchor: string;
  mode: string;
  legacy: string;
  pattern: string;
};

function resolveAnchor(
  result: ReturnType<typeof analyzeMasterValue>,
  prefix: string,
  subBand: Parameters<typeof resolveAnchorDigitForSubBand>[1],
  pool: readonly number[],
): number | null {
  const context = virtualMasterDigits(result, prefix);
  const mainBand = subBand === 'lowLow' || subBand === 'lowHigh' ? 'low' : 'high';
  return (
    resolveAnchorDigitForSubBand(context, subBand, pool) ??
    findLastDigitInSubBand(context, subBand) ??
    findLastDigitInMainBand(context, mainBand)
  );
}

function runOne(full: string, no: number, holdout: boolean): Row {
  const actual = Number(full.slice(-1));
  const history = holdout && full.length > 1 ? full.slice(0, -1) : full;
  const result = analyzeMasterValue('00', history);
  const codes: never[] = [];
  const prefix = '';

  const path = resolvePatternRecommendPath(result, prefix, codes);
  const eligible = resolveEligibleDigitPool(path, prefix);
  const anchor = resolveAnchor(result, prefix, path.targetSubBand, eligible);

  const legacyPick = pickDigitByLegacyCodeContent(
    eligible,
    result,
    prefix,
    path.targetSubBand,
    codes,
  );
  const patternPick = pickDigitByPatternFlow(eligible, result, prefix, path.targetSubBand);
  const finalPick = resolveFinalDigitPick(path, result, prefix, codes);
  const step = recommendNextDigitStep(result, prefix, 1, codes);
  const recommend = step?.candidates[0]?.digit ?? finalPick?.digit ?? '-';

  const legacyStr = legacyPick
    ? `${legacyPick.digit}(${legacyPick.mode})`
    : 'null';
  const patternStr = `${patternPick.digit}(${patternPick.mode})`;

  return {
    no,
    tail: full.slice(-8),
    actual,
    recommend,
    ok: recommend === actual ? 'O' : 'X',
    mainBand: getMainBandLabel(path.targetMainBand),
    subBand: getSubBandLabel(path.targetSubBand),
    anchor: anchor !== null ? String(anchor) : '-',
    mode: finalPick?.mode ?? '-',
    legacy: legacyStr,
    pattern: patternStr,
  };
}

const rowsHoldout = MASTERS.map((m, i) => runOne(m, i + 1, true));
const rowsFull = MASTERS.map((m, i) => runOne(m, i + 1, false));
const hitsH = rowsHoldout.filter((r) => r.ok === 'O').length;
const hitsF = rowsFull.filter((r) => r.ok === 'O').length;

function printTable(title: string, rows: Row[], hits: number) {
  console.log(`\n=== ${title} ===`);
  console.log(`샘플 ${rows.length}건 | 적중 ${hits}/${rows.length} (${((hits / rows.length) * 100).toFixed(1)}%)\n`);
  console.log(
    '| # | 꼬리8 | 추천 | 실제 | O/X | MainBand | SubBand | anchor | mode | Legacy | Pattern |',
  );
  console.log(
    '|---|--------|------|------|-----|----------|---------|--------|------|--------|---------|',
  );
  for (const r of rows) {
    console.log(
      `| ${r.no} | …${r.tail} | ${r.recommend} | ${r.actual} | ${r.ok} | ${r.mainBand} | ${r.subBand} | ${r.anchor} | ${r.mode} | ${r.legacy} | ${r.pattern} |`,
    );
  }
}

printTable(
  'Holdout — 입력=마지막 digit 제외, 실제=꼬리 digit (다음값 검증)',
  rowsHoldout,
  hitsH,
);
printTable(
  'UI 동일 — full master 분석 + prefix "" (Analysis 패널과 동일)',
  rowsFull,
  hitsF,
);
