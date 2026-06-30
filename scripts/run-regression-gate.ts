#!/usr/bin/env node
/**
 * CI gate: built-in analysis-engine regression must pass at ≥95%.
 *
 * Usage:
 *   npm run regression:gate
 */
import {
  evaluateRegressionGate,
  formatRegressionGateMessage,
  REGRESSION_GATE_MIN_PASS_RATE,
} from '@/shared/utils/regressionGate';

function main(): number {
  const result = evaluateRegressionGate();
  console.log(formatRegressionGateMessage(result));

  if (!result.ok) {
    const failures = result.summary.results.filter((row) => !row.passed);
    console.error(`\n${failures.length} failure(s) — threshold ${REGRESSION_GATE_MIN_PASS_RATE}% not met:`);
    for (const row of failures.slice(0, 15)) {
      console.error(`  - ${row.name} [${row.field}]`);
      console.error(`    expected: ${row.expected}`);
      console.error(`    actual:   ${row.actual}`);
    }
    if (failures.length > 15) {
      console.error(`  ... and ${failures.length - 15} more`);
    }
    return 2;
  }

  return 0;
}

const code = main();
process.exitCode = code;
