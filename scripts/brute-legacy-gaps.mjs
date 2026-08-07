/**
 * Brute-force legacy Code · 내용 gap algorithm against known expected values.
 */
import { readFileSync, writeFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';
import { analyzeMasterValue, filterDigitsByClass } from '../src/shared/utils/analysisEngine.ts';
import {
  buildLegacyCodeContentRow,
  computeLegacyGapSequence,
  descriptionToSubBandSequence,
  findSubBandSequenceStarts,
  filterNonOverlappingMatchStarts,
  buildDigitToTokenIndex,
} from '../src/shared/utils/legacyCodeContentEngine.ts';
import { buildPointValueTokens } from '../src/shared/utils/pointValuesCodeFlow.ts';
import { getDigitSubBand } from '../src/shared/utils/digitSubBand.ts';
import { LEGACY_MASTER_00_CODE_CONTENT } from '../src/shared/fixtures/legacy-code-content-expected.ts';

const dbPath = process.argv[2] ?? 'C:/Users/USER/AppData/Roaming/cs-e-bid-program/database.db';
process.env.DATABASE_URL = `file:${dbPath}`;

const p = new PrismaClient();
const m = await p.master.findFirst({ where: { masterNo: '00' } });
await p.$disconnect();

if (!m?.masterValue) {
  console.error('No Master 00');
  process.exit(1);
}

const result = analyzeMasterValue('00', m.masterValue);
const pv = filterDigitsByClass(result.digits, 'low');
console.log('Master len:', m.masterValue.length, '| Low PV:', pv.length);

function score(expected, actual) {
  const e = expected.split(',');
  const a = actual.split(',').filter(Boolean);
  if (e.length !== a.length) return { lenE: e.length, lenA: a.length, match: 0, pct: 0 };
  let match = 0;
  for (let i = 0; i < e.length; i++) if (e[i] === a[i]) match++;
  return { lenE: e.length, lenA: a.length, match, pct: ((match / e.length) * 100).toFixed(1) };
}

function findTokenSubBandStarts(pointValues, sequence) {
  const tokens = buildPointValueTokens(pointValues);
  const bands = tokens.map((t) => getDigitSubBand(t.sourceDigit));
  const starts = [];
  for (let i = 0; i <= bands.length - sequence.length; i++) {
    let ok = true;
    for (let j = 0; j < sequence.length; j++) {
      if (bands[i + j] !== sequence[j]) {
        ok = false;
        break;
      }
    }
    if (ok) starts.push(i);
  }
  return { starts, tokens: bands.length };
}

function gapsTokenIndex(starts, patternLen) {
  const g = [];
  for (let i = 0; i < starts.length - 1; i++) {
    g.push(Math.max(1, starts[i + 1] - (starts[i] + patternLen - 1)));
  }
  return g;
}

function gapsDigitStartDistance(starts, patternLen) {
  return starts.slice(1).map((s, i) => s - starts[i]);
}

function gapsDigitEndToStart(starts, patternLen) {
  return starts.slice(1).map((s, i) => s - (starts[i] + patternLen));
}

const code = '234';
const expected = LEGACY_MASTER_00_CODE_CONTENT[code];
const desc = '저점,고점,저점';
const subSeq = descriptionToSubBandSequence(desc, 'low');

const current = buildLegacyCodeContentRow(pv, { id: 0, code, type: '', description: desc }, 'low');
console.log('\n=== Current engine ===');
console.log('matches:', current.matchCount, 'gaps:', current.gaps.length);
console.log('head:', current.content.slice(0, 80));
console.log('score:', score(expected, current.content));

const digitRaw = findSubBandSequenceStarts(pv, subSeq);
const digitFiltered = filterNonOverlappingMatchStarts(digitRaw, subSeq.length);

const variants = [
  ['digitRaw/sPrimeTokenDiff', computeLegacyGapSequence(pv, digitRaw, subSeq.length), digitRaw.length],
  ['digitFiltered/sPrimeTokenDiff', computeLegacyGapSequence(pv, digitFiltered, subSeq.length), digitFiltered.length],
  ['digitRaw/tokenIndexDiff', gapsTokenIndex(digitRaw, subSeq.length), digitRaw.length],
  ['digitRaw/startToStart', gapsDigitStartDistance(digitRaw, subSeq.length), digitRaw.length],
  ['digitRaw/endToStart', gapsDigitEndToStart(digitRaw, subSeq.length), digitRaw.length],
];

const tokenStarts = findTokenSubBandStarts(pv, subSeq);
variants.push(
  ['sPrimeTokenRaw/tokenIndexDiff', gapsTokenIndex(tokenStarts.starts, subSeq.length), tokenStarts.starts.length],
  ['sPrimeTokenRaw/sPrimeTokenDiff', computeLegacyGapSequence(pv, tokenStarts.starts, subSeq.length), tokenStarts.starts.length],
);

console.log('\n=== Variants for code 234 ===');
for (const [name, gaps, matchCount] of variants) {
  const content = gaps.join(',');
  const s = score(expected, content);
  console.log(`${name}: matches=${matchCount} gaps=${s.lenA} match=${s.match}/${s.lenE} (${s.pct}%)`);
  if (s.match === s.lenE) console.log('  *** EXACT ***');
}

writeFileSync('scripts/tmp-master-00.txt', m.masterValue);
