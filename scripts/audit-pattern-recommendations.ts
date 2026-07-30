/**
 * Pattern recommendation audit — run: npx tsx scripts/audit-pattern-recommendations.ts
 */
import { SEED_CODES } from '../electron/database/seed/code-seed';
import { analyzeMasterValue, buildCodeValueStats, type CodeMatchInput } from '../src/shared/utils/analysisEngine';
import {
  formatCodeProfileTargetLabel,
  predictDigitChain,
  predictNextDigitStep,
} from '../src/shared/utils/nextDigitEngine';
import { predictFromCodePatternProfile } from '../src/shared/utils/codePatternPrediction';

const codes: CodeMatchInput[] = SEED_CODES.map((c, i) => ({
  id: i + 1,
  code: c.code,
  type: c.type,
  description: c.description,
}));

function band(d: number): 'low' | 'high' {
  return d <= 4 ? 'low' : 'high';
}

interface AuditRow {
  master: string;
  prefix: string;
  rec: number | null;
  targetBand: string;
  reason: string;
  pattern: string;
  matches: number;
  allCandidates: number[];
  ok: boolean;
  note: string;
}

function auditStep(masterValue: string, prefix: string, expectedBand?: 'low' | 'high'): AuditRow {
  const result = analyzeMasterValue('00', masterValue);
  const stats = buildCodeValueStats(result, codes);
  const step = predictNextDigitStep(result, stats, prefix);
  const profile = step?.codeProfile;

  const rec = step?.candidates[0]?.digit ?? null;
  const targetBand = profile?.targetBand ?? '?';
  const reason = profile?.bandDecision.reason ?? '?';
  const pattern = profile?.profile.patternMatch?.description ?? profile?.profile.topDescription ?? '?';
  const matches = step?.totalMatches ?? 0;
  const allCandidates = step?.candidates.map((c) => c.digit) ?? [];

  let ok = rec !== null;
  let note = '';

  if (rec !== null && expectedBand) {
    const inBand = band(rec) === expectedBand;
    ok = ok && inBand;
    if (!inBand) note = `expected ${expectedBand}, got ${band(rec)}`;
  }

  return { master: masterValue, prefix, rec, targetBand, reason, pattern, matches, allCandidates, ok, note };
}

function printTable(rows: AuditRow[], title: string) {
  console.log(`\n=== ${title} ===`);
  for (const r of rows) {
    const status = r.ok ? 'OK' : 'FAIL';
    console.log(
      `[${status}] master=${r.master.slice(0, 20)}${r.master.length > 20 ? '…' : ''} prefix="${r.prefix || '(empty)'}" → ${r.rec} (${r.targetBand}, ${r.reason}) pattern=${r.pattern} matches=${r.matches}${r.note ? ` NOTE:${r.note}` : ''}`,
    );
  }
}

function auditPrefixProgression(masterValue: string, startDigits: string, steps: number) {
  const rows: AuditRow[] = [];
  let prefix = startDigits;
  const seen = new Set<number>();

  for (let i = 0; i < steps; i++) {
    const row = auditStep(masterValue, prefix);
    rows.push(row);
    if (row.rec !== null) seen.add(row.rec);
    if (row.rec === null) break;
    prefix += String(row.rec);
  }

  const uniqueRecs = seen.size;
  const allOk = rows.every((r) => r.ok);
  const varies = uniqueRecs > 1 || rows.length <= 1;

  console.log(`\n--- Prefix progression on "${masterValue}" from "${startDigits}" ---`);
  printTable(rows, 'Steps');
  console.log(`  Unique recommendations: ${uniqueRecs}/${rows.length}, varies=${varies}, allOk=${allOk}`);
  return { rows, uniqueRecs, varies, allOk };
}

// ── Scenario 1: Alternating master (저점,고점) ──
console.log('\n######## SCENARIO 1: Alternating master 1819281938 (저점,고점) ########');
const altRows: AuditRow[] = [];
altRows.push(auditStep('1819281938', '', 'low')); // master ends with 8 (high) → expect low
altRows.push(auditStep('1819281938', '1', 'high')); // after low → high
altRows.push(auditStep('1819281938', '18', 'low')); // after high → low
altRows.push(auditStep('1819281938', '181', 'high'));
altRows.push(auditStep('1819281938', '1819', 'low'));
printTable(altRows, 'Alternating pattern band checks');

// ── Scenario 2: Block low master (저점,저점) ──
console.log('\n######## SCENARIO 2: Block low 0011223344 (저점,저점) ########');
const blockRows: AuditRow[] = [];
blockRows.push(auditStep('0011223344', '', 'low'));
blockRows.push(auditStep('0011223344', '0', 'low'));
blockRows.push(auditStep('0011223344', '00', 'low'));
blockRows.push(auditStep('0011223344', '001', 'low'));
printTable(blockRows, 'Block low pattern');

