/**
 * 레거시 Code · 내용 gap 규칙 역추적 (일회성)
 * node scripts/reverse-legacy-code-gaps.mjs [masterValueFile]
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const {
  analyzeMasterValue,
  filterDigitsByClass,
} = await import('../src/shared/utils/analysisEngine.ts');

const {
  buildPointValueTokens,
  buildPointValuesSequence,
} = await import('../src/shared/utils/pointValuesCodeFlow.ts');

const {
  descriptionToSubBandSequence,
  findSubBandSequenceStarts,
  findDigitPatternStarts,
  buildDigitToTokenIndex,
} = await import('../src/shared/utils/legacyCodeContentEngine.ts');

const LEGACY_EXPECTED = {
  '234': '1,1,1,2,1,1,1,2,1,2,1,2,2,1,1,1,1,1,5,1,1,1,1,1,3,1,1,3,1,1,1,1,1,1,2,1,3,1,2,2,2,1,1,1,2,2,2,2,3,2,4,2,1,1,1,3,1,1',
  '24': '1,1,1,2,1,1,1,2,1,2,1,2,2,1,1,3,5,1,1,1,1,1,3,2,3,1,1,1,1,1,1,2,1,3,1,2,2,2,3,4,4,3,2,4,2,1,1,1,3,1,1',
  '01': '1,2,1,2,2,1,1,2,1,1,5,1,2,1,2,4,5,2,3,4,1,9,1,1,1,2,1,1,1,2,2,4,2,1,2,3,2,1,1,3,1,2,1,2,2,1,2,1,1,4',
  '34': '1,1,2,1,1,2,1,1,2,2,2,2,3,1,2,1,2,1,1,1,1,1,1,1,2,2,4,2,1,3,1,1,1,1,1,1,1,3,1,3,5,1,2,1,1,1,1,2,4,1,1',
};

const SEED = {
  '234': { description: '저점,고점,저점' },
  '24': { description: '고점,저점' },
  '01': { description: '저점,저점' },
  '34': { description: '고점,고점,저점' },
  '42': { description: '저점,고점,저점' },
};

function buildDigitToSIndex(pointValues, lowRunLengths) {
  // Map each digit in pointValues to index in lowRunLengths (S)
  // S is built from primary low runs in FULL master - for STEP2 we need
  // mapping via run structure on filtered stream using sub-band runs?
  const sPrime = buildPointValuesSequence(pointValues);
  return buildDigitToTokenIndex(pointValues);
}

function gapVariants(pointValues, starts, patternLen, sSequence) {
  const digitToToken = buildDigitToTokenIndex(pointValues);
  const variants = {};

  // A: token S′ diff (current)
  variants.sPrimeTokenDiff = [];
  for (let i = 0; i < starts.length - 1; i++) {
    const end = starts[i] + patternLen - 1;
    const next = starts[i + 1];
    const g = digitToToken[next] - digitToToken[end];
    variants.sPrimeTokenDiff.push(Math.max(1, g));
  }

  // B: start-to-start digit distance
  variants.startToStart = [];
  for (let i = 0; i < starts.length - 1; i++) {
    variants.startToStart.push(starts[i + 1] - starts[i]);
  }

  // C: end-to-start digit distance
  variants.endToStart = [];
  for (let i = 0; i < starts.length - 1; i++) {
    variants.endToStart.push(starts[i + 1] - (starts[i] + patternLen));
  }

  // D: count S′ tokens strictly between (exclusive)
  variants.sPrimeBetween = [];
  for (let i = 0; i < starts.length - 1; i++) {
    const from = digitToToken[starts[i] + patternLen - 1] + 1;
    const to = digitToToken[starts[i + 1]] - 1;
    variants.sPrimeBetween.push(Math.max(1, to - from + 1));
  }

  // E: S main sequence index diff
  if (sSequence?.length) {
    variants.sMainDiff = [];
    for (let i = 0; i < starts.length - 1; i++) {
      const end = starts[i] + patternLen - 1;
      const next = starts[i + 1];
      const g = digitToToken[next] - digitToToken[end];
      variants.sMainDiff.push(Math.max(1, g));
    }
  }

  return variants;
}

function scoreMatch(expected, computed) {
  const e = expected.split(',').map(Number);
  const c = computed;
  if (e.length !== c.length) return { match: 0, lenE: e.length, lenC: c.length };
  let match = 0;
  for (let i = 0; i < e.length; i++) if (e[i] === c[i]) match++;
  return { match, lenE: e.length, lenC: c.length, pct: ((match / e.length) * 100).toFixed(1) };
}

const masterValue =
  process.argv[2] ??
  readFileSync(join(root, 'scripts', 'sample-master-00.txt'), 'utf8').trim().catch?.() ??
  null;

if (!masterValue) {
  console.log('Usage: provide master value file or scripts/sample-master-00.txt');
  process.exit(1);
}

const result = analyzeMasterValue('00', masterValue);
const pointValues = filterDigitsByClass(result.digits, 'low');

console.log('Master digits:', result.totalCount, '| Low PV:', pointValues.length);
console.log('S (lowRunLengths) head:', result.lowRunLengths.slice(0, 20).join(','));

for (const [code, meta] of Object.entries(SEED)) {
  const expected = LEGACY_EXPECTED[code];
  if (!expected) continue;

  const subSeq = descriptionToSubBandSequence(meta.description, 'low');
  const subStarts = subSeq ? findSubBandSequenceStarts(pointValues, subSeq) : [];
  const digitStarts = findDigitPatternStarts(pointValues, code);

  console.log(`\n=== Code ${code} ===`);
  console.log('sub-band starts:', subStarts.length, '| digit starts:', digitStarts.length);

  for (const [kind, starts, len] of [
    ['subBand', subStarts, subSeq?.length ?? 0],
    ['digit', digitStarts, code.length],
  ]) {
    if (starts.length < 2) continue;
    const variants = gapVariants(pointValues, starts, len, result.lowRunLengths);
    for (const [name, gaps] of Object.entries(variants)) {
      const s = scoreMatch(expected, gaps);
      if (s.lenC > 0) {
        console.log(`  ${kind}/${name}: len ${s.lenC} match ${s.match}/${s.lenE} (${s.pct ?? '?'})`);
        if (s.match === s.lenE) console.log('  *** EXACT MATCH ***');
      }
    }
  }
}
