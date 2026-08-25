import { readFileSync } from 'fs';
import { analyzeMasterValue } from '../src/shared/utils/analysisEngine';
import {
  inferSubBandPhaseFromOneBetween,
  inferPhaseFromSequence,
  inferSubBandPhase,
} from '../src/shared/utils/subBandRepeatJudgment';
import {
  buildPointValueTokens,
  filterPointValuesToSubBand,
  getSidePointValues,
} from '../src/shared/utils/pointValuesCodeFlow';
import { buildLegacyCodeContentForLastDigit } from '../src/shared/utils/legacyDigitCodePick';

const master = readFileSync('scripts/_tmp_master.txt', 'utf8').trim();
const r = analyzeMasterValue('00', master);

console.log('=== 고점 S run — 1사이 ===');
const obMain = inferSubBandPhaseFromOneBetween(r.highRunLengths, 'high', 'highHigh');
console.log(obMain);

console.log('\n=== 고고 S″ (Point Values) — 1사이 ===');
const pv = getSidePointValues(r, '', 'high');
const hh = filterPointValuesToSubBand(pv, 'highHigh');
const sPrime = buildPointValueTokens(hh).map((t) => t.value);
console.log('S″ len', sPrime.length, 'tail', sPrime.slice(-12));
const obHH = inferSubBandPhaseFromOneBetween(sPrime, 'high', 'highHigh');
console.log(obHH);
console.log('inferPhaseFromSequence:', inferPhaseFromSequence(sPrime, 'high', 'highHigh', 8));
console.log('inferSubBandPhase:', inferSubBandPhase(r, '', 'high', 'highHigh'));

console.log('\n=== 코드 89 content — 1사이 ===');
const { row } = buildLegacyCodeContentForLastDigit(r, 'high', 8, []);
console.log('gaps tail', row.gaps.slice(-12));
console.log('inferPhaseFromSequence on code gaps:', inferPhaseFromSequence(row.gaps, 'high', 'highHigh', 8));
