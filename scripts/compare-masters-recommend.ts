import { analyzeMasterValue } from '../src/shared/utils/analysisEngine';
import { recommendDigitChain } from '../src/shared/utils/patternRecommendEngine';
import { getSubBandLabel } from '../src/shared/utils/digitSubBand';
import { buildSubBandPointValueCounts } from '../src/shared/utils/pointValuesCodeFlow';

/** Compare recommendations across master digit strings */
const samples: Array<{ no: string; digits: string }> = [
  { no: 'A', digits: '5566775617' },
  { no: 'B', digits: '5566778899' },
  { no: 'C', digits: '5566770507' },
  { no: 'D', digits: '0123401234' },
  { no: 'E', digits: '9090909090' },
  { no: 'F', digits: '1357913579' },
  { no: 'G', digits: '2468024680' },
  { no: 'H', digits: '8888888888' },
  { no: 'I', digits: '0011223344' },
  { no: 'J', digits: '5678987656' },
];

console.log('=== First digit (empty input) ===\n');
for (const { no, digits } of samples) {
  const r = analyzeMasterValue('00', digits);
  const chain = recommendDigitChain(r, [], '', { chainDepth: 4 });
  const report = buildSubBandPointValueCounts(r, '');
  const subs = chain.chainSteps.map((s) => s.hierarchy.targetSubBand);
  const labels = subs.map((s) => getSubBandLabel(s));
  console.log(
    `${no} len=${digits.length} digits=${digits.slice(0, 12)}… combo=${chain.recommendedCombo || '-'} subs=[${labels.join(' → ')}] low=${report.lowComparison.selected} high=${report.highComparison.selected}`,
  );
}

console.log('\n=== After input "6" ===\n');
for (const { no, digits } of samples.slice(0, 5)) {
  const r = analyzeMasterValue('00', digits);
  const chain = recommendDigitChain(r, [], '6', { chainDepth: 4 });
  const subs = chain.chainSteps.map((s) => getSubBandLabel(s.hierarchy.targetSubBand));
  console.log(`${no} combo=${chain.recommendedCombo} subs=[${subs.join(' → ')}]`);
}
