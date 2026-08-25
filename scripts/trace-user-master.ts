import { analyzeMasterValue, buildRuns, toClassSequence } from '../src/shared/utils/analysisEngine';
import { inferMainBandPhaseFromSequence } from '../src/shared/utils/subBandRepeatJudgment';
import { recommendNextDigitStep } from '../src/shared/utils/patternRecommendEngine';
import { predictDigitChain } from '../src/shared/utils/nextDigitEngine';

const master = process.argv[2]?.replace(/\s/g, '') ?? '';
if (!master) {
  console.error('Usage: npx tsx scripts/trace-user-master.ts <digits>');
  process.exit(1);
}

const result = analyzeMasterValue('00', master);
const runs = buildRuns(toClassSequence(result.digits));
const lastRun = runs[runs.length - 1]!;

console.log('=== 기본 ===');
console.log('자릿수:', result.digits.length);
console.log('꼬리 20:', result.digits.slice(-20));
console.log('마지막 digit:', result.digits.slice(-1), '| 꼬리 run:', lastRun.cls, '길이', lastRun.length);
console.log(
  `Low ${result.lowCount} (${result.lowRate.toFixed(1)}%) | High ${result.highCount} (${result.highRate.toFixed(1)}%)`,
);

const side = lastRun.cls;
const sSeq = side === 'low' ? result.lowRunLengths : result.highRunLengths;
const lastDigit = Number(result.digits.slice(-1));
const mainPhase = inferMainBandPhaseFromSequence(sSeq, side, lastRun.length, lastDigit);

console.log('\n=== ① 저·고 (S run 가중) ===');
console.log(mainPhase.label);
console.log(
  '판정:',
  mainPhase.phase === 'repeat'
    ? `유지 → ${side === 'low' ? '저점(0~4)' : '고점(5~9)'}`
    : `전환 → ${side === 'low' ? '고점(5~9)' : '저점(0~4)'}`,
);

const step = recommendNextDigitStep(result, [], '', 4);
console.log('\n=== 다음 1자리 TOP ===');
const top = step?.candidates[0];
if (top) {
  console.log('digit:', top.digit);
  console.log('mode:', top.pickMode);
  console.log('reason:', top.pickReason);
}
if (step) {
  console.log('mainBand:', step.hierarchy.mainBandLabel);
  console.log('subBand:', step.hierarchy.subBandLabel);
  console.log('pool:', step.hierarchy.allowedDigits.join(', '));
}

const chain = predictDigitChain(result, [], '');
console.log('\n=== 4자리 chain ===', chain.recommendedCombo);
for (let i = 0; i < chain.chainSteps.length; i += 1) {
  const s = chain.chainSteps[i]!;
  const c = s.candidates[0];
  console.log(
    `${i + 1}. digit ${c?.digit} (${c?.pickMode}) | ${s.hierarchy.mainBandLabel} · ${s.hierarchy.subBandLabel}`,
  );
}
