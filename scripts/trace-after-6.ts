import { analyzeMasterValue } from '../src/shared/utils/analysisEngine';
import {
  recommendNextDigitStep,
  resolvePatternRecommendPath,
} from '../src/shared/utils/patternRecommendEngine';
import { getMainBandLabel, getSubBandLabel } from '../src/shared/utils/digitSubBand';

const m = process.argv[2] ?? '5566775617';
const r = analyzeMasterValue('00', m);
const step = recommendNextDigitStep(r, '6', 4);
const path = resolvePatternRecommendPath(r, '6');

console.log('Master:', m);
console.log('After prefix 6:');
console.log('  Main:', getMainBandLabel(path.targetMainBand));
console.log('  Sub:', getSubBandLabel(path.targetSubBand));
console.log('  Candidates:', step?.candidates.map((c) => c.digit).join(','));
console.log('  Main reasons:');
path.mainBandReasons.forEach((line) => console.log('   ', line));
