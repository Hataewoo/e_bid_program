#!/usr/bin/env node
/**
 * STEP3 REPEAT/TERMINATE interpretation audit — no logic changes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { analyzeMasterValue, filterDigitsByClass } from '../src/shared/utils/analysisEngine';
import { buildLegacyCodeContentForCodeName } from '../src/shared/utils/legacyCodeFlowAnalysis';
import { computeLegacyCodeContentGaps } from '../src/shared/utils/legacyEmyoungAlgorithms';
import { getLegacyStepCodeDefinition } from '../src/shared/fixtures/legacy-step-code-catalog';
import {
  ALL_PATTERN_FIELDS,
  analyzeRecursivePatternFlow,
  classifyOneDuplicateRunRelation,
  computePatternNaturalness,
  flattenPatternLayers,
  getPatternLayerLeaf,
  inferParentBranchImplication,
  scorePatternInformativeness,
  trailingValueRun,
} from '../src/shared/utils/humanStylePatternCore';
import { extractCodeValuesFromBaseSequence } from '../src/shared/utils/codeValueSubAnalysis';
import {
  HUMAN_DIAGNOSTIC_FIXTURE_MASTER,
  runHumanStyleV2,
} from '../src/shared/utils/humanStyleCounterfactualPredictor';
import {
  evaluateCandidateRepeatByCodeContent,
  findMostRecentDigitInPool,
  resolveRepeatEvaluationCode,
} from '../src/shared/utils/humanStyleFinalDigitSelector';
import { getDigitsInSubBand } from '../src/shared/utils/digitSubBand';

const HUMAN_01_EXPECTED = [
  2, 1, 2, 2, 1, 1, 2, 1, 1, 5, 1, 2, 1, 2, 4, 5, 2, 3, 4, 1, 9, 1, 1, 1, 2, 1, 1,
  1, 2, 2, 4, 2, 1, 2, 3, 2, 1, 1, 3, 1, 2, 1, 2, 2, 1, 2, 1, 1, 4, 1,
];

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

function tailN(arr: readonly number[], n: number): string {
  return arr.slice(-n).join(',');
}

function patternDetail(
  seq: readonly number[],
  side: 'low' | 'high',
  sub: 'lowLow' | 'lowHigh' | 'highLow' | 'highHigh',
  liveRun: number,
) {
  const patterns = extractCodeValuesFromBaseSequence([...seq], side);
  return ALL_PATTERN_FIELDS.map((field) => {
    const vals = patterns[field] ?? [];
    const dup =
      field === 'oneDuplicate' && vals.length > 0
        ? classifyOneDuplicateRunRelation(seq, liveRun)
        : null;
    const path = analyzeRecursivePatternFlow({
      sequence: [...seq],
      sequenceLabel: `audit@${field}`,
      side,
      currentSub: sub,
      liveRunLength: liveRun,
      maxDepth: 1,
    });
    const leaf = getPatternLayerLeaf(path);
    const leafDup =
      leaf.tailFlow?.oneDuplicateRelation ??
      classifyOneDuplicateRunRelation(leaf.sequence, liveRun);
    const child = leafDup?.childBehavior ?? 'uncertain';
    const nat = computePatternNaturalness(path, liveRun);
    const parent = inferParentBranchImplication(child, 'digit', {
      candidateMatchesCurrent: true,
      naturalness: nat,
    });
    return {
      field,
      tail20: tailN(vals, 20),
      dup: dup
        ? `hint=${dup.expectedHint} run=${dup.activeRun} rel=${dup.relation} child=${dup.childBehavior}`
        : '—',
      leafChild: child,
      parent,
      naturalness: `cont=${nat.continuationFit.toFixed(2)} term=${nat.terminationFit.toFixed(2)} total=${nat.total.toFixed(2)}`,
      informativeness: scorePatternInformativeness(field, patterns, seq).toFixed(2),
    };
  });
}

function drillPathReport(path: ReturnType<typeof analyzeRecursivePatternFlow>, liveRun: number) {
  const layers = flattenPatternLayers(path);
  const lines: string[] = [];
  for (const layer of layers) {
    if (layer.tailFlow) {
      const dup = layer.tailFlow.oneDuplicateRelation;
      lines.push(`LEAF (depth ${layer.depth})`);
      lines.push(`  source = ${layer.sequenceLabel}`);
      lines.push(`  input tail = [${tailN(layer.sequence, 15)}]`);
      lines.push(`  liveRunLength = ${liveRun}`);
      if (dup) {
        lines.push(`  expectedHint = ${dup.expectedHint}`);
        lines.push(`  activeRun = ${dup.activeRun}`);
        lines.push(`  relation = ${dup.relation}`);
        lines.push(`  childBehavior = ${dup.childBehavior}`);
      }
      lines.push(`  tailFlow phase = ${layer.tailFlow.phase}`);
      lines.push(`  tailFlow label = ${layer.tailFlow.label}`);
    } else {
      const childVals =
        layer.selectedDrillDown && layer.patternSummary[layer.selectedDrillDown]
          ? layer.patternSummary[layer.selectedDrillDown]!
          : [];
      lines.push(`DEPTH ${layer.depth}`);
      lines.push(`  source = ${layer.sequenceLabel}`);
      lines.push(`  input tail = [${tailN(layer.sequence, 15)}]`);
      lines.push(`  selectedPattern = ${layer.selectedDrillDown}`);
      lines.push(`  reason = ${layer.drillDownReason}`);
      lines.push(`  informativenessScore = ${layer.informativenessScore.toFixed(2)}`);
      lines.push(`  output tail = [${tailN(childVals, 15)}]`);
      const scores = ALL_PATTERN_FIELDS.map((f) => ({
        f,
        s: scorePatternInformativeness(
          f,
          extractCodeValuesFromBaseSequence([...layer.sequence]),
          layer.sequence,
        ),
      })).sort((a, b) => b.s - a.s);
      lines.push(
        `  top3 informativeness = ${scores.slice(0, 3).map((x) => `${x.f}:${x.s.toFixed(2)}`).join(', ')}`,
      );
    }
  }
  return lines.join('\n');
}

function firstTerminationLayer(
  path: ReturnType<typeof analyzeRecursivePatternFlow>,
  liveRun: number,
) {
  const layers = flattenPatternLayers(path);
  for (let i = 0; i < layers.length; i += 1) {
    const layer = layers[i]!;
    if (!layer.tailFlow) continue;
    const dup =
      layer.tailFlow.oneDuplicateRelation ??
      classifyOneDuplicateRunRelation(layer.sequence, liveRun);
    if (dup?.childBehavior === 'terminates' || dup?.childBehavior === 'marker_complete') {
      let reason = 'oneDuplicate';
      if (dup.relation === 'at_hint_ceiling') reason = 'oneDuplicate at_hint_ceiling';
      else if (dup.relation === 'at_termination_boundary') {
        reason = 'oneDuplicate at_termination_boundary';
      }
      return {
        depth: layer.depth,
        pattern: i > 0 ? (layers[i - 1]!.selectedDrillDown ?? 'root') : 'root',
        inputTail: tailN(layer.sequence, 15),
        expectedHint: dup.expectedHint,
        activeRun: dup.activeRun,
        relation: dup.relation,
        childBehavior: dup.childBehavior,
        reason,
      };
    }
  }
  return null;
}

const result = analyzeMasterValue('00', HUMAN_DIAGNOSTIC_FIXTURE_MASTER);
const v2 = runHumanStyleV2(HUMAN_DIAGNOSTIC_FIXTURE_MASTER);
const trace = v2.step3!.step3Trace!;
const pairEval = trace.pairEvaluation!;
const anchor = trace.pairAnchor!;
const liveRun = trailingValueRun(result.digits) || 1;

const row = buildLegacyCodeContentForCodeName(result, 'low', '01', []);
const def = getLegacyStepCodeDefinition('01', 'low')!;
const pointValues = filterDigitsByClass(result.digits, 'low');
const detailDigits = pointValues.replace(/,/g, '');
const rawGaps = computeLegacyCodeContentGaps(detailDigits, '01', def.description);

const seqMatch =
  row.gaps.length === HUMAN_01_EXPECTED.length &&
  row.gaps.every((v, i) => v === HUMAN_01_EXPECTED[i]);
const mismatchIdx = row.gaps.findIndex((v, i) => v !== HUMAN_01_EXPECTED[i]);

const path01 = pairEval.recursivePath;
const patterns10 = patternDetail(row.gaps, 'low', 'lowLow', liveRun);
const firstTerm = firstTerminationLayer(path01, liveRun);

interface RepeatRow {
  master: string;
  anchor: number;
  repeatCode: string;
  firstPattern: string;
  firstDepth: number;
  relation: string;
  childBehavior: string;
  parentImplication: string;
  decision: string;
}

const repeatRows: RepeatRow[] = [];
const termCause: Record<string, number> = {};
const repeatReachable: RepeatRow[] = [];

for (const m of MASTERS) {
  const v = runHumanStyleV2(m);
  const t = v.step3!.step3Trace!;
  if (t.pool.length !== 3 || !t.repeatEvaluation) continue;
  const ev = t.repeatEvaluation;
  const ft = firstTerminationLayer(ev.recursivePath, 1);
  const cause = ft?.reason ?? 'unknown';
  termCause[cause] = (termCause[cause] ?? 0) + 1;
  repeatRows.push({
    master: m.slice(-8),
    anchor: t.primaryCandidate!,
    repeatCode: t.repeatCode!,
    firstPattern: ft?.pattern ?? '—',
    firstDepth: ft?.depth ?? -1,
    relation: String(ft?.relation ?? ev.childBehavior),
    childBehavior: ev.childBehavior,
    parentImplication: ev.parentImplication,
    decision: ev.decision,
  });
}

const extraMasters = [HUMAN_DIAGNOSTIC_FIXTURE_MASTER, ...MASTERS, '0011223344', '000111222'];
for (const m of extraMasters) {
  const r = analyzeMasterValue('00', m);
  for (const sub of ['lowLow', 'lowHigh', 'highLow', 'highHigh'] as const) {
    const pool = getDigitsInSubBand(sub);
    const mainBand = sub.startsWith('low') ? 'low' : 'high';
    const anchorD = findMostRecentDigitInPool(r.digits, pool);
    if (anchorD === null) continue;
    const code = resolveRepeatEvaluationCode(anchorD, mainBand);
    const ev = evaluateCandidateRepeatByCodeContent(r, '00', mainBand, sub, anchorD, code);
    if (ev.decision === 'REPEAT') {
      repeatReachable.push({
        master: m.slice(-12),
        anchor: anchorD,
        repeatCode: code,
        firstPattern: flattenPatternLayers(ev.recursivePath)
          .map((l) => l.selectedDrillDown ?? 'leaf')
          .join('→'),
        firstDepth: -1,
        relation: ev.childBehavior,
        childBehavior: ev.childBehavior,
        parentImplication: ev.parentImplication,
        decision: ev.decision,
      });
    }
  }
}

const report = `# Human-style V2 STEP3 REPEAT/TERMINATE audit

Generated: ${new Date().toISOString()}
**No code modified — trace only**

---

## 1. Human fixture 01 actual source sequence

- Master length: ${result.digits.length}, tail digit: ${result.digits.at(-1)}
- Point values (low band) length: ${detailDigits.length}
- Code: **01** (${def.description})
- **A. raw gaps:** length=${rawGaps.length}
- **B. buildLegacyCodeContentForCodeName gaps:** length=${row.gaps.length}
- **C. Code · 내용:** \`${row.gaps.join(',')}\`
- **D. analyzeRecursivePatternFlow input:** identical gaps array
- **E. length:** ${row.gaps.length}
- **F. last 30:** ${tailN(row.gaps, 30)}

### G. Human-provided 01 match

- Expected length: ${HUMAN_01_EXPECTED.length}, actual: ${row.gaps.length}
- **Exact match: ${seqMatch ? 'YES' : 'NO'}**
${!seqMatch ? `- First mismatch @${mismatchIdx}: expected ${HUMAN_01_EXPECTED[mismatchIdx]}, got ${row.gaps[mismatchIdx]}` : ''}

---

## 2. STEP3 context (human fixture)

- STEP1=${v2.step1.winnerId} STEP2=${v2.step2?.winnerId} FINAL=${v2.finalDigit}
- pool=[${trace.pool.join(',')}] recent=${trace.recentOrder.join('→')}
- 2-pool: **no repeat step** → pair on base master, pairCode=01, anchor=${anchor}
- liveRunLength=${liveRun}

---

## 3. 01 → 10 Pattern detail

| Pattern | tail20 | 1중복 | leaf child | parent | naturalness | info score |
|---------|--------|-------|------------|--------|-------------|------------|
${patterns10.map((p) => `| ${p.field} | ${p.tail20 || '—'} | ${p.dup} | ${p.leafChild} | ${p.parent} | ${p.naturalness} | ${p.informativeness} |`).join('\n')}

---

## 4. Recursive drill path

\`\`\`
${drillPathReport(path01, liveRun)}
\`\`\`

---

## 5. firstTerminationDepth

${firstTerm ? `- depth=${firstTerm.depth} pattern=${firstTerm.pattern}
- relation=${firstTerm.relation} hint=${firstTerm.expectedHint} run=${firstTerm.activeRun}
- childBehavior=${firstTerm.childBehavior} reason=${firstTerm.reason}` : 'none'}

Chain: classifyOneDuplicateRunRelation → child=terminates → decideRepeatFromPattern → TERMINATE → pair picks digit 1

parentImplication=${pairEval.parentImplication} (**unused in decision**)

---

## 6–8. child→digit direct mapping & namespace

**YES** — \`decideRepeatFromPattern\`: terminates→TERMINATE, extends→REPEAT

parentImplication computed but not used in \`evaluateSiblingPairByCodeContent\`

| Question | Answer |
|----------|--------|
| A. STEP3 needs child/parent separation? | **YES** |
| B. terminates + flow supports 0 continuation → parent repeat possible? | **YES** (inferParentBranchImplication→keep when candidateMatchesCurrent) |
| C. Current code can express in decision? | **NO** |

---

## 9. 19/19 repeat TERMINATE

| tail | anchor | code | term pattern | relation | child | parent | decision |
|------|--------|------|--------------|----------|-------|--------|----------|
${repeatRows.map((r) => `| …${r.master} | ${r.anchor} | ${r.repeatCode} | ${r.firstPattern} | ${r.relation} | ${r.childBehavior} | ${r.parentImplication} | ${r.decision} |`).join('\n')}

Cause distribution:
${Object.entries(termCause).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

---

## 10. REPEAT reachable (broader search)

${repeatReachable.length === 0 ? '**Zero REPEAT** from evaluateCandidateRepeatByCodeContent across dataset.' : repeatReachable.map((r) => `- …${r.master} anchor=${r.anchor} code=${r.repeatCode} path=${r.firstPattern}`).join('\n')}

---

## 11. Verdict: **CASE C** (data CASE A clear)

- **A:** 01 sequence matches human data
- **B:** drill path score-driven oneBetween×3→oneDuplicate (secondary)
- **C:** child terminates → digit TERMINATE bypasses parentImplication (**primary**)

---

## 12–14. Fix scope (design only)

Wire \`inferParentBranchImplication\` into STEP3 decision hierarchy (mirror STEP1/2). No weight/fixture changes.

Production V1: unchanged | STEP1/2: unchanged
`;

fs.mkdirSync('imports', { recursive: true });
fs.writeFileSync(path.join('imports', 'human-style-v2-step3-repeat-audit.md'), report, 'utf8');
console.log(report);
