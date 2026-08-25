#!/usr/bin/env node
/**
 * Run human-style hierarchical diagnostic on fixture Master.
 * Usage: npx vite-node --config scripts/vite-node.config.ts scripts/human-style-diagnostic.ts
 */
import {
  formatHumanStyleDiagnosticReport,
  HUMAN_DIAGNOSTIC_FIXTURE_MASTER,
  runHumanStyleDiagnostic,
} from '../src/shared/utils/humanStyleDiagnosticPredictor';

const diag = runHumanStyleDiagnostic(HUMAN_DIAGNOSTIC_FIXTURE_MASTER);
console.log(formatHumanStyleDiagnosticReport(diag));
