import { analyzeMasterValue } from '../src/shared/utils/analysisEngine';
import { recommendDigitChain } from '../src/shared/utils/patternRecommendEngine';

const targets = ['6757', '7576', '6765'];
const samples = [
  '5566778899',
  '5676565656',
  '5566775677',
  '6677567756',
  '6534097377',
  '5616125612',
  '6677667755',
  '5678776655',
  '1234567890',
  '0001112223',
  '7776665554',
  '8899667755',
];

for (const mv of samples) {
  const r = analyzeMasterValue('00', mv);
  for (const start of ['', '6']) {
    const combo = recommendDigitChain(r, [], start).recommendedCombo;
    if (targets.some((t) => combo === t || combo.includes('6757'))) {
      console.log('HIT', mv, 'start=', start || 'empty', 'combo=', combo);
    }
  }
}

// brute short masters ending in highLow
for (let i = 0; i < 200; i++) {
  const mv = String(5676565650 + i).slice(0, 10);
  const r = analyzeMasterValue('00', mv);
  const c = recommendDigitChain(r, [], '').recommendedCombo;
  if (c === '6757') console.log('6757 from', mv);
}

console.log('--- trace 6757 candidates ---');
for (const mv of ['5676565656', '6677567756', '7776665556']) {
  const r = analyzeMasterValue('00', mv);
  console.log(mv, 'empty:', recommendDigitChain(r, [], '').recommendedCombo, 'start6:', recommendDigitChain(r, [], '6').recommendedCombo);
}
