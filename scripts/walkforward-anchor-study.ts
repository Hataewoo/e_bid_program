/**
 * Walk-forward anchor digit stickiness study.
 * Usage: npx vite-node --config scripts/vite-node.config.ts scripts/walkforward-anchor-study.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import {
  analyzeMasterValue,
  buildCodeValueStats,
  type CodeMatchInput,
  type CodeValueStatRow,
} from '../src/shared/utils/analysisEngine';
import {
  getMainBandLabel,
  getSubBandLabel,
  pickTopRecommendCandidates,
  resolveEligibleDigitPool,
  resolveFinalDigitPick,
  resolvePatternRecommendPath,
} from '../src/shared/utils/patternRecommendEngine';
import { predictNextDigitStep } from '../src/shared/utils/nextDigitEngine';
import { pickDigitByLegacyCodeContent } from '../src/shared/utils/legacyDigitCodePick';
import { pickDigitByPatternFlow } from '../src/shared/utils/patternFlowPick';
import { resolveSubBandFromPatternFlow } from '../src/shared/utils/patternFlowPick';
import { refineSubBandWithSiblingCodeFlow } from '../src/shared/utils/subBandCrossRefinement';
import {
  findLastDigitInMainBand,
  findLastDigitInSubBand,
  virtualMasterDigits,
} from '../src/shared/utils/subBandRepeatJudgment';
import { resolveAnchorDigitForSubBand } from '../src/shared/utils/subBandCrossRefinement';
import {
  dominantPhaseFromCodeFlow,
  resolvePrimaryCodeForDigit,
  scoreAnchorDigitCodeFlow,
} from '../src/shared/utils/legacyCodeFlowAnalysis';
import { getDigitSubBand, getSubBandMainBand, type DigitSubBand } from '../src/shared/utils/digitSubBand';
import { wouldFormRepetitivePattern } from '../src/shared/utils/patternRepeatGuard';
import { sliceRecentDigitScoreTail, RECENT_DIGIT_SCORE_TAIL } from '../src/shared/utils/recentCompare';
import {
  buildPointValueTokens,
  filterPointValuesToSubBand,
  getSidePointValues,
} from '../src/shared/utils/pointValuesCodeFlow';

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

import { computeDigitPredictionScores } from '../src/shared/utils/digitCandidateScoring';

/** Walk-forward baseline (pre unified-scoring, v1.2.5) */
const BASELINE = {
  anchor8: { topRec: 1, topPct: 23.6, legacyFinal: 68, cases: 72, repeatPct: 62.5, lowHigh2: 34.6 },
  anchor2: { topRec: 5, topPct: 31.8, lowHigh2: 91.7 },
  anchor5: { topRec: 5, topPct: 26.3, highLow5: 50.0 },
  anchor0: { topRec: 5, topPct: 19.5, lowLow0: 37.0 },
  highHigh8: 76.9,
} as const;
const TAIL_LEN = 12;

interface DbCode {
  id: number;
  code: string;
  type: string;
  description: string;
}

function toCodeMatchInputs(codes: DbCode[]): CodeMatchInput[] {
  return codes.map((c) => ({
    id: c.id,
    code: c.code,
    type: c.type,
    description: c.description ?? '',
  }));
}

function codeStatsToMatchInputs(stats: CodeValueStatRow[]): CodeMatchInput[] {
  return stats.map((row, index) => ({
    id: index,
    code: row.code,
    type: row.type,
    description: row.description ?? '',
  }));
}

