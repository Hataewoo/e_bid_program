import { analyzeMasterValue } from '../src/shared/utils/analysisEngine';
import {
  recommendDigitChain,
  resolveFinalDigitPick,
  resolvePatternRecommendPath,
} from '../src/shared/utils/patternRecommendEngine';

const masterValue = process.argv[2] ?? '5566778899';
const startInput = process.argv[3] ?? '';

const result = analyzeMasterValue('00', masterValue);
const chain = recommendDigitChain(result, [], startInput);

console.log('Master:', masterValue);
console.log('시작 입력:', startInput || '(빈값)');
console.log('4자리 combo:', chain.recommendedCombo);
console.log('전체 chain:', chain.suggestedChain.slice(result.digits.length - 0) || chain.suggestedChain);
console.log('');

let working = startInput;
for (let i = 0; i < chain.chainSteps.length; i += 1) {
  const step = chain.chainSteps[i]!;
  const path = resolvePatternRecommendPath(result, step.prefix);
  const pick = resolveFinalDigitPick(path, result, step.prefix);
  const chainPick = step.candidates[0];

  console.log(`--- ${i + 1}번째 자리 ---`);
  console.log('  prefix:', step.prefix || '(시작)');
  console.log('  가상 Master 꼬리:', (result.digits + step.prefix).slice(-12));
  console.log('  ①', path.targetMainBand, step.hierarchy.mainBandReasons.slice(0, 2).join(' | '));
  console.log('  ②', path.targetSubBand, path.subBandReasons.filter((r) => r.startsWith('②') || r.includes('세부')).join(' | '));
  console.log('  pool:', path.candidatePool.join(','));
  console.log('  ③ resolveFinalDigitPick:', pick.digit, pick.mode);
  console.log('  ③ reason:', pick.reason);
  console.log('  chain 실제 선택(pickChainStepDigit):', chainPick?.digit);
  console.log('  후보:', step.candidates.map((c) => `${c.digit}[${c.pickMode}]`).join(', '));
  console.log('');
  working += String(chainPick?.digit ?? '');
}

console.log('최종 working prefix:', working);
