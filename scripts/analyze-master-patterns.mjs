/**
 * Master → CodeValue 패턴 분석 (일회성 리포트)
 * node scripts/analyze-master-patterns.mjs
 */
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// ts compiled on the fly via vite-node / vitest dynamic import
const {
  analyzeMasterValue,
  buildCodeValueStats,
  toClassSequence,
  buildRuns,
} = await import('../src/shared/utils/analysisEngine.ts');

const SEED_CODES = [
  { code: '01', type: '저점', description: '저점,저점' },
  { code: '02', type: '저점', description: '저점,고점' },
  { code: '03', type: '저점', description: '고점,저점' },
  { code: '04', type: '저점', description: '고점,고점' },
  { code: '05', type: '저점', description: '저점,저점,저점' },
  { code: '06', type: '저점', description: '저점,저점,고점' },
  { code: '07', type: '저점', description: '저점,고점,저점' },
  { code: '08', type: '저점', description: '고점,저점,저점' },
  { code: '09', type: '저점', description: '고점,고점,저점' },
  { code: '10', type: '고점', description: '저점,고점' },
  { code: '12', type: '저점', description: '저점,고점,고점' },
  { code: '13', type: '저점', description: '고점,저점,고점' },
  { code: '14', type: '저점', description: '저점,고점,고점,저점' },
  { code: '15', type: '저점', description: '고점,저점,저점,고점' },
  { code: '20', type: '고점', description: '저점,고점' },
  { code: '23', type: '고점', description: '고점,고점' },
  { code: '24', type: '고점', description: '고점,저점' },
  { code: '25', type: '고점', description: '저점,저점,고점,고점' },
  { code: '30', type: '고점', description: '저점,고점,고점' },
  { code: '32', type: '고점', description: '고점,저점,고점' },
  { code: '34', type: '고점', description: '고점,고점,저점' },
  { code: '35', type: '고점', description: '고점,고점,고점,저점' },
  { code: '40', type: '고점', description: '저점,저점,고점' },
  { code: '42', type: '고점', description: '저점,고점,저점' },
  { code: '43', type: '고점', description: '고점,저점,저점' },
  { code: '45', type: '고점', description: '저점,고점,고점,저점' },
];

const regression = JSON.parse(
  readFileSync(join(root, 'src/shared/fixtures/engine-regression-cases.json'), 'utf8'),
);

const EXTRA = [
  { masterNo: 'CV', masterValue: '001122' },
  { masterNo: 'CV', masterValue: '015605' },
  { masterNo: 'CV', masterValue: '556677' },
  { masterNo: 'CV', masterValue: '00112255' },
  { masterNo: 'CV', masterValue: '112233' },
  { masterNo: 'CV', masterValue: '55566' },
  { masterNo: 'CV', masterValue: '000111222' },
  { masterNo: 'CV', masterValue: '0101' },
  { masterNo: 'CV', masterValue: '123456' },
  { masterNo: 'CV', masterValue: '123456789012' },
  { masterNo: 'CV', masterValue: '1819281938' },
  { masterNo: 'CV', masterValue: '1213141516' },
  { masterNo: 'CV', masterValue: '9876543210' },
  { masterNo: 'CV', masterValue: '1415652273' },
];

const masters = [
  ...regression.map((r) => ({ masterNo: r.input.masterNo, masterValue: r.input.masterValue })),
  ...EXTRA,
];

function getSubBand(d) {
  if (d <= 1) return 'LL';
  if (d <= 4) return 'LH';
  if (d <= 7) return 'HL';
  return 'HH';
}

function bandChar(d) {
  return d <= 4 ? 'L' : 'H';
}

function analyzeTransitions(digits) {
  const afterLow = Array(10).fill(0);
  const afterHigh = Array(10).fill(0);
  const subAfter = {};

  for (let i = 0; i < digits.length - 1; i++) {
    const cur = Number(digits[i]);
    const next = Number(digits[i + 1]);
    if (cur <= 4) afterLow[next]++;
    else afterHigh[next]++;

    const key = `${getSubBand(cur)}->`;
    subAfter[key] = subAfter[key] || Array(10).fill(0);
    subAfter[key][next]++;
  }

  return { afterLow, afterHigh, subAfter };
}

function topDigits(arr, n = 3) {
  return arr
    .map((c, d) => ({ d, c }))
    .filter((x) => x.c > 0)
    .sort((a, b) => b.c - a.c)
    .slice(0, n)
    .map((x) => `${x.d}(${x.c})`)
    .join(', ');
}

