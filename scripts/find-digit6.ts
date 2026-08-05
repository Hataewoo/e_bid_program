import { analyzeMasterValue } from '../src/shared/utils/analysisEngine';
import { predictDigitChain } from '../src/shared/utils/nextDigitEngine';

const tail = '6534097377';

// Try masters ending with tail that recommend 6 as step1
const prefixes = [
  '',
  '0123456789'.repeat(2),
  '0123456789'.repeat(5),
  '6'.repeat(50) + tail,
  '65'.repeat(30) + tail,
  '1234567890'.repeat(4),
];

for (const p of prefixes) {
  const m = p.endsWith(tail) ? p : p + tail;
  const r = analyzeMasterValue('00', m);
  const c = predictDigitChain(r, [], '');
  const top = c.chainSteps[0]?.candidates[0]?.digit;
  console.log(
    `len=${m.length} combo=${c.recommendedCombo} step1=${top} side=${c.chainSteps[0]?.hierarchy.targetMainBand}`,
  );
  if (top === 6) {
    console.log('  reasons:', c.chainSteps[0]?.hierarchy.digitReasons);
    console.log('  main:', c.chainSteps[0]?.hierarchy.mainBandReasons);
  }
}
