import { analyzeMasterValue } from '../src/shared/utils/analysisEngine';
import {
  pickTopRecommendCandidates,
  recommendNextDigitStep,
  resolveFinalDigitPick,
  resolvePatternRecommendPath,
} from '../src/shared/utils/patternRecommendEngine';
import { getMainBandLabel, getSubBandLabel } from '../src/shared/utils/digitSubBand';

const masterValue = process.argv[2] ?? '5566778899';
const prefix = process.argv[3] ?? '6';

const result = analyzeMasterValue('00', masterValue);
const path = resolvePatternRecommendPath(result, prefix);
const pick = resolveFinalDigitPick(path, result, prefix);
const step = recommendNextDigitStep(result, prefix, 4);
const candidates = pickTopRecommendCandidates(path, 4, prefix, result.digits, result);

console.log('Master:', masterValue);
console.log('입력 prefix (첫 자리):', prefix);
console.log('Master+prefix:', result.digits + prefix);
console.log('');
console.log('=== ① 저·고 (S run + Code/Values) ===');
for (const r of path.mainBandReasons) console.log(' ', r);
console.log('→', getMainBandLabel(path.targetMainBand));
console.log('');
console.log('=== ② 세분화 (Side Point Values S″) ===');
for (const r of path.subBandReasons) console.log(' ', r);
console.log('→', getSubBandLabel(path.targetSubBand), `pool: [${path.candidatePool.join(', ')}]`);
console.log('');
console.log('=== ③ digit (S″ 반복·전환 + patternScore) ===');
for (const r of path.digitReasons.slice(-8)) console.log(' ', r);
console.log('');
console.log('patternScore:', Object.entries(path.digitScores)
  .sort((a, b) => b[1] - a[1])
  .map(([d, s]) => `${d}:${s.toFixed(2)}`)
  .join(', '));
console.log('');
console.log('최종 추천:', pick.digit, `(${pick.mode})`);
console.log('근거:', pick.reason);
console.log('');
console.log('후보:', candidates.map((c) => `${c.digit}[${c.pickMode}]`).join(', '));