function runSummary(digits) {
  const classes = toClassSequence(digits);
  const runs = buildRuns(classes);
  return runs.map((r) => `${r.cls === 'low' ? '저' : '고'}${r.length}`).join('-');
}

console.log('='.repeat(80));
console.log('MASTER → CODEVALUE 패턴 분석 리포트');
console.log('='.repeat(80));

for (const { masterNo, masterValue } of masters) {
  const result = analyzeMasterValue(masterNo, masterValue);
  const stats = buildCodeValueStats(result, SEED_CODES);
  const topCodes = [...stats].filter((s) => s.count > 0).sort((a, b) => b.count - a.count).slice(0, 5);
  const lh = toClassSequence(result.digits).map((c) => (c === 'low' ? 'L' : 'H')).join('');
  const trans = analyzeTransitions(result.digits);

  console.log(`\n[${masterNo}] "${masterValue.replace(/\s+/g, ' ').slice(0, 40)}${masterValue.length > 40 ? '…' : ''}"`);
  console.log(`  digits(${result.totalCount}) low=${result.lowRate}% high=${result.highRate}%`);
  console.log(`  L/H seq: ${lh.slice(0, 60)}${lh.length > 60 ? '…' : ''}`);
  console.log(`  runs: ${runSummary(result.digits)}`);
  console.log(`  low patterns: 3+=${result.lowPatterns.threeOrMore.length} 1dup=${result.lowPatterns.oneDuplicate.length} 2=${result.lowPatterns.exactTwo.length} 1between=${result.lowPatterns.oneBetween.length}`);
  console.log(`  high patterns: 3+=${result.highPatterns.threeOrMore.length} 1dup=${result.highPatterns.oneDuplicate.length}`);
  if (topCodes.length) {
    console.log(`  top codes: ${topCodes.map((c) => `${c.code}(${c.description})×${c.count}`).join(' | ')}`);
  } else {
    console.log('  top codes: (none matched)');
  }
  console.log(`  after L → ${topDigits(trans.afterLow)}`);
  console.log(`  after H → ${topDigits(trans.afterHigh)}`);
}

// Aggregate across all masters
console.log('\n' + '='.repeat(80));
console.log('전체 Master 합산 전환 패턴');
console.log('='.repeat(80));

const aggLow = Array(10).fill(0);
const aggHigh = Array(10).fill(0);
const aggSub = {};
const codeTotals = {};

for (const { masterNo, masterValue } of masters) {
  const result = analyzeMasterValue(masterNo, masterValue);
  const stats = buildCodeValueStats(result, SEED_CODES);
  for (const s of stats) {
    codeTotals[s.code] = (codeTotals[s.code] || 0) + s.count;
  }
  const t = analyzeTransitions(result.digits);
  for (let d = 0; d <= 9; d++) {
    aggLow[d] += t.afterLow[d];
    aggHigh[d] += t.afterHigh[d];
  }
  for (const [k, arr] of Object.entries(t.subAfter)) {
    aggSub[k] = aggSub[k] || Array(10).fill(0);
    for (let d = 0; d <= 9; d++) aggSub[k][d] += arr[d];
  }
}

console.log('\n저점(L) 직후 다음 숫자 TOP:', topDigits(aggLow, 5));
console.log('고점(H) 직후 다음 숫자 TOP:', topDigits(aggHigh, 5));

for (const sub of ['LL', 'LH', 'HL', 'HH']) {
  const key = `${sub}->`;
  if (aggSub[key]) {
    console.log(`${sub} 직후 → ${topDigits(aggSub[key], 5)}`);
  }
}

console.log('\n전체 Master에서 누적 코드 매칭 TOP 10:');
const sortedCodes = Object.entries(codeTotals)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);
for (const [code, count] of sortedCodes) {
  const desc = SEED_CODES.find((c) => c.code === code)?.description ?? '';
  console.log(`  ${code} (${desc}): ${count}회`);
}

// Position cycle (decimal slot 0-3)
console.log('\n자리 슬롯(4-cycle)별 다음 숫자:');
const slotNext = [Array(10).fill(0), Array(10).fill(0), Array(10).fill(0), Array(10).fill(0)];
for (const { masterValue } of masters) {
  const result = analyzeMasterValue('X', masterValue);
  for (let i = 0; i < result.digits.length - 1; i++) {
    const slot = i % 4;
    slotNext[slot][Number(result.digits[i + 1])]++;
  }
}
for (let s = 0; s < 4; s++) {
  console.log(`  slot${s + 1}: ${topDigits(slotNext[s], 5)}`);
}