// ── Scenario 3: Block high master (고점,고점) ──
console.log('\n######## SCENARIO 3: Block high 5566778899 (고점,고점) ########');
const highRows: AuditRow[] = [];
highRows.push(auditStep('5566778899', '', 'high'));
highRows.push(auditStep('5566778899', '5', 'high'));
highRows.push(auditStep('5566778899', '55', 'high'));
printTable(highRows, 'Block high pattern');

// ── Scenario 4: Prefix progression — recommendations should change ──
console.log('\n######## SCENARIO 4: Chain variation ########');
const p1 = auditPrefixProgression('1819281938', '', 6);
const p2 = auditPrefixProgression('0011223344', '', 6);
const p3 = auditPrefixProgression('5050505050', '', 6);

// ── Scenario 5: Not stuck on 4 or input-1 ──
console.log('\n######## SCENARIO 5: Anti-bias check (not always 4 or input-1) ########');
const biasMasters = ['1819281938', '0011223344', '5566778899', '0123456789', '9876543210'];
const biasPrefixes = ['', '1', '2', '3', '5', '8'];
let stuckOn4 = 0;
let stuckOnInputMinus1 = 0;
let total = 0;

for (const m of biasMasters) {
  for (const p of biasPrefixes) {
    const row = auditStep(m, p);
    if (row.rec === null) continue;
    total++;
    if (row.rec === 4) stuckOn4++;
    const last = p.length > 0 ? Number(p[p.length - 1]) : Number(m[m.length - 1]);
    if (Number.isInteger(last) && row.rec === last - 1) stuckOnInputMinus1++;
  }
}
console.log(`  Total checks: ${total}`);
console.log(`  Always digit 4: ${stuckOn4}/${total} (${Math.round((stuckOn4 / total) * 100)}%)`);
console.log(`  Always input-1: ${stuckOnInputMinus1}/${total} (${Math.round((stuckOnInputMinus1 / total) * 100)}%)`);

// ── Scenario 6: Manual prefix typing simulation ──
console.log('\n######## SCENARIO 6: User typing simulation ########');
const typingMasters = [
  { name: 'alternating', value: '1819281938' },
  { name: 'block-low', value: '0011223344' },
  { name: 'mixed', value: '0123456789' },
];

for (const { name, value } of typingMasters) {
  const result = analyzeMasterValue('00', value);
  const stats = buildCodeValueStats(result, codes);
  console.log(`\n  [${name}] master=${value}`);
  for (const userInput of ['', '1', '12', '123', '3', '38']) {
    const step = predictNextDigitStep(result, stats, userInput);
    const label = step?.codeProfile ? formatCodeProfileTargetLabel(step.codeProfile) : null;
    const rec = step?.candidates[0]?.digit ?? '-';
    console.log(`    input="${userInput || '(empty)'}" → ${rec} | ${label ?? 'no profile'}`);
  }
}

// ── Scenario 7: Exact prefix match in master ──
console.log('\n######## SCENARIO 7: Exact prefix transitions ########');
{
  const master = '1819281938';
  const result = analyzeMasterValue('00', master);
  const stats = buildCodeValueStats(result, codes);
  for (const prefix of ['18', '181', '1819', '819']) {
    const pred = predictFromCodePatternProfile(result, stats, prefix, Number(prefix.slice(-1)));
    const top = pred.rankedDigits[0];
    const actualNextInMaster: number[] = [];
    for (let i = 0; i <= master.length - prefix.length - 1; i++) {
      if (master.slice(i, i + prefix.length) === prefix) {
        actualNextInMaster.push(Number(master[i + prefix.length]));
      }
    }
    console.log(
      `  prefix="${prefix}" → rec=${top?.digit} (band=${pred.targetBand}) master-next=[${actualNextInMaster.join(',')}] matches=${pred.contextMatches}`,
    );
  }
}

// ── Summary ──
console.log('\n######## SUMMARY ########');
const allScenarioRows = [...altRows, ...blockRows, ...highRows];
const bandOk = allScenarioRows.filter((r) => r.ok).length;
const bandTotal = allScenarioRows.length;
console.log(`Band correctness: ${bandOk}/${bandTotal}`);
console.log(`Chain varies (alt): ${p1.varies}, (block): ${p2.varies}, (5050): ${p3.varies}`);
console.log(`Bias — digit 4 rate: ${Math.round((stuckOn4 / total) * 100)}%, input-1 rate: ${Math.round((stuckOnInputMinus1 / total) * 100)}%`);

const overallPass =
  bandOk === bandTotal &&
  p1.varies &&
  stuckOn4 / total < 0.5 &&
  stuckOnInputMinus1 / total < 0.5;

console.log(`\nOVERALL: ${overallPass ? 'PASS — recommendations follow patterns' : 'ISSUES FOUND — see details above'}`);
process.exit(overallPass ? 0 : 1);
