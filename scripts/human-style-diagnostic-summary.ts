#!/usr/bin/env node
import { runHumanStyleDiagnostic } from '../src/shared/utils/humanStyleDiagnosticPredictor';

const d = runHumanStyleDiagnostic();
console.log('STEP1 winner:', d.step1.winnerId);
console.log('STEP2 winner:', d.step2?.winnerId);
console.log('STEP3 winner:', d.step3?.winnerId);
console.log('FINAL:', d.finalDigit);
console.log('MATCH:', d.matchesHumanFixture);
console.log('DIVERGE:', d.firstDivergence, d.divergenceReason);
