import { analyzeMasterValue, buildRuns, toClassSequence } from '../src/shared/utils/analysisEngine';
import { resolvePatternRecommendationPath } from '../src/shared/utils/codeValueFlowEngine';
import { predictDigitChain } from '../src/shared/utils/nextDigitEngine';

const tail = process.argv[2] ?? '6534097377';
const master = process.argv[3] ?? tail;

const result = analyzeMasterValue('00', master);

console.log('=== Master tail:', tail);
console.log('full digits length:', result.digits.length);
console.log('last 10:', result.digits.slice(-10));
console.log('lowRunLengths S:', result.lowRunLengths);
console.log('highRunLengths S:', result.highRunLengths);
console.log(
  'L/H runs:',
  buildRuns(toClassSequence(result.digits))
    .map((r) => `${r.cls}:${r.length}`)
    .join(' | '),
);

const mainPath = resolvePatternRecommendationPath(result, '', 'main-band');
console.log('\n=== 1st digit (main-band) ===');
console.log('activeSide:', mainPath.activeSide);
console.log('targetMainBand:', mainPath.targetMainBand);
console.log('mainBandReasons:');
for (const r of mainPath.mainBandReasons) console.log('  -', r);
console.log('subBandReasons:');
for (const r of mainPath.subBandReasons) console.log('  -', r);
console.log('digitReasons:');
for (const r of mainPath.digitReasons) console.log('  -', r);
const sorted = Object.entries(mainPath.digitScores).sort((a, b) => b[1] - a[1]);
console.log(
  'scores in main pool:',
  sorted.map(([d, s]) => `${d}:${s.toFixed(2)}`).join(', '),
);

const chain = predictDigitChain(result, [], '');
console.log('\n=== 4-digit combo:', chain.recommendedCombo);
for (let i = 0; i < chain.chainSteps.length; i += 1) {
  const s = chain.chainSteps[i]!;
  console.log(
    `step ${i + 1} [${s.stage}] prefix="${s.prefix}" top=${s.candidates[0]?.digit} (${s.candidates[0]?.probability}%)`,
  );
  console.log('  allowed:', s.hierarchy.allowedDigits.join(' '));
  console.log('  digitReasons:', s.hierarchy.digitReasons.join(' | ') || '(none)');
}

// Explain last-10 digit classes
console.log('\n=== Last 10 digit L/H ===');
const last10 = result.digits.slice(-10);
for (let i = 0; i < last10.length; i += 1) {
  const ch = last10[i]!;
  const n = Number(ch);
  const cls = n <= 4 ? 'L' : 'H';
  console.log(`  ${i + 1}. ${ch} (${cls})`);
}
