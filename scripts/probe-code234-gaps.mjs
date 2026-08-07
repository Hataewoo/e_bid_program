/**
 * Code · 내용 gap parity probe — Master Value 파일로 레거시 기대값과 비교
 * node scripts/probe-code234-gaps.mjs path/to/master00.txt
 */
import { readFileSync } from 'fs';
import { analyzeMasterValue, filterDigitsByClass } from '../src/shared/utils/analysisEngine.ts';
import { buildLegacyCodeContentRow } from '../src/shared/utils/legacyCodeContentEngine.ts';
import { LEGACY_MASTER_00_CODE_CONTENT } from '../src/shared/fixtures/legacy-code-content-expected.ts';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/probe-code234-gaps.mjs <masterValueFile>');
  process.exit(1);
}

const masterValue = readFileSync(file, 'utf8').trim();
const result = analyzeMasterValue('00', masterValue);
const pointValues = filterDigitsByClass(result.digits, 'low');

console.log('Low PV length:', pointValues.length);

for (const [code, expected] of Object.entries(LEGACY_MASTER_00_CODE_CONTENT)) {
  const row = buildLegacyCodeContentRow(
    pointValues,
    { id: 0, code, type: '', description: '' },
    'low',
  );
  const actual = row.content;
  const eLen = expected.split(',').length;
  const aLen = actual ? actual.split(',').length : 0;
  const match = expected === actual;
  console.log(`Code ${code}: ${match ? 'EXACT' : 'DIFF'} len ${eLen}/${aLen} matches=${row.matchCount}`);
  if (!match) {
    console.log('  expected:', expected.slice(0, 100), '...');
    console.log('  actual:  ', actual.slice(0, 100), '...');
  }
}