function resolveAnchor(
  result: ReturnType<typeof analyzeMasterValue>,
  prefix: string,
  subBand: DigitSubBand,
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

function patternSourceSequence(
  result: ReturnType<typeof analyzeMasterValue>,
  prefix: string,
  subBand: DigitSubBand,
): string {
  const side = getSubBandMainBand(subBand) === 'low' ? 'low' : 'high';
  const filtered = filterPointValuesToSubBand(getSidePointValues(result, prefix, side), subBand);
  const tokens = sliceRecentDigitScoreTail(buildPointValueTokens(filtered));
  return tokens
    .slice(-RECENT_DIGIT_SCORE_TAIL)
    .map((t) => (t.sourceDigit === t.value ? String(t.sourceDigit) : `${t.value}(→${t.sourceDigit})`))
    .join(',');
}

function simulatePickTransitionInPool(
  pool: readonly number[],
  lastDigit: number,
  prefix: string,
): { executed: boolean; chosen: number | null; poolOrder: readonly number[] } {
  const alt = pool.find((d) => d !== lastDigit && !wouldFormRepetitivePattern(prefix, d));
  if (alt !== undefined) return { executed: true, chosen: alt, poolOrder: pool };
  const alt2 = pool.find((d) => d !== lastDigit);
  if (alt2 !== undefined) return { executed: true, chosen: alt2, poolOrder: pool };
  return { executed: pool.length > 0, chosen: pool[0] ?? null, poolOrder: pool };
}

type CauseTag =
  | 'anchor2_legacy_repeat'
  | 'transition_first_allowed'
  | 'pattern_score_top'
  | 'tie_break'
  | 'other';

interface CaseRow {
  masterIdx: number;
  posIdx: number;
  anchorDigit: number;
  inputTail: string;
  actualNext: number;
  recommendUi: number;
  recommendEmpty: number;
  uiDiffersFromEmpty: boolean;
  mainBand: string;
  subBand: string;
  subBefore: string;
  subAfter: string;
  pool: string;
  anchor: string;
  legacyPhase: string;
  legacyDigit: string;
  patternPhase: string;
  patternDigit: string;
  finalMode: string;
  mainReason: string;
  subReason: string;
  refineReason: string;
  voteCount: number;
  repeatWeight: number;
  transitionWeight: number;
  voteCodes: string;
  patternSource: string;
  transitionPoolUsed: string;
  top234Scores: string;
  causeIf2: CauseTag | '';
  legacyAlone: boolean;
  patternFlowChanged: boolean;
  patternSignalsUsed: boolean;
  uniqueKey: string;
}

const ANCHOR_DIGITS = [0, 2, 5, 8] as const;

function classifyCause2(row: Omit<CaseRow, 'causeIf2'>, eligible: readonly number[]): CauseTag | '' {
  if (row.recommendUi !== 2) return '';
  const anchor = row.anchor === '-' ? null : Number(row.anchor);
  const legacyDigit = row.legacyDigit.startsWith('2') ? 2 : Number(row.legacyDigit.split('(')[0]);
  const patternDigit = Number(row.patternDigit.split('(')[0]);
  const legacyPhase = row.legacyPhase;
  const finalMode = row.finalMode;

  if (anchor === 2 && legacyPhase === 'repeat' && legacyDigit === 2 && row.recommendUi === 2) {
    return 'anchor2_legacy_repeat';
  }
  if (finalMode === 'transition' && row.recommendUi === 2 && legacyDigit === 2) {
    return 'transition_first_allowed';
  }
  if (patternDigit === 2 && legacyPhase !== 'repeat' && row.recommendUi === 2) {
    return 'pattern_score_top';
  }
  if (eligible.indexOf(2) === 0 && eligible.length > 1) {
    return 'tie_break';
  }
  return 'other';
}

function runCase(
  masterIdx: number,
  digits: string,
  posIdx: number,
  anchorTarget: number,
  dbCodes: DbCode[],
): CaseRow | null {
  const anchorDigit = Number(digits[posIdx]);
  if (anchorDigit !== anchorTarget) return null;
  const actualNext = digits[posIdx + 1];
  if (actualNext === undefined) return null;

  const history = digits.slice(0, posIdx + 1);
  const prefix = '';
  const result = analyzeMasterValue('00', history);
  const codeMatchInputs = toCodeMatchInputs(dbCodes);
  const codeValueStats = buildCodeValueStats(result, codeMatchInputs);
  const codesFromStats = codeStatsToMatchInputs(codeValueStats);

  const path = resolvePatternRecommendPath(result, prefix, codesFromStats);
  const initialSub = resolveSubBandFromPatternFlow(result, prefix, path.targetMainBand);
  const refined = refineSubBandWithSiblingCodeFlow(
    result,
    prefix,
    path.targetMainBand,
    initialSub.sub,
    codesFromStats,
  );
  const eligible = resolveEligibleDigitPool(path, prefix);
  const anchor = resolveAnchor(result, prefix, path.targetSubBand, eligible);

  const legacyPick = pickDigitByLegacyCodeContent(
    eligible,
    result,
    prefix,
    path.targetSubBand,
    codesFromStats,
  );
  const patternPick = pickDigitByPatternFlow(eligible, result, prefix, path.targetSubBand);
  const finalPick = resolveFinalDigitPick(path, result, prefix, codesFromStats);

  const stepUi = predictNextDigitStep(result, codeValueStats, prefix, 4);
  const stepEmpty = predictNextDigitStep(result, [], prefix, 4);
  const recommendUi = stepUi?.candidates[0]?.digit ?? -1;
  const recommendEmpty = stepEmpty?.candidates[0]?.digit ?? -1;

  const breakdown = computeDigitPredictionScores(path, result, prefix, codesFromStats, eligible);
  const legacyAlone =
    breakdown.legacyWouldPick !== null && breakdown.legacyWouldPick === breakdown.winningDigit;
  const patternFlowChanged =
    breakdown.patternFlowWouldPick !== null &&
    breakdown.patternFlowWouldPick !== breakdown.winningDigit;
  const patternSignalsUsed = breakdown.patternSignalCount > 0;

  const mainBand = getMainBandLabel(path.targetMainBand);
  const subBand = getSubBandLabel(path.targetSubBand);
  const pool = eligible.join(',');

  let flowScore = {
    repeatWeight: 0,
    transitionWeight: 0,
    votes: [] as { codeName: string; phase: string }[],
  };
  if (anchor !== null) {
    const mainBandKey = path.targetSubBand === 'lowLow' || path.targetSubBand === 'lowHigh' ? 'low' : 'high';
    const currentSub = getDigitSubBand(anchor);
    if (currentSub) {
      flowScore = scoreAnchorDigitCodeFlow(
        result,
        mainBandKey,
        anchor,
        currentSub,
        codesFromStats,
        resolvePrimaryCodeForDigit(anchor, mainBandKey),
      );
    }
  }

  const transSim =
    anchor !== null
      ? simulatePickTransitionInPool(eligible, anchor, prefix)
      : { executed: false, chosen: null, poolOrder: eligible };

  const topCands = pickTopRecommendCandidates(path, 4, prefix, history, result, codesFromStats);
  const scoreParts = topCands.slice(1, 4).map((c, i) => `#${i + 2}:${c.digit}=${c.patternScore.toFixed(2)}`);
  const top234Scores =
    `#1:${topCands[0]?.digit ?? '-'}=${topCands[0]?.patternScore.toFixed(2) ?? '-'}` +
    (scoreParts.length ? ' ' + scoreParts.join(' ') : '');

  const legacyPhase = legacyPick ? dominantPhaseFromCodeFlow({
    anchorDigit: anchor ?? 0,
    subBand: path.targetSubBand,
    repeatWeight: flowScore.repeatWeight,
    transitionWeight: flowScore.transitionWeight,
    netStay: flowScore.repeatWeight - flowScore.transitionWeight,
    votes: flowScore.votes as never[],
    consultedCodes: flowScore.votes.map((v) => v.codeName),
  }) : 'null';

  const rowBase = {
    masterIdx,
    posIdx,
    anchorDigit,
    inputTail: history.slice(-TAIL_LEN),
    actualNext: Number(actualNext),
    recommendUi,
    recommendEmpty,
    uiDiffersFromEmpty: recommendUi !== recommendEmpty,
    mainBand,
    subBand,
    subBefore: getSubBandLabel(initialSub.sub),
    subAfter: getSubBandLabel(refined.sub),
    pool,
    anchor: anchor !== null ? String(anchor) : '-',
    legacyPhase,
    legacyDigit: legacyPick ? `${legacyPick.digit}(${legacyPick.mode})` : 'null',
    patternPhase: `${patternPick.mode}`,
    patternDigit: `${patternPick.digit}(${patternPick.mode})`,
    finalMode: finalPick?.mode ?? '-',
    mainReason: path.mainBandReasons[0] ?? '',
    subReason: initialSub.reasons[0] ?? '',
    refineReason: refined.reasons.join(' | '),
    voteCount: flowScore.votes.length,
    repeatWeight: flowScore.repeatWeight,
    transitionWeight: flowScore.transitionWeight,
    voteCodes: flowScore.votes.map((v) => `${v.codeName}:${v.phase}`).join('; ') || '-',
    patternSource: patternSourceSequence(result, prefix, path.targetSubBand),
    transitionPoolUsed: transSim.executed
      ? `pool=[${transSim.poolOrder.join(',')}] pick=${transSim.chosen}`
      : 'no',
    top234Scores,
    causeIf2: '' as CauseTag | '',
    legacyAlone,
    patternFlowChanged,
    patternSignalsUsed,
    uniqueKey: history.slice(-6),
  };

  return {
    ...rowBase,
    causeIf2: classifyCause2(rowBase, eligible),
  };
}

function collectCases(anchorTarget: number, dbCodes: DbCode[]): CaseRow[] {
  const rows: CaseRow[] = [];
  for (let mi = 0; mi < MASTERS.length; mi += 1) {
    const digits = MASTERS[mi]!;
    for (let i = 0; i < digits.length - 1; i += 1) {
      const row = runCase(mi + 1, digits, i, anchorTarget, dbCodes);
      if (row) rows.push(row);
    }
  }
  return rows;
}

function dist(values: number[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
  return m;
}

function formatDist(m: Map<number, number>, total: number): string {
  return [...m.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([d, c]) => `${d}: ${c}회 (${((c / total) * 100).toFixed(1)}%)`)
    .join('\n');
}

function subBandDist(rows: CaseRow[]): string {
  const m = new Map<string, number>();
  for (const r of rows) m.set(r.subBand, (m.get(r.subBand) ?? 0) + 1);
  const total = rows.length;
  return [...m.entries()]
    .map(([k, c]) => `${k}: ${c} (${((c / total) * 100).toFixed(1)}%)`)
    .join('\n');
}

function lowHighDigitDist(rows: CaseRow[], field: 'recommendUi' | 'actualNext'): string {
  const filtered = rows.filter((r) => r.subBand.includes('2~4') || r.subBand.includes('저점의 고점'));
  const vals = filtered.map((r) => r[field]);
  const m = dist(vals);
  const total = filtered.length;
  if (total === 0) return '(lowHigh case 없음)';
  return [2, 3, 4]
    .map((d) => `${d}: ${m.get(d) ?? 0}회 (${(((m.get(d) ?? 0) / total) * 100).toFixed(1)}%)`)
    .join('\n');
}

function firstPoolDigitBias(rows: CaseRow[]): string {
  const subMap: Record<string, number[]> = {
    lowLow: [0, 1],
    lowHigh: [2, 3, 4],
    highLow: [5, 6, 7],
    highHigh: [8, 9],
  };
  const lines: string[] = [];
  for (const [key, pool] of Object.entries(subMap)) {
    const first = pool[0]!;
    const subRows = rows.filter((r) => {
      if (key === 'lowLow') return r.subBand.includes('0~1');
      if (key === 'lowHigh') return r.subBand.includes('2~4');
      if (key === 'highLow') return r.subBand.includes('5~7');
      return r.subBand.includes('8~9');
    });
    if (subRows.length === 0) continue;
    const recFirst = subRows.filter((r) => r.recommendUi === first).length;
    lines.push(
      `${key} pool[${pool.join(',')}] first=${first}: ${recFirst}/${subRows.length} (${((recFirst / subRows.length) * 100).toFixed(1)}%)`,
    );
  }
  return lines.join('\n');
}

async function main() {
  const prisma = new PrismaClient();
  const dbCodes = await prisma.code.findMany({ orderBy: { code: 'asc' } });
  await prisma.$disconnect();

  console.log(`DB codes loaded: ${dbCodes.length}`);
  if (dbCodes.length === 0) {
    console.log('WARNING: No codes in DB — UI codeValueStats will be [] (catalog fallback only)');
  }

  const report: string[] = [];
  const append = (s: string) => {
    report.push(s);
    console.log(s);
  };

  append('# Walk-forward Anchor Digit Study\n');
  append(`Masters: ${MASTERS.length}, walk-forward (prefix="" UI-exact per snapshot)\n`);

  // UI vs empty codes diff check on anchor=8 cases first
  const cases8 = collectCases(8, dbCodes);
  const uiDiff = cases8.filter((r) => r.uiDiffersFromEmpty);
  append(`## codeStats UI vs empty (anchor=8 cases: ${cases8.length})`);
  append(`Differing recommendations: ${uiDiff.length}/${cases8.length}`);
  if (uiDiff.length > 0) {
    append('Sample diffs (first 10):');
    for (const r of uiDiff.slice(0, 10)) {
      append(
        `  m${r.masterIdx}@${r.posIdx} tail=…${r.inputTail.slice(-8)} UI=${r.recommendUi} empty=${r.recommendEmpty}`,
      );
    }
  } else {
    append('No difference between UI codeValueStats path and codeStats=[] for these cases.');
  }
  append('');

  for (const anchor of ANCHOR_DIGITS) {
    const rows = collectCases(anchor, dbCodes);
    append(`\n${'='.repeat(80)}`);
    append(`## Anchor digit = ${anchor} (${rows.length} cases)\n`);

    append(
      '| idx | inputTail | actual | rec(UI) | rec(empty) | Main | Sub | pool | anchor | LegPh | LegD | PatPh | PatD | mode |',
    );
    append('|-----|-----------|--------|-----------|------------|------|-----|------|--------|-------|------|-------|------|------|');
    rows.forEach((r, idx) => {
      append(
        `| ${idx + 1} | …${r.inputTail.slice(-10)} | ${r.actualNext} | ${r.recommendUi} | ${r.recommendEmpty} | ${r.mainBand.slice(0, 4)} | ${r.subBand.slice(-6)} | [${r.pool}] | ${r.anchor} | ${r.legacyPhase} | ${r.legacyDigit} | ${r.patternPhase} | ${r.patternDigit} | ${r.finalMode} |`,
      );
    });

    append('\n### Detail sample (first 5)\n');
    for (const r of rows.slice(0, 5)) {
      append(`Case m${r.masterIdx} pos${r.posIdx} tail=…${r.inputTail}`);
      append(`  main: ${r.mainReason}`);
      append(`  sub: ${r.subReason}`);
      append(`  refine: ${r.subBefore} → ${r.subAfter} | ${r.refineReason}`);
      append(`  votes(${r.voteCount}) rw=${r.repeatWeight} tw=${r.transitionWeight}: ${r.voteCodes}`);
      append(`  pattern S″: ${r.patternSource}`);
      append(`  transitionPool: ${r.transitionPoolUsed}`);
      append(`  top scores: ${r.top234Scores}`);
      append('');
    }

    const recDist = dist(rows.map((r) => r.recommendUi));
    const actDist = dist(rows.map((r) => r.actualNext));
    append('### 1. 추천값 분포 (UI path)');
    append(formatDist(recDist, rows.length));
    append('\n### 2. 실제 다음값 분포');
    append(formatDist(actDist, rows.length));
    append('\n### 3. SubBand 분포');
    append(subBandDist(rows));
    append('\n### 4. lowHigh [2,3,4] 추천 분포');
    append(lowHighDigitDist(rows, 'recommendUi'));
    append('\n### 4b. lowHigh 실제 분포');
    append(lowHighDigitDist(rows, 'actualNext'));

    if (anchor === 8 || anchor === 2) {
      const twos = rows.filter((r) => r.recommendUi === 2);
      const causeDist = new Map<CauseTag | '', number>();
      for (const r of twos) {
        causeDist.set(r.causeIf2, (causeDist.get(r.causeIf2) ?? 0) + 1);
      }
      append(`\n### 5. recommend=2 원인 (${twos.length}건)`);
      for (const [k, v] of causeDist) append(`  ${k || 'n/a'}: ${v}`);
    }

    append('\n### Pool first-digit bias');
    append(firstPoolDigitBias(rows));
  }

  // Cross-anchor summary
  append(`\n${'='.repeat(80)}`);
  append('## Cross-anchor summary\n');
  append('| anchor | cases | top rec | top % | Legacy alone=final | repeat % | patternFlow≠final | patternSignals | unique rec | lowHigh 2% |');
  append('|--------|-------|---------|-------|-------------------|----------|------------------|----------------|------------|------------|');
  for (const anchor of ANCHOR_DIGITS) {
    const rows = collectCases(anchor, dbCodes);
    const recDist = dist(rows.map((r) => r.recommendUi));
    const topRec = [...recDist.entries()].sort((a, b) => b[1] - a[1])[0];
    const legacyAloneCount = rows.filter((r) => r.legacyAlone).length;
    const repeatMode = rows.filter((r) => r.finalMode === 'repeat').length;
    const pfChanged = rows.filter((r) => r.patternFlowChanged).length;
    const psUsed = rows.filter((r) => r.patternSignalsUsed).length;
    const uniqueRec = new Set(rows.map((r) => r.recommendUi)).size;
    const lowHigh = rows.filter((r) => r.subBand.includes('2~4') || r.subBand.includes('저점의 고점'));
    const lh2 = lowHigh.filter((r) => r.recommendUi === 2).length;
    const lh2pct = lowHigh.length ? ((lh2 / lowHigh.length) * 100).toFixed(1) : '-';
    append(
      `| ${anchor} | ${rows.length} | ${topRec?.[0] ?? '-'} | ${topRec ? ((topRec[1] / rows.length) * 100).toFixed(1) : '-'}% | ${legacyAloneCount}/${rows.length} | ${((repeatMode / rows.length) * 100).toFixed(1)}% | ${pfChanged} | ${psUsed} | ${uniqueRec} | ${lh2pct}% |`,
    );
  }

  append('\n## Before/After vs baseline (v1.2.5)\n');
  append('| metric | before | after |');
  append('|--------|--------|-------|');
  const after8 = collectCases(8, dbCodes);
  const a8top = [...dist(after8.map((r) => r.recommendUi)).entries()].sort((a, b) => b[1] - a[1])[0];
  const a8legacy = after8.filter((r) => r.legacyAlone).length;
  const a8lh = after8.filter((r) => r.subBand.includes('2~4') || r.subBand.includes('저점의 고점'));
  const a8lh2 = a8lh.filter((r) => r.recommendUi === 2).length;
  append(
    `| anchor=8 top rec | ${BASELINE.anchor8.topRec} (${BASELINE.anchor8.topPct}%) | ${a8top?.[0]} (${a8top ? ((a8top[1] / after8.length) * 100).toFixed(1) : '-'}%) |`,
  );
  append(`| anchor=8 Legacy=final | ${BASELINE.anchor8.legacyFinal}/${BASELINE.anchor8.cases} | ${a8legacy}/${after8.length} |`);
  append(
    `| anchor=8 lowHigh→2 | ${BASELINE.anchor8.lowHigh2}% | ${a8lh.length ? ((a8lh2 / a8lh.length) * 100).toFixed(1) : '-'}% |`,
  );
  append(`| anchor=2 lowHigh→2 | ${BASELINE.anchor2.lowHigh2}% | see section |`);
  append(`| highHigh→8 first | ${BASELINE.highHigh8}% | see section |`);

  const outPath = path.join(process.cwd(), 'imports', 'walkforward-anchor-study.md');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, report.join('\n'), 'utf8');
  console.log(`\nReport written: ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
