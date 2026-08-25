import { analyzeMasterValue } from '../src/shared/utils/analysisEngine';
import { buildLegacyCodeContentForLastDigit } from '../src/shared/utils/legacyDigitCodePick';
import { inferPhaseFromSequence, inferMainBandPhaseFromSequence } from '../src/shared/utils/subBandRepeatJudgment';
import { inferSubBandPhase } from '../src/shared/utils/subBandRepeatJudgment';
import { resolvePatternRecommendPath } from '../src/shared/utils/patternRecommendEngine';
import { pickDigitWithLegacyCodeOrFlow } from '../src/shared/utils/legacyDigitCodePick';
import { buildRuns, toClassSequence } from '../src/shared/utils/analysisEngine';
import { getDigitSubBand } from '../src/shared/utils/digitSubBand';

const master = process.argv[2]?.replace(/\s/g, '') ?? '';
const result = analyzeMasterValue('00', master);
const runs = buildRuns(toClassSequence(result.digits));
const lastRun = runs[runs.length - 1]!;
const lastDigit = 8;

console.log('마지막 digit:', result.digits.slice(-1), '| 고점 run 길이:', lastRun.length);

const highS = result.highRunLengths;
const mainPhase = inferMainBandPhaseFromSequence(highS, 'high', lastRun.length, lastDigit);
console.log('\n[① 저·고]', mainPhase.label);
console.log('→', mainPhase.phase === 'repeat' ? '고점 유지' : '저점 전환');

const subPhase = inferSubBandPhase(result, '', 'high', 'highHigh');
console.log('\n[② 세분화 고고]', subPhase.label);
console.log('→', subPhase.phase === 'repeat' ? '고고(8~9) 유지' : '고저(5~7) 전환');

const { codeName, row } = buildLegacyCodeContentForLastDigit(result, 'high', lastDigit, []);
console.log('\n[③ 코드]', codeName, 'content gaps (앞 20):', row.gaps.slice(0, 20).join(','), '... total', row.gaps.length);

const seqPhase = inferPhaseFromSequence(row.gaps, 'high', 'highHigh', lastDigit);
console.log('코드 content 1사이/run 판정:', seqPhase.label);
console.log('→', seqPhase.phase === 'repeat' ? `digit ${lastDigit} 유지` : 'pool 내 다른 digit');

const path = resolvePatternRecommendPath(result, '');
const pick = pickDigitWithLegacyCodeOrFlow([8, 9], result, '', 'highHigh', []);
console.log('\n[최종 pick]', pick.digit, pick.mode);
console.log('reason:', pick.reason);

console.log('\n[mainBandReasons]');
path.mainBandReasons.forEach((r) => console.log(' ', r));
console.log('[subBandReasons]');
path.subBandReasons.forEach((r) => console.log(' ', r));
