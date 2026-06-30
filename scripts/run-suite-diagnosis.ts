#!/usr/bin/env node
/**
 * Run built-in regression + Verification DB suite and write diagnosis report.
 *
 * Usage:
 *   npm run catalog:diagnose
 *   npm run catalog:diagnose -- --import src/shared/fixtures/engine-regression-cases.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import {
  applyVerificationImportPlan,
  parseVerificationImportFile,
  planVerificationImport,
} from '@/shared/utils/verificationImport';
import { runBuiltInRegressionSuite } from '@/shared/utils/regressionSuite';
import { runFullVerificationSuite } from '@/shared/utils/verificationSuite';
import {
  buildSuiteDiagnosisReport,
  formatSuiteDiagnosisMarkdown,
  mergeSuiteSummaries,
} from '@/shared/utils/suiteDiagnostics';
import { formatCodeValueDiagnosisMarkdown } from '@/shared/utils/codeValueVerification';
import { formatPredictionDiagnosisMarkdown } from '@/shared/utils/predictionVerification';
import {
  getCodeValueVerificationSummary,
  getPredictionVerificationSummary,
} from '@/shared/utils/algorithmVerificationStatus';
import type { Code, Experiment, Verification } from '@/types/electron';

const DEV_DB = path.join(process.cwd(), 'prisma', 'dev.db');
const REPORT_JSON = path.join(process.cwd(), 'imports', 'suite-failure-report.json');
const REPORT_MD = path.join(process.cwd(), 'imports', 'suite-failure-report.md');
const CV_REPORT_MD = path.join(process.cwd(), 'imports', 'codevalue-verification-report.md');
const PRED_REPORT_MD = path.join(process.cwd(), 'imports', 'prediction-verification-report.md');

function mapVerification(row: {
  id: number;
  experimentId: number | null;
  hypothesisId: number | null;
  name: string;
  inputData: string;
  expectedResult: string;
  actualResult: string | null;
  passed: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}): Verification {
  return {
    id: row.id,
    experimentId: row.experimentId,
    hypothesisId: row.hypothesisId,
    name: row.name,
    inputData: row.inputData,
    expectedResult: row.expectedResult,
    actualResult: row.actualResult,
    passed: row.passed,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapExperiment(row: {
  id: number;
  name: string;
  date: Date;
  version: string;
  description: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  inputs: Array<{ id: number; experimentId: number; fieldKey: string; fieldValue: string }>;
  outputs: Array<{
    id: number;
    experimentId: number;
    source: string;
    fieldKey: string;
    fieldValue: string;
    memo: string | null;
  }>;
}): Experiment {
  return {
    id: row.id,
    name: row.name,
    date: row.date.toISOString(),
    version: row.version,
    description: row.description,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    inputs: row.inputs.map((input) => ({
      id: input.id,
      experimentId: input.experimentId,
      fieldKey: input.fieldKey,
      fieldValue: input.fieldValue,
    })),
    outputs: row.outputs.map((output) => ({
      id: output.id,
      experimentId: output.experimentId,
      source: output.source,
      fieldKey: output.fieldKey,
      fieldValue: output.fieldValue,
      memo: output.memo,
    })),
  };
}

function mapCode(row: {
  id: number;
  code: string;
  type: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}): Code {
  return {
    id: row.id,
    code: row.code,
    type: row.type,
    description: row.description,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const importIdx = args.indexOf('--import');
  const importPath = importIdx >= 0 ? args[importIdx + 1] : undefined;

  if (!fs.existsSync(DEV_DB)) {
    console.error(`Database not found: ${DEV_DB}`);
    return 1;
  }

  process.env.DATABASE_URL = `file:${DEV_DB.replace(/\\/g, '/')}`;
  const prisma = new PrismaClient();

  try {
    if (importPath) {
      const resolved = path.resolve(importPath);
      const content = fs.readFileSync(resolved, 'utf8');
      const incoming = parseVerificationImportFile(content, resolved);
      const existing = (await prisma.verification.findMany()).map(mapVerification);
      const plan = planVerificationImport(existing, incoming, 'update');
      if (plan.errors.length > 0) {
        console.error('Import errors:', plan.errors.join('; '));
        return 1;
      }
      await applyVerificationImportPlan(plan, async (input) => {
        const data = {
          experimentId: input.experimentId ?? null,
          hypothesisId: null,
          name: input.name,
          inputData: input.inputData ?? '{}',
          expectedResult: input.expectedResult,
          actualResult: null,
          passed: null,
        };
        if (input.id) {
          await prisma.verification.update({ where: { id: input.id }, data });
        } else {
          await prisma.verification.create({ data });
        }
      });
      console.log(`Imported ${incoming.length} case(s) from ${resolved}`);
    }

    const [verificationRows, experimentRows, codeRows] = await Promise.all([
      prisma.verification.findMany({ orderBy: { id: 'asc' } }),
      prisma.experiment.findMany({ include: { inputs: true, outputs: true } }),
      prisma.code.findMany(),
    ]);

    const verifications = verificationRows.map(mapVerification);
    const experiments = experimentRows.map(mapExperiment);
    const codes = codeRows.map(mapCode);

    const builtIn = runBuiltInRegressionSuite(codes);
    const dbSuite = runFullVerificationSuite(verifications, experiments, codes);
    const combined = mergeSuiteSummaries([builtIn, dbSuite]);
    const diagnosis = buildSuiteDiagnosisReport(combined);
    const codeValueSummary = getCodeValueVerificationSummary();
    const predictionSummary = getPredictionVerificationSummary();

    console.log(`Built-in regression: ${builtIn.passed}/${builtIn.total} (${builtIn.passRate}%)`);
    console.log(`Verification DB:     ${dbSuite.passed}/${dbSuite.total} (${dbSuite.passRate}%)`);
    console.log(`Combined gate:       ${combined.passed}/${combined.total} (${combined.passRate}%)`);
    console.log(
      `CodeValue baseline:   ${codeValueSummary.passed}/${codeValueSummary.total} (${codeValueSummary.passRate}%) | legacy: ${codeValueSummary.verificationState}`,
    );
    console.log(
      `Prediction baseline:  ${predictionSummary.passed}/${predictionSummary.total} (${predictionSummary.passRate}%) | ${predictionSummary.heuristic ? 'heuristic' : 'verified'} | legacy: ${predictionSummary.verificationState}`,
    );
    console.log(`Target ≥ ${diagnosis.targetPassRate}% — ${diagnosis.meetsTarget ? 'PASS' : 'FAIL'}`);

    fs.mkdirSync(path.dirname(REPORT_JSON), { recursive: true });
    fs.writeFileSync(
      REPORT_JSON,
      `${JSON.stringify({ ...diagnosis, codeValue: codeValueSummary, prediction: predictionSummary }, null, 2)}\n`,
      'utf8',
    );
    fs.writeFileSync(REPORT_MD, formatSuiteDiagnosisMarkdown(diagnosis), 'utf8');
    fs.writeFileSync(CV_REPORT_MD, formatCodeValueDiagnosisMarkdown(codeValueSummary), 'utf8');
    fs.writeFileSync(PRED_REPORT_MD, formatPredictionDiagnosisMarkdown(predictionSummary), 'utf8');
    console.log(`\nReports:\n  ${REPORT_MD}\n  ${CV_REPORT_MD}\n  ${PRED_REPORT_MD}\n  ${REPORT_JSON}`);

    if (diagnosis.failures.length > 0) {
      console.log('\nTop failures:');
      for (const row of diagnosis.failures.slice(0, 10)) {
        console.log(`  - ${row.name} [${row.field}] (${row.category})`);
      }
    }

    return diagnosis.meetsTarget &&
      codeValueSummary.passRate >= 95 &&
      predictionSummary.passRate >= 95
      ? 0
      : 2;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
